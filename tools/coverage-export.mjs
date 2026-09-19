// Coverage map export: every MDN page of the JavaScript and Web API sections and every clause
// of ECMA-262 / ECMA-402 becomes a CSV row in docs/coverage/. Re-running keeps the manual
// columns (course, day, lesson, depth, note) and reports pages that appeared or disappeared.
//
//   node tools/coverage-export.mjs                  same sources as docs/coverage/sources.json
//   node tools/coverage-export.mjs --update         move to the latest mdn/content commit
//   node tools/coverage-export.mjs --commit <sha>   use this mdn/content commit (full SHA)
//   node tools/coverage-export.mjs --edition 2027   use this ECMAScript / Intl edition
//   node tools/coverage-export.mjs --only mdn|spec  export one part only
//
// Needs git and network access; downloads are cached in tools/.cache/ (not committed).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { readCsv, writeCsv } from './lib/csv.mjs';
import { jsSection } from './lib/sections.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'docs', 'coverage');
const CACHE = path.join(ROOT, 'tools', '.cache');
const SOURCES = path.join(OUT, 'sources.json');
const MDN_REPO = 'https://github.com/mdn/content.git';
const MDN_GIT = path.join(CACHE, 'mdn-content.git');
const ASSIGN = ['course', 'day', 'lesson', 'depth', 'note'];
const MDN_HEADER = ['path', 'title', 'page_type', 'status', 'browser_compat', ...ASSIGN];
const SPEC_HEADER = ['id', 'number', 'title', 'level', 'type', 'flags', ...ASSIGN];
const MDN_PARTS = [
  { file: 'mdn-javascript.csv', folder: 'files/en-us/web/javascript' },
  { file: 'mdn-webapi.csv', folder: 'files/en-us/web/api' },
];
const SPECS = [
  { key: 'ecma262', file: 'ecma262.csv', url: (ed) => `https://tc39.es/ecma262/${ed}/` },
  { key: 'ecma402', file: 'ecma402.csv', url: (ed) => `https://tc39.es/ecma402/${ed}/` },
];

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i === -1 ? null : args[i + 1] ?? ''; };
const only = opt('--only');
const sources = fs.existsSync(SOURCES) ? JSON.parse(fs.readFileSync(SOURCES, 'utf8')) : {};

// ---------- MDN ----------
// The cache is a bare, shallow clone without file contents (trees only). Only the index.md
// files of the two folders are downloaded, in small batches, so a dropped connection costs
// one batch. GIT_NO_LAZY_FETCH stops git from downloading anything on its own.

const GIT_ENV = { ...process.env, GIT_NO_LAZY_FETCH: '1' };
const git = (argv, { cwd = ROOT, input } = {}) =>
  execFileSync('git', ['-c', 'http.version=HTTP/1.1', ...argv], {
    cwd, env: GIT_ENV, input: input === undefined ? undefined : Buffer.from(input),
    encoding: input === undefined ? 'utf8' : 'buffer', maxBuffer: 1 << 30,
    stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'inherit'],
  });
const mgit = (argv, opts) => git([`--git-dir=${MDN_GIT}`, ...argv], opts);

function latestMdnCommit() {
  return git(['ls-remote', MDN_REPO, 'refs/heads/main']).split(/\s+/)[0];
}

