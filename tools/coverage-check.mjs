// Coverage check for the maps in docs/coverage/: how many rows already have a course, day,
// lesson and depth, and which values are wrong.
//
//   node tools/coverage-check.mjs                        summary of all maps
//   node tools/coverage-check.mjs --list mdn-javascript  rows without an assignment (--limit N, default 50)
//   node tools/coverage-check.mjs --strict               exit 1 unless the language and stable Web API are fully assigned
//   node tools/coverage-check.mjs --dir <folder>         check maps in another folder
//
// Exit code 1 whenever a row has a wrong or incomplete assignment.
import path from 'node:path';
import { readCsv } from './lib/csv.mjs';
import { jsSection } from './lib/sections.mjs';

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i === -1 ? null : args[i + 1] ?? ''; };
const DIR = opt('--dir') || path.join(import.meta.dirname, '..', 'docs', 'coverage');
const DEPTHS = ['подробно', 'кратко'];
// Spec clauses of levels 1-3 (chapters and sections) must be assigned one by one; a deeper clause
// counts as covered when an ancestor is assigned. Decided 19.09.2026.
const SPEC_OWN_LEVELS = 3;

// Language maps must be covered by courses 1-3. Web API pages may appear in any course; course 4
// covers only stable pages: no MDN flag (experimental, deprecated, non-standard). Decided 19.09.2026.
const MAPS = [
  { name: 'mdn-javascript', key: 'path', language: true, section: (r) => jsSection(r.path) },
  { name: 'ecma262', key: 'id', language: true, spec: true, section: (r) => `level ${r.level}` },
  { name: 'ecma402', key: 'id', language: true, spec: true, section: (r) => `level ${r.level}` },
  { name: 'mdn-webapi', key: 'path', language: false, inScope: (r) => !r.status, section: (r) => r.path.split('/').slice(0, 3).join('/') },
];

const int = (v, lo, hi) => /^\d+$/.test(v) && Number(v) >= lo && Number(v) <= hi;

// -> 'empty' | 'ok' | error text
function assignment(r, language) {
  const vals = [r.course, r.day, r.lesson, r.depth];
  if (vals.every((v) => !v)) return 'empty';
  const errs = [];
  if (!int(r.course, 1, language ? 3 : 4)) errs.push(`course "${r.course}" (${language ? '1-3' : '1-4'})`);
  if (!int(r.day, 1, 36)) errs.push(`day "${r.day}" (1-36)`);
  if (!int(r.lesson, 1, 3)) errs.push(`lesson "${r.lesson}" (1-3)`);
  if (!DEPTHS.includes(r.depth)) errs.push(`depth "${r.depth}" (${DEPTHS.join(' / ')})`);
  return errs.length ? errs.join(', ') : 'ok';
}

// "7.1.4" -> ["7.1", "7"]; "B.3.2" -> ["B.3", "B"]
const parents = (num) => num.split('.').slice(0, -1).map((_, i, a) => a.slice(0, a.length - i).join('.'));

const pct = (a, b) => (b ? ((100 * a) / b).toFixed(1) : '0.0') + '%';
let errors = 0, langRows = 0, langDone = 0, apiRows = 0, apiDone = 0;
const listName = opt('--list');
const limit = Number(opt('--limit') || 50);

for (const m of MAPS) {
  const csv = readCsv(path.join(DIR, `${m.name}.csv`));
  if (!csv) { console.log(`${m.name}.csv: missing — run node tools/coverage-export.mjs`); errors++; continue; }
  const rows = csv.records;
  const state = new Map(rows.map((r) => [r, assignment(r, m.language)]));
  const seen = new Map();
  for (const r of rows) {
    const k = r[m.key].toLowerCase();
    if (seen.has(k)) { console.log(`   duplicate ${m.key}: ${r[m.key]}`); errors++; }
    seen.set(k, r);
  }
  const assignedNumbers = new Set(rows.filter((r) => state.get(r) === 'ok').map((r) => r.number));
  const covered = (r) => state.get(r) === 'ok' ||
    (m.spec && Number(r.level) > SPEC_OWN_LEVELS && parents(r.number).some((p) => assignedNumbers.has(p)));

  const bad = rows.filter((r) => !['ok', 'empty'].includes(state.get(r)));
  const scope = m.inScope ? rows.filter(m.inScope) : rows;
  const done = scope.filter(covered).length;
  const direct = scope.filter((r) => state.get(r) === 'ok').length;
  errors += bad.length;
  if (m.language) { langRows += scope.length; langDone += done; } else { apiRows += scope.length; apiDone += done; }

  console.log(`${`${m.name}.csv`.padEnd(20)} ${String(scope.length).padStart(5)} rows   covered ${String(done).padStart(5)} (${pct(done, scope.length)})` +
    (m.spec ? `, assigned directly ${direct}` : '') + (bad.length ? `   ERRORS ${bad.length}` : '') +
    (m.inScope ? `   (+${rows.length - scope.length} pages with MDN flags, not in the course)` : ''));
  if (m.name === 'mdn-javascript') {
    const bySection = new Map();
    for (const r of rows) {
      const s = bySection.get(m.section(r)) || [0, 0];
      s[0] += covered(r) ? 1 : 0; s[1]++;
      bySection.set(m.section(r), s);
    }
    for (const [s, [d, n]] of [...bySection].sort((a, b) => b[1][1] - a[1][1])) console.log(`      ${String(d).padStart(5)} / ${String(n).padEnd(5)} ${s}`);
  }
  for (const r of bad.slice(0, 20)) console.log(`   wrong assignment: ${r[m.key]} — ${state.get(r)}`);
  if (bad.length > 20) console.log(`   ... and ${bad.length - 20} more`);

  if (listName === m.name) {
    // for specs only levels 1-3 need an assignment; deeper clauses follow their ancestors
    const open = scope.filter((r) => !covered(r) && !(m.spec && Number(r.level) > SPEC_OWN_LEVELS));
    console.log(`\n   not covered yet: ${open.length}${open.length > limit ? ` (first ${limit})` : ''}` +
      (m.spec ? ` — levels 1-${SPEC_OWN_LEVELS}; deeper clauses are covered with them` : ''));
    for (const r of open.slice(0, limit)) console.log(`   ${r[m.key]}  ${m.spec ? `${r.number} ${r.title}` : r.title}`);
    console.log('');
  }
}

console.log(`\nLanguage (courses 1-3): ${langDone} of ${langRows} rows covered (${pct(langDone, langRows)});` +
  ` spec clauses of level ${SPEC_OWN_LEVELS + 1}+ count through an assigned ancestor`);
console.log(`Web API (stable pages): ${apiDone} of ${apiRows} rows covered (${pct(apiDone, apiRows)})`);
if (errors) console.log(`${errors} problem(s) found`);
process.exit(errors || (args.includes('--strict') && (langDone < langRows || apiDone < apiRows)) ? 1 : 0);
