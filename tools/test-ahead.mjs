// Behaviour test for check-ahead: node tools/test-ahead.mjs
// Builds a tiny course tree in the system temp folder and runs the real tool against it
// with --root, so the lessons of the repository are never touched.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

const TOOLS = import.meta.dirname;
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? '  — ' + detail : ''}`);

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ahead-'));
const page = (body) => `<html><body><div class="container">${body}</div></body></html>`;
const js = (code) => `<pre class="code js">${code}</pre>`;

const write = (day, body) => {
  const dir = path.join(root, 'essentials', `day-${String(day).padStart(2, '0')}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'lecture.html'), page(body));
};
const run = (day) => {
  const r = spawnSync('node', [path.join(TOOLS, 'check-ahead.mjs'), '--root', root, String(day)], { encoding: 'utf8' });
  return { out: r.stdout, code: r.status };
};
const only = (day) => {
  fs.rmSync(path.join(root, 'essentials'), { recursive: true, force: true });
  return (body) => { write(day, body); return run(day); };
};

try {
  // 1. a construct from a later day is found, and the day fails
  let r = only(9)(js('const city = user?.city;'));
  check('?. на дне 9 поймана', r.out.includes('необязательная цепочка') && r.code === 1, r.out.split('\n')[0]);

  // 2. the same construct on its own day is fine
  r = only(22)(js('const city = user?.city;'));
  check('?. на дне 22 разрешена', !r.out.includes('необязательная цепочка') && r.code === 0);

  // 3. `from` lets the course use a construct before the day that explains it
  r = only(5)(js('function add(a, b) { return a + b; }'));
  check('function на дне 5 разрешён полем from', r.code === 0, r.out.split('\n')[0]);

  // 4. a construct of a later course is always a problem
  r = only(19)(js('class User { }'));
  check('class пойман на любом дне', r.out.includes('курс 2') && r.code === 1);

  // 5. strings and comments are not code
  r = only(9)(js('const s = "user?.city";\n// сравните с user?.city'));
  check('в строке и в комментарии не ищем', r.code === 0, r.out.split('\n')[0]);

  // 6. a marker in the line comment excuses the line
  r = only(9)(js('const city = user?.city;   // день 22'));
  check('пометка «// день 22» снимает вопрос', r.code === 0, r.out.split('\n')[0]);

  // 7. a marker naming an earlier day does not excuse it
  r = only(9)(js('const city = user?.city;   // день 15'));
  check('пометка на более ранний день не снимает', r.code === 1);

  // 8. the HTML comment before the block excuses the whole block
  r = only(9)(`<!-- ahead-ok: день 22 -->\n${js('const city = user?.city;\nconst zip = user?.zip;')}`);
  check('пометка ahead-ok перед блоком снимает весь блок', r.code === 0, r.out.split('\n')[0]);

  // 9. HTML samples are not JavaScript
  r = only(9)('<pre class="code html">&lt;!-- комментарий --&gt;\n&lt;script&gt;alert(1)&lt;/script&gt;</pre>');
  check('блок html не проверяется', r.code === 0, r.out.split('\n')[0]);

  // 10. days 1-3 tour the language and never fail
  r = only(3)(js('class User { }\nfetch("/api");'));
  check('дни 1–3 помечены SKIP', r.out.includes('SKIP') && r.code === 0);

  // 11. the two shapes that used to be confused: rest parameter is not spread
  r = only(14)(js('function makeReport(name = required("name"), ...marks) { return marks.length; }'));
  check('остаточный параметр не принят за spread', r.code === 0, r.out.split('\n')[0]);
  r = only(14)(js('makeReport("Аман", ...marksArray);'));
  check('spread в вызове пойман на дне 14', r.out.includes('spread') && r.code === 1);

  // 12. a for loop is not a default parameter
  r = only(10)(js('for (let i = 0; i &lt; 3; i++) { }'));
  check('цикл for не принят за параметр по умолчанию', r.code === 0, r.out.split('\n')[0]);

  // 13. classList.replace is the class-list method of day 25, not the string method of course 2
  r = only(25)(js('el.classList.replace("absent", "late");'));
  check('classList.replace не принят за строковый replace', r.code === 0, r.out.split('\n')[0]);
  r = only(25)(js('const s = text.replace("a", "b");'));
  check('строковый replace на дне 25 пойман', r.out.includes('курс 2') && r.code === 1);

  // 14. built-in event constructors of day 27 are not "own constructors" of course 2
  r = only(27)(js('const bus = new EventTarget();\nbus.dispatchEvent(new Event("ping"));'));
  check('new Event и new EventTarget не приняты за свой конструктор', r.code === 0, r.out.split('\n')[0]);
  r = only(27)(js('const user = new User("Аман");'));
  check('свой конструктор по-прежнему пойман', r.out.includes('курс 2') && r.code === 1);

  // 15. every row of the table is well formed and unique
  const src = fs.readFileSync(path.join(TOOLS, 'check-ahead.mjs'), 'utf8');
  const rows = [...src.matchAll(/\{ id: '([\w-]+)', title: '([^']+)', day: (\d+),(?: from: (\d+),)?/g)];
  const ids = rows.map((m) => m[1]);
  const badFrom = rows.filter((m) => m[4] && Number(m[4]) > Number(m[3]));
  check(`таблица: ${rows.length} строк, все id разные`, new Set(ids).size === ids.length);
  check('таблица: from не бывает позже дня разбора', badFrom.length === 0, badFrom.map((m) => m[1]).join(', '));

  // 16. --table prints the whole table
  const table = spawnSync('node', [path.join(TOOLS, 'check-ahead.mjs'), '--table'], { encoding: 'utf8' });
  check('--table печатает все строки', table.stdout.split('\n').length >= rows.length && table.status === 0);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

console.log(results.join('\n'));
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