function runAsync(argv, input) {
  return new Promise((resolve) => {
    const p = spawn('git', ['-c', 'http.version=HTTP/1.1', `--git-dir=${MDN_GIT}`, ...argv], { stdio: ['pipe', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => { err += d; });
    p.on('close', (code) => resolve({ code, err }));
    p.stdin.end(input);
  });
}

async function fetchBlobs(oids) {
  const batches = [];
  for (let i = 0; i < oids.length; i += 300) batches.push(oids.slice(i, i + 300));
  let done = 0;
  const worker = async () => {
    for (let b; (b = batches.shift()); ) {
      for (let attempt = 1; ; attempt++) {
        const r = await runAsync(['-c', 'fetch.negotiationAlgorithm=noop', 'fetch', '--no-tags', '--no-write-fetch-head',
          '--recurse-submodules=no', '--filter=blob:none', '--stdin', 'origin'], b.join('\n') + '\n');
        if (r.code === 0) break;
        if (attempt === 6) throw new Error(`blob fetch failed 6 times:\n${r.err}`);
        console.log(`   batch failed (attempt ${attempt}), retrying: ${r.err.trim().split('\n').at(-1)}`);
      }
      done += b.length;
      console.log(`   downloaded ${done} / ${oids.length} pages`);
    }
  };
  await Promise.all([1, 2, 3, 4].map(worker));
}

// -> { date, files: Map(path of index.md -> text) }
async function readMdn(commit) {
  if (!fs.existsSync(MDN_GIT)) {
    fs.mkdirSync(CACHE, { recursive: true });
    console.log('cloning mdn/content without file contents...');
    git(['clone', '--bare', '--filter=blob:none', '--depth', '1', MDN_REPO, MDN_GIT]);
  }
  const has = mgit(['cat-file', '--batch-check'], { input: `${commit}\n` }).toString();
  if (!has.includes(' commit ')) {
    console.log(`fetching mdn/content ${commit.slice(0, 12)} (without file contents)...`);
    mgit(['fetch', '--depth', '1', '--filter=blob:none', 'origin', commit]);
  }
  const entries = mgit(['ls-tree', '-r', commit, '--', ...MDN_PARTS.map((p) => p.folder)]).trim().split('\n')
    .map((l) => /^\d+ blob ([0-9a-f]+)\t(.*)$/.exec(l)).filter((m) => m && m[2].endsWith('/index.md'))
    .map((m) => ({ oid: m[1], path: m[2] }));
  const check = mgit(['cat-file', '--batch-check'], { input: entries.map((e) => e.oid).join('\n') + '\n' }).toString();
  const missing = [...check.matchAll(/^([0-9a-f]+) missing$/gm)].map((m) => m[1]);
  if (missing.length) {
    console.log(`downloading ${missing.length} of ${entries.length} pages...`);
    await fetchBlobs(missing);
  }
  const out = mgit(['cat-file', '--batch'], { input: entries.map((e) => e.oid).join('\n') + '\n' });
  const files = new Map();
  let pos = 0;
  for (const e of entries) {
    const nl = out.indexOf(10, pos);
    const [oid, type, size] = out.subarray(pos, nl).toString().split(' ');
    if (oid !== e.oid || type !== 'blob') throw new Error(`unexpected cat-file output for ${e.path}: ${out.subarray(pos, nl)}`);
    files.set(e.path, out.subarray(nl + 1, nl + 1 + Number(size)).toString('utf8'));
    pos = nl + 1 + Number(size) + 1;
  }
  const date = new Date(Number(mgit(['show', '-s', '--format=%ct', commit]).trim()) * 1000).toISOString();
  return { date, files };
}

const unquote = (v) => {
  v = v.trim();
  if (v.length >= 2 && v[0] === "'" && v.at(-1) === "'") return v.slice(1, -1).replace(/''/g, "'");
  if (v.length >= 2 && v[0] === '"' && v.at(-1) === '"') return v.slice(1, -1).replace(/\\(["\\])/g, '$1');
  return v;
};

// The front matter of MDN pages is flat YAML: "key: value" and "key:" followed by "  - item" lines.
function frontMatter(text, file) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!m) throw new Error(`no front matter: ${file}`);
  const fm = {};
  let key = null;
  for (const line of m[1].split(/\r?\n/)) {
    const item = /^\s+-\s+(.*)$/.exec(line);
    if (item && key) { fm[key] = [].concat(fm[key] || [], unquote(item[1])); continue; }
    const kv = /^([\w-]+):\s*(.*)$/.exec(line);
    if (kv) { key = kv[1]; fm[key] = kv[2] === '' ? [] : unquote(kv[2]); }
  }
  return fm;
}

function mdnRows(files, folder) {
  const rows = [];
  for (const [file, text] of files) {
    if (!file.startsWith(folder + '/')) continue;
    const fm = frontMatter(text, file);
    rows.push({
      path: fm.slug,
      title: fm.title,
      page_type: fm['page-type'] || '',
      status: [].concat(fm.status || []).join(' '),
      browser_compat: [].concat(fm['browser-compat'] || []).join(' '),
    });
  }
  const key = (r) => r.path.toLowerCase();
  return rows.sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));
}

// ---------- ECMA-262 / ECMA-402 ----------

const decode = (s) => s
  .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&amp;/g, '&');

