// Translations of a day live in day-NN/en/. For every written day:
//   - a day with en/ has all three pages there, each marked lang="en" and free of Cyrillic letters
//     (except inside an element marked lang="ru", like the look-alike file name <span lang="ru">арр</span>.js);
//   - every Russian page links to its English twin, and the English page links back;
//   - a day without en/ has no link to an English version.
//
//   node tools/check-langs.mjs            all written days
//   node tools/check-langs.mjs 1          only day 1 (of every course)
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(import.meta.dirname, '..');
const COURSE_DIR = ['essentials', 'intermediate', 'advanced', 'web-apis'];
const PAGES = ['lecture', 'student', 'tasks'];
const CYRILLIC = /[А-Яа-яЁё]/;
const MARKED_RU = /<(\w+)\b[^>]*\blang="ru"[^>]*>.*?<\/\1>/g;

const langLink = (html, href) => new RegExp(`<a href="${href.replace(/[./]/g, '\\$&')}" class="lang-btn"`).test(html);

const only = process.argv.slice(2).map(Number);
const lines = [];
let bad = 0, checked = 0;

for (const dir of COURSE_DIR) {
  const courseDir = path.join(ROOT, dir);
  if (!fs.existsSync(courseDir)) continue;
  for (const day of fs.readdirSync(courseDir).filter((d) => /^day-\d+$/.test(d)).sort()) {
    if (only.length && !only.includes(Number(day.slice(4)))) continue;
    checked++;
    const problems = [];
    const hasEn = fs.existsSync(path.join(courseDir, day, 'en'));
    for (const page of PAGES) {
      const ruFile = path.join(courseDir, day, `${page}.html`);
      const enFile = path.join(courseDir, day, 'en', `${page}.html`);
      if (!fs.existsSync(ruFile)) continue;
      const ru = fs.readFileSync(ruFile, 'utf8');
      if (!hasEn) {
        if (/href="en\//.test(ru)) problems.push(`${page}.html links to en/, but the day has no translation`);
        continue;
      }
      if (!fs.existsSync(enFile)) { problems.push(`en/${page}.html is missing`); continue; }
      const en = fs.readFileSync(enFile, 'utf8');
      if (!langLink(ru, `en/${page}.html`)) problems.push(`${page}.html has no EN link to en/${page}.html`);
      if (!langLink(en, `../${page}.html`)) problems.push(`en/${page}.html has no RU link to ../${page}.html`);
      if (!/<html lang="en">/.test(en)) problems.push(`en/${page}.html is not marked <html lang="en">`);
      en.split('\n').forEach((line, i) => {
        if (CYRILLIC.test(line.replace(MARKED_RU, ''))) problems.push(`en/${page}.html:${i + 1} Cyrillic: ${line.trim().slice(0, 80)}`);
      });
    }
    if (problems.length) bad++;
    lines.push(`${problems.length ? 'FAIL' : 'PASS'}  ${dir}/${day}: ${hasEn ? 'ru + en' : 'ru only'}`);
    for (const p of problems) lines.push(`        ${p}`);
  }
}

console.log(lines.join('\n') || 'no written days found');
console.log(`days checked: ${checked}, with language problems: ${bad}`);
process.exit(bad ? 1 : 0);
