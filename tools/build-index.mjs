// Rebuilds the day list on index.html from the plan: sidebar links and module cards, once in Russian
// and once in English (js/lang.js shows the English list in EN mode, the Russian one otherwise).
// A day becomes a link when its folder exists; the rest are shown as "скоро" / "coming soon".
// In the English list a day links to its en/ pages when they exist, otherwise to the Russian ones, marked RU.
//   node tools/build-index.mjs
import fs from 'node:fs';
import path from 'node:path';
import { MODULES } from './plan-modules.mjs';
import { PLAN } from './plan-days.mjs';
import { DAY_TITLES_EN, MODULE_NAMES_EN } from './plan-en.mjs';

const ROOT = path.join(import.meta.dirname, '..');
const INDEX = path.join(ROOT, 'index.html');
const COURSE = 1;
const DIR = 'essentials';

// colour and icon per module, in the order of MODULES
const LOOK = {
  E1: ['#3b82f6, #06b6d4', '&#x1F4DC;'],
  E2: ['#8b5cf6, #d946ef', '&#x1F524;'],
  E3: ['#f59e0b, #ef4444', '&#x1F500;'],
  E4: ['#10b981, #059669', '&#x2699;&#xFE0F;'],
  E5: ['#0ea5e9, #6366f1', '&#x1F522;'],
  E6: ['#ec4899, #f43f5e', '&#x1F4E6;'],
  E7: ['#22c55e, #84cc16', '&#x1F5B1;&#xFE0F;'],
  E8: ['#6366f1, #8b5cf6', '&#x23F1;&#xFE0F;'],
  PROJECTS: ['#eab308, #f97316', '&#x1F3C6;'],
};

const TEXT = {
  ru: { projects: 'Проекты и защита', lecture: 'Лекция', student: 'Конспект', tasks: 'Задания', soon: 'материал готовится', days: 'Дни', day: 'День', course: 'курс Essentials' },
  en: { projects: MODULE_NAMES_EN.PROJECTS, lecture: 'Lecture', student: 'Notes', tasks: 'Tasks', soon: 'coming soon', days: 'Days', day: 'Day', course: 'Essentials course' },
};

const moduleName = {
  ru: Object.fromEntries(MODULES.map(([id, , , name]) => [id, name])),
  en: MODULE_NAMES_EN,
};
const days = PLAN[COURSE].days;
const folderOf = (day) => `${DIR}/day-${String(day).padStart(2, '0')}`;
const ready = (day) => fs.existsSync(path.join(ROOT, folderOf(day)));
const hasEn = (day) => fs.existsSync(path.join(ROOT, folderOf(day), 'en', 'lecture.html'));

// the English list falls back to the Russian pages of a day that is not translated yet
const pagesOf = (day, lang) => (lang === 'en' && hasEn(day) ? `${folderOf(day)}/en` : folderOf(day));
const titleOf = (day, title, lang) => (lang === 'ru' ? title
  : DAY_TITLES_EN[COURSE][day] + (hasEn(day) ? '' : ' <span class="lang-note">RU</span>'));

// group days into modules, keeping project days together in one group at their place
const groups = [];
for (const [day, module, title] of days) {
  const id = module ?? 'PROJECTS';
  const last = groups.at(-1);
  if (last && last.id === id) last.days.push({ day, title });
  else groups.push({ id, days: [{ day, title }] });
}
const groupName = (g, lang) => (g.id === 'PROJECTS' ? TEXT[lang].projects : moduleName[lang][g.id]);

const sidebar = (lang) => groups.map((g) => {
  const links = g.days.map(({ day, title }) => (ready(day)
    ? `            <a href="${pagesOf(day, lang)}/lecture.html" class="sidebar-link"><span class="sidebar-num">${day}</span> ${titleOf(day, title, lang)}</a>`
    : `            <span class="sidebar-link sidebar-soon"><span class="sidebar-num">${day}</span> ${titleOf(day, title, lang)}</span>`)).join('\n');
  return `        <div class="sidebar-group">\n            <div class="sidebar-group-title">${LOOK[g.id][1]} ${groupName(g, lang)}</div>\n${links}\n        </div>`;
}).join('\n\n');

const modules = (lang) => groups.map((g) => {
  const t = TEXT[lang];
  const [colour, icon] = LOOK[g.id];
  const range = g.days.length > 1 ? `${t.days} ${g.days[0].day}&ndash;${g.days.at(-1).day}` : `${t.day} ${g.days[0].day}`;
  const cards = g.days.map(({ day, title }) => {
    const at = pagesOf(day, lang);
    const links = ready(day)
      ? `<div class="card-links"><a href="${at}/lecture.html" class="card-link lecture">&#x1F468;&#x200D;&#x1F3EB; ${t.lecture}</a>` +
        `<a href="${at}/student.html" class="card-link student">&#x1F468;&#x200D;&#x1F393; ${t.student}</a>` +
        `<a href="${at}/tasks.html" class="card-link tasks">&#x1F4CB; ${t.tasks}</a></div>`
      : `<div class="card-soon">${t.soon}</div>`;
    return `                <div class="lesson-card${ready(day) ? '' : ' lesson-card-soon'}">` +
      `<div class="card-number" style="background: linear-gradient(135deg, ${colour});">${String(day).padStart(2, '0')}</div>` +
      `<div class="card-title">${titleOf(day, title, lang)}</div>${links}</div>`;
  }).join('\n');
  return `        <div class="module">\n            <div class="module-header">\n` +
    `                <div class="module-icon" style="background: linear-gradient(135deg, ${colour});">${icon}</div>\n` +
    `                <div>\n                    <div class="module-title">${groupName(g, lang)}</div>\n` +
    `                    <div class="module-count">${range} &bull; ${t.course}</div>\n                </div>\n            </div>\n` +
    `            <div class="card-grid">\n${cards}\n            </div>\n        </div>`;
}).join('\n\n');

// the English list starts hidden, so that a page without JavaScript shows one list, not two
const both = (build) => `        <div data-list="ru">\n${build('ru')}\n        </div>\n` +
  `        <div data-list="en" class="lang-hidden">\n${build('en')}\n        </div>`;

let html = fs.readFileSync(INDEX, 'utf8');
const region = (name, content) => {
  const start = `<!-- ${name}:start -->`, end = `<!-- ${name}:end -->`;
  const re = new RegExp(`${start}[\\s\\S]*?${end}`);
  if (!re.test(html)) throw new Error(`markers ${name} not found in index.html`);
  html = html.replace(re, `${start}\n${content}\n        ${end}`);
};
region('days:sidebar', both(sidebar));
region('days:modules', both(modules));
fs.writeFileSync(INDEX, html);

const readyDays = days.filter(([d]) => ready(d)).map(([d]) => d);
const enDays = days.filter(([d]) => hasEn(d)).map(([d]) => d);
console.log(`index.html: ${days.length} days in ${groups.length} groups; ready: ${readyDays.join(', ') || 'none'}; in English: ${enDays.join(', ') || 'none'}`);