async function specHtml(key, edition, url) {
  const file = path.join(CACHE, `${key}-${edition}.html`);
  if (!fs.existsSync(file)) {
    console.log(`downloading ${url} (several MB, slow connections take minutes)...`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    fs.mkdirSync(CACHE, { recursive: true });
    fs.writeFileSync(file, await res.text());
  }
  return fs.readFileSync(file, 'utf8');
}

// Every <emu-clause> / <emu-annex> has <h1><span class="secnum">7.1.4</span> Title</h1>; before the
// h1 there can be anchors for old ids and an attribute tag ("Legacy", "Normative Optional").
// Back matter (bibliography, colophon, copyright) has no number and is skipped.
function specRows(html, file) {
  const rows = [];
  let backMatter = 0;
  const re = /<emu-(?:clause|annex)\b([^>]*)>((?:(?!<emu-(?:clause|annex)\b|<h1>)[\s\S])*)<h1>([\s\S]*?)<\/h1>/g;
  for (let m; (m = re.exec(html)); ) {
    const attr = (name) => (new RegExp(`\\b${name}="([^"]*)"`).exec(m[1]) || [])[1];
    if (attr('back-matter') !== undefined) { backMatter++; continue; }
    const num = /<span class="secnum">([\s\S]*?)<\/span>/.exec(m[3]);
    if (!num) throw new Error(`clause without a number in ${file}: ${m[0].slice(0, 120)}`);
    let number = decode(num[1].replace(/<[^>]+>/g, '')).trim();
    const title = decode(m[3].replace(num[0], '').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
    const flags = ['legacy', 'normative-optional', 'example'].filter((f) => attr(f) !== undefined);
    const annex = /^Annex ([A-Z])(?: \((\w+)\))?$/.exec(number); // "Annex B (normative)" -> "B", like its "B.1"
    if (annex) { number = annex[1]; if (annex[2]) flags.push(annex[2]); }
    rows.push({ id: attr('id'), number, title, level: number.split('.').length, type: attr('type') || '', flags: flags.join(' ') });
  }
  const tags = (html.match(/<emu-(?:clause|annex)\b/g) || []).length;
  if (rows.length + backMatter !== tags) throw new Error(`${file}: ${tags} clause tags, but ${rows.length} rows + ${backMatter} back matter`);
  return rows;
}

// ---------- merge with the existing CSV ----------

function merge(file, header, keyCol, rows) {
  const target = path.join(OUT, file);
  const old = readCsv(target);
  const keyOf = (r) => r[keyCol].toLowerCase();
  const prev = new Map((old?.records || []).map((r) => [keyOf(r), r]));
  const now = new Set(rows.map(keyOf));
  let added = 0;
  for (const r of rows) {
    const p = prev.get(keyOf(r));
    if (p) for (const c of ASSIGN) r[c] = p[c] ?? '';
    else { for (const c of ASSIGN) r[c] = ''; added += old ? 1 : 0; }
  }
  const removed = [...prev.values()].filter((r) => !now.has(keyOf(r)));
  writeCsv(target, header, rows);
  console.log(`${file}: ${rows.length} rows` + (old ? `, new ${added}, gone ${removed.length}` : ''));
  for (const r of removed) {
    const a = ASSIGN.map((c) => r[c]).filter(Boolean).join(' / ');
    console.log(`   gone: ${r[keyCol]}${a ? `  (was assigned: ${a})` : ''}`);
  }
  return rows;
}

// ---------- summary ----------

function countBy(rows, fn) {
  const m = new Map();
  for (const r of rows) m.set(fn(r), (m.get(fn(r)) || 0) + 1);
  return [...m].sort((a, b) => b[1] - a[1]);
}

function summarizeJs(rows) {
  for (const [k, n] of countBy(rows, (r) => jsSection(r.path))) console.log(`   ${String(n).padStart(5)}  ${k}`);
}

// ---------- main ----------

const next = { ...sources };
fs.mkdirSync(OUT, { recursive: true });

if (!only || only === 'mdn') {
  const commit = opt('--commit') || (args.includes('--update') || !sources.mdn ? latestMdnCommit() : sources.mdn.commit);
  const { date, files } = await readMdn(commit);
  next.mdn = { repo: MDN_REPO.replace(/\.git$/, ''), commit, commit_date: date, folders: MDN_PARTS.map((p) => p.folder) };
  console.log(`mdn/content ${commit.slice(0, 12)} (${date})`);
  const [js, api] = MDN_PARTS.map((p) => merge(p.file, MDN_HEADER, 'path', mdnRows(files, p.folder)));
  summarizeJs(js);
  const top = new Set(api.map((r) => r.path.split('/').slice(0, 3).join('/').toLowerCase()));
  console.log(`   Web API: ${top.size - 1} top-level folders (interfaces and API overviews)`);
  for (const [k, n] of countBy([...js, ...api].filter((r) => r.status), (r) => `${r.path.startsWith('Web/API') ? 'Web API' : 'JavaScript'}: ${r.status}`)) {
    console.log(`   ${String(n).padStart(5)}  ${k}`);
  }
}

if (!only || only === 'spec') {
  const edition = Number(opt('--edition') || sources.ecma262?.edition || 2026);
  for (const s of SPECS) {
    const url = s.url(edition);
    const rows = merge(s.file, SPEC_HEADER, 'id', specRows(await specHtml(s.key, edition, url), url));
    next[s.key] = { edition, url };
    console.log('   by level: ' + countBy(rows, (r) => r.level).sort((a, b) => a[0] - b[0]).map(([l, n]) => `${l}: ${n}`).join(', '));
  }
}

fs.writeFileSync(SOURCES, JSON.stringify(next, null, 2) + '\n');
