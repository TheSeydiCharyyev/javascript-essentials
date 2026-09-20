// Phase 3, step 1: every row of the coverage maps -> a module of one of the four courses.
// Rows that need an assignment: all MDN JavaScript pages, spec clauses of levels 1-3,
// stable Web API pages (no MDN flag). Error-message pages are placed day by day later.
//
//   node tools/plan-modules.mjs                 load per module; exit 1 if a row has no module
//   node tools/plan-modules.mjs --list I4       rows of one module
//   node tools/plan-modules.mjs --markdown      tables for docs/plan-0-overview.md
import path from 'node:path';
import { readCsv } from './lib/csv.mjs';

const DIR = path.join(import.meta.dirname, '..', 'docs', 'coverage');

// [id, course, days, name]
export const MODULES = [
  ['E1', 1, 3, 'Введение и инструменты'],
  ['E2', 1, 5, 'Синтаксис, типы и операторы'],
  ['E3', 1, 3, 'Условия и циклы'],
  ['E4', 1, 4, 'Функции'],
  ['E5', 1, 3, 'Строки, числа, Math и основы дат'],
  ['E6', 1, 5, 'Массивы, объекты и JSON'],
  ['E7', 1, 5, 'DOM и события'],
  ['E8', 1, 2, 'Таймеры, промисы и fetch'],
  ['I1', 2, 4, 'Области видимости, замыкания и this'],
  ['I2', 2, 2, 'Объекты глубже'],
  ['I3', 2, 4, 'Прототипы и классы'],
  ['I4', 2, 3, 'Итераторы и генераторы'],
  ['I5', 2, 2, 'Коллекции: Map, Set, WeakMap, WeakSet'],
  ['I6', 2, 4, 'Строки и регулярные выражения'],
  ['I7', 2, 5, 'Числа и даты: Date, Temporal, основы Intl'],
  ['I8', 2, 4, 'Ошибки и асинхронность'],
  ['I9', 2, 2, 'Модули и JSON'],
  ['A1', 3, 3, 'Как читать спецификацию; лексическая грамматика'],
  ['A2', 3, 4, 'Типы и абстрактные операции'],
  ['A3', 3, 6, 'Как выполняется код: контексты, реалмы, задачи, модули'],
  ['A4', 3, 5, 'Объекты изнутри: внутренние методы, Proxy, Reflect, символы'],
  ['A5', 3, 4, 'Двоичные данные и модель памяти'],
  ['A6', 3, 2, 'Управление ресурсами и памятью'],
  ['A7', 3, 5, 'Intl целиком; числа и даты по спецификации'],
  ['A8', 3, 1, 'Наследие и совместимость'],
  ['W1', 4, 5, 'DOM, HTML-элементы и веб-компоненты'],
  ['W2', 4, 2, 'CSS из JavaScript и анимации'],
  ['W3', 4, 2, 'Ввод: указатель, касания, клавиатура, drag and drop, буфер обмена'],
  ['W4', 4, 4, 'Сеть: fetch, потоки, URL, WebSocket'],
  ['W5', 4, 3, 'Хранение данных и файлы'],
  ['W6', 4, 4, 'Фоновая работа, производительность, навигация'],
  ['W7', 4, 4, 'Графика: Canvas, SVG, WebGL, WebGPU'],
  ['W8', 4, 3, 'Звук, видео и речь'],
  ['W9', 4, 3, 'Устройства, безопасность и связь (WebRTC)'],
];
export const PROJECT_DAYS = 6; // per course: two mini-projects and four days of the final project

// ---------- MDN JavaScript ----------
const GUIDE = {
  Introduction: 'E1', Language_overview: 'E1', Grammar_and_types: 'E2', Expressions_and_operators: 'E2', Data_structures: 'E2',
  Control_flow_and_error_handling: 'E3', Loops_and_iteration: 'E3', Functions: 'E4', Numbers_and_strings: 'E5',
  Indexed_collections: 'E6', Working_with_objects: 'E6', Using_promises: 'E8', Closures: 'I1',
  Enumerability_and_ownership_of_properties: 'I2', Equality_comparisons_and_sameness: 'I2',
  Inheritance_and_the_prototype_chain: 'I3', Using_classes: 'I3', Iterators_and_generators: 'I4', Keyed_collections: 'I5',
  Regular_expressions: 'I6', Representing_dates_times: 'I7', Internationalization: 'I7', Modules: 'I9',
  Memory_management: 'A3', Meta_programming: 'A4', Typed_arrays: 'A5', Resource_management: 'A6',
};
const STATEMENTS = {
  var: 'E2', let: 'E2', const: 'E2', block: 'E2', Empty: 'E2', Expression_statement: 'E2', debugger: 'E1',
  'if...else': 'E3', switch: 'E3', for: 'E3', while: 'E3', 'do...while': 'E3', break: 'E3', continue: 'E3', label: 'E3',
  'for...in': 'E3', 'for...of': 'E3', 'try...catch': 'E3', throw: 'E3', function: 'E4', return: 'E4', async_function: 'E8',
  class: 'I3', 'function*': 'I4', 'async_function*': 'I8', 'for-await...of': 'I8', import: 'I9', export: 'I9', 'import/with': 'I9',
  'import/defer': 'A3', 'import/source': 'A3', using: 'A6', await_using: 'A6', with: 'A8',
};
const BASIC_OPERATORS = /^(Addition|Subtraction|Multiplication|Division|Remainder|Exponentiation|Increment|Decrement|Unary_negation|Unary_plus|Assignment|(Addition|Subtraction|Multiplication|Division|Remainder|Exponentiation)_assignment|Equality|Inequality|Strict_equality|Strict_inequality|Greater_than|Greater_than_or_equal|Less_than|Less_than_or_equal|Logical_AND|Logical_OR|Logical_NOT|Nullish_coalescing|Conditional_operator|typeof|Grouping|Comma_operator|Operator_precedence|null)$/;
const OPERATORS = {
  function: 'E4', Object_initializer: 'E6', Property_accessors: 'E6', Destructuring: 'E6', Spread_syntax: 'E6', delete: 'E6', in: 'E6',
  Optional_chaining: 'E6', await: 'E8', this: 'I1', Logical_AND_assignment: 'I2', Logical_OR_assignment: 'I2',
  Nullish_coalescing_assignment: 'I2', class: 'I3', new: 'I3', 'new.target': 'I3', super: 'I3', instanceof: 'I3',
  'function*': 'I4', yield: 'I4', 'yield*': 'I4', async_function: 'I8', 'async_function*': 'I8', import: 'I9', 'import.meta': 'I9',
  'import.meta/resolve': 'I9', 'import/defer': 'A3', 'import/source': 'A3', void: 'A2',
};
const OBJECTS = {
  Boolean: 'E2', undefined: 'E2', NaN: 'E2', Infinity: 'E2', String: 'E5', Number: 'E5', Math: 'E5', parseInt: 'E5', parseFloat: 'E5',
  isNaN: 'E5', isFinite: 'E5', Array: 'E6', Object: 'E6', JSON: 'E6', Promise: 'E8', encodeURI: 'E8', encodeURIComponent: 'E8',
  decodeURI: 'E8', decodeURIComponent: 'E8', Function: 'I1', globalThis: 'I1', Iterator: 'I4', Generator: 'I4', GeneratorFunction: 'I4',
  Symbol: 'I4', Map: 'I5', Set: 'I5', WeakMap: 'I5', WeakSet: 'I5', RegExp: 'I6', Date: 'I7', BigInt: 'I7', Temporal: 'I7', Intl: 'A7',
  Error: 'I8', AggregateError: 'I8', EvalError: 'I8', RangeError: 'I8', ReferenceError: 'I8', SyntaxError: 'I8', TypeError: 'I8',
  URIError: 'I8', InternalError: 'I8', AsyncFunction: 'I8', AsyncGenerator: 'I8', AsyncGeneratorFunction: 'I8', AsyncIterator: 'I8',
  eval: 'A3', AbstractModuleSource: 'A3', Proxy: 'A4', Reflect: 'A4', ArrayBuffer: 'A5', SharedArrayBuffer: 'A5', TypedArray: 'A5',
  DataView: 'A5', Atomics: 'A5', WeakRef: 'A6', FinalizationRegistry: 'A6', DisposableStack: 'A6', AsyncDisposableStack: 'A6',
  SuppressedError: 'A6', escape: 'A8', unescape: 'A8',
};
// exceptions inside an object: [object, member, module]; the first match wins
const MEMBERS = [
  ['String', /^(match|matchAll|replace|replaceAll|search|split|raw|isWellFormed|toWellFormed)$/, 'I6'],
  ['String', /^(localeCompare|normalize|toLocaleLowerCase|toLocaleUpperCase)$/, 'I7'],
  ['String', /^Symbol\.iterator$/, 'I4'],
  ['String', /^(anchor|big|blink|bold|fixed|fontcolor|fontsize|italics|link|small|strike|sub|substr|sup|trimLeft|trimRight)$/, 'A8'],
  ['Number', /^toLocaleString$/, 'I7'],
  ['Array', /^fromAsync$/, 'I8'],
  ['Array', /^(Symbol\.iterator|entries|keys|values)$/, 'I4'],
  ['Array', /^(Symbol\.species|Symbol\.unscopables)$/, 'A4'],
  ['Array', /^toLocaleString$/, 'I7'],
  ['Object', /^(keys|values|entries|assign|hasOwn|fromEntries|groupBy)$/, 'E6'],
  ['Object', /^(create|getPrototypeOf|setPrototypeOf|isPrototypeOf|prototype|constructor|proto)$/, 'I3'],
  ['Object', /^(__defineGetter__|__defineSetter__|__lookupGetter__|__lookupSetter__)$/, 'A8'],
  ['Object', /./, 'I2'],
  ['JSON', /^(rawJSON|isRawJSON)$/, 'I9'],
  ['Promise', /^(all|allSettled|any|race|withResolvers|try|allKeyed|allSettledKeyed|Symbol\.species)$/, 'I8'],
  ['Symbol', /^(asyncDispose|dispose|hasInstance|isConcatSpreadable|match|matchAll|replace|search|species|split|toPrimitive|toStringTag|unscopables|Symbol\.toPrimitive)$/, 'A4'],
  ['Intl', /^(NumberFormat|DateTimeFormat)$/, 'I7'],
  // the everyday part of Date is taught in Essentials, the rest stays with Temporal in course 2
  ['Date', /^(Date|now|getFullYear|getMonth|getDate|getHours|getMinutes|getTime|toLocaleDateString|toLocaleTimeString)$/, 'E5'],
  ['Date', /^(getYear|setYear|toGMTString)$/, 'A8'],
  ['RegExp', /^(compile|input|lastMatch|lastParen|leftContext|rightContext|n)$/, 'A8'],
  ['Function', /^(arguments|caller|displayName)$/, 'A8'],
  ['Function', /^Symbol\.hasInstance$/, 'A4'],
];
const SINGLE_PAGES = {
  Classes: 'I3', Deprecated_and_obsolete_features: 'A8', Errors: 'I8', Execution_model: 'A3', Functions: 'E4', Global_Objects: 'E6',
  Iteration_protocols: 'I4', JavaScript_technologies_overview: 'E1', Lexical_grammar: 'A1', Operators: 'E2', Regular_expressions: 'I6',
  Statements: 'E3', Strict_mode: 'I1', Template_literals: 'E5', Trailing_commas: 'A1',
};
const FUNCTIONS = { Arrow_functions: 'E4', Default_parameters: 'E4', rest_parameters: 'E4', get: 'I2', set: 'I2', Method_definitions: 'I2' };

// -> module id, 'ERRORS' for an error-message page, undefined if no rule matches
export function jsModule(slug) {
  const p = slug.split('/').slice(2); // drop "Web/JavaScript"
  if (p.length <= 1) return p[0] === 'Guide' || p.length === 0 || p[0] === 'Reference' ? 'E1' : undefined;
  if (p[0] === 'Guide') return GUIDE[p[1]];
  const [, group, a, b] = p;
  if (p.length === 2) return SINGLE_PAGES[group];
  if (group === 'Statements') return STATEMENTS[p.slice(2).join('/')];
  if (group === 'Operators') {
    const k = p.slice(2).join('/');
    if (BASIC_OPERATORS.test(k)) return 'E2';
    return OPERATORS[k] || (/^(Bitwise|Left_shift|Right_shift|Unsigned_right_shift)/.test(k) ? 'A2' : undefined);
  }
  if (group === 'Functions') return a === 'arguments' ? (b === 'callee' ? 'A8' : 'I1') : FUNCTIONS[a];
  if (group === 'Classes') return 'I3';
  if (group === 'Regular_expressions') return 'I6';
  if (group === 'Errors') return 'ERRORS';
  if (group === 'Global_Objects') {
    if (a === 'Date' && !b) return 'E5'; // the Date page itself opens the Essentials lesson about dates
    if (b) for (const [o, re, m] of MEMBERS) if (o === a && re.test(b)) return m;
    if (/^(Big)?(Int|Uint|Float)\d+(Clamped)?Array$/.test(a)) return 'A5';
    return OBJECTS[a];
  }
}

// ---------- ECMA-262 / ECMA-402, levels 1-3 ----------
export function specModule(number, spec) {
  const [c, s] = number.split('.');
  if (spec === 'ecma402') return c === '11' || c === '16' ? 'I7' : 'A7'; // DateTimeFormat and NumberFormat go with Intl basics
  const sub = (...list) => list.includes(`${c}.${s}`);
  if (['1', '2', '3', '4', '5', '11', '12', 'A'].includes(c)) return 'A1';
  if (c === '6' || c === '7') return 'A2';
  if (c === '9') return sub('9.1', '9.2') ? 'I1' : Number(s) >= 9 ? 'A6' : 'A3';
  if (['8', '13', '14', '15', '16'].includes(c)) return 'A3';
  if (c === '20') return sub('20.1') ? 'I2' : sub('20.2') ? 'I1' : sub('20.5') ? 'I8' : 'A4';
  if (['10', '17', '18', '19', '28'].includes(c)) return 'A4';
  if (c === '21') return 'A7';
  if (c === '22') return 'I6';
  if (c === '23') return sub('23.1') ? 'I5' : 'A5';
  if (c === '24') return 'I5';
  if (c === '25') return sub('25.5') ? 'I9' : 'A5';
  if (c === '26') return 'A6';
  if (c === '27') return sub('27.1', '27.3', '27.5') ? 'I4' : 'I8';
  if (c === '29') return 'A5';
  if (c === 'C') return 'I1';
  if (['B', 'D', 'E', 'F'].includes(c)) return 'A8';
}

// ---------- Web API, stable pages ----------
// members of DOM, events, timers, fetch and storage that Essentials teaches; '' is the interface page itself
const ESSENTIALS = {
  EventTarget: /.*/, Event: /.*/, Document_Object_Model: /.*/, DOMTokenList: /^(add|remove|toggle|contains|replace)?$/,
  NodeList: /^(forEach|length|item)?$/,
  Document: /^(querySelector|querySelectorAll|getElementById|getElementsByClassName|getElementsByTagName|createElement|createTextNode|body|head|title|DOMContentLoaded_event)?$/,
  Element: /^(querySelector|querySelectorAll|classList|id|className|innerHTML|getAttribute|setAttribute|removeAttribute|hasAttribute|append|prepend|remove|before|after|replaceWith|closest|matches|children|firstElementChild|lastElementChild|nextElementSibling|previousElementSibling|insertAdjacentHTML|click_event|keydown_event|keyup_event|input_event|scrollIntoView)?$/,
  HTMLElement: /^(style|dataset|hidden|innerText|click|focus|blur|input_event|change_event)?$/,
  Node: /^(textContent|appendChild|removeChild|replaceChild|insertBefore|cloneNode|parentNode|parentElement|childNodes|firstChild|lastChild|nextSibling|previousSibling|contains|nodeType|nodeName)?$/,
  Window: /^(alert|prompt|confirm|load_event)$/,
  MouseEvent: /^(clientX|clientY|button)?$/, KeyboardEvent: /^(key|code)?$/, HTMLInputElement: /^(value|checked)?$/,
  HTMLFormElement: /^(submit_event|reset)?$/,
};
const ESSENTIALS_ASYNC = {
  Window: /^(setTimeout|setInterval|clearTimeout|clearInterval|fetch|localStorage|sessionStorage)$/,
  Fetch_API: /^(Using_Fetch)?$/, Response: /^(json|text|ok|status)?$/, Storage: /.*/, Web_Storage_API: /.*/,
};
const GROUP_MODULE = {
  W1: ['DOM', 'HTML DOM', 'Web Components', 'Selection API', 'Popover API', 'Invoker Commands API', 'HTML Sanitizer API', 'Trusted Types API', 'Geometry Interfaces', 'CSS Custom Highlight API', 'EditContext API', 'URL Fragment Text Directives'],
  W2: ['CSSOM', 'CSSOM view API', 'CSS Typed Object Model API', 'CSS Font Loading API', 'CSS Properties and Values API', 'CSS Painting API', 'Houdini API', 'CSS Containment', 'Web Animations', 'View Transition API'],
  W3: ['UI Events', 'Pointer Events', 'Touch Events', 'HTML Drag and Drop API', 'Clipboard API', 'Gamepad API', 'EyeDropper API'],
  W4: ['Fetch API', 'XMLHttpRequest API', 'Streams', 'URL API', 'URL Pattern API', 'WebSockets API', 'Server Sent Events', 'WebTransport API', 'Beacon', 'Encoding API', 'Compression Streams API', 'Channel Messaging API', 'Broadcast Channel API', 'Background Sync', 'Background Fetch API'],
  W5: ['Web Storage API', 'IndexedDB', 'Cookie Store API', 'Storage', 'Storage Access API', 'File API', 'File System API', 'File and Directory Entries API', 'Content Index API'],
  W6: ['Web Workers API', 'Service Workers API', 'Push API', 'Web Notifications', 'Performance API', 'Reporting API', 'Intersection Observer API', 'Resize Observer API', 'Prioritized Task Scheduling API', 'Background Tasks', 'Web Locks API', 'History API', 'Navigation API', 'JS Self-Profiling API', 'Compute Pressure API', 'Page Visibility API', 'Badging API'],
  W7: ['Canvas API', 'WebGL', 'WebGPU API', 'SVG'],
  W8: ['Web Audio API', 'Media Capture and Streams', 'MediaStream Recording', 'Media Source Extensions', 'Encrypted Media Extensions', 'WebVTT', 'Media Session API', 'Picture-in-Picture API', 'Document Picture-in-Picture API', 'Remote Playback API', 'Image Capture API', 'Web Speech API', 'WebCodecs API', 'Media Capabilities API', 'Insertable Streams for MediaStreamTrack API', 'Audio Output Devices API', 'Audio Session API'],
  W9: ['WebRTC', 'Geolocation API', 'Device Orientation Events', 'Sensor API', 'Battery API', 'Screen Orientation API', 'Screen Wake Lock API', 'Web Serial API', 'Web MIDI API', 'Bluetooth API', 'WebXR Device API', 'Web Crypto API', 'Web Authentication API', 'Credential Management API', 'FedCM API', 'Permissions API', 'Payment Request API', 'Network Information API', 'Prompt API', 'Device Memory API', 'Device Posture API', 'Barcode Detection API', 'Contact Picker API', 'Attribution Reporting API', 'Web Share API', 'Screen Capture API', 'Idle Detection API', 'WebHID API', 'WebUSB API', 'Web NFC API', 'Window Management API', 'WebVR API', 'Fenced Frame API', 'Private State Token API', 'Summarizer API', 'Translator and Language Detector APIs', 'Viewport Segments API', 'Keyboard API', 'Pointer Lock API', 'Fullscreen API', 'Vibration API', 'Web Periodic Background Synchronization API'],
};
const MODULE_OF_GROUP = new Map(Object.entries(GROUP_MODULE).flatMap(([m, gs]) => gs.map((g) => [g, m])));
// pages without an MDN group, by interface name
const BY_NAME = [
  [/^RTC/, 'W9'], [/^(WEBGL_|OES_|EXT_|ANGLE_|KHR_|OVR_|WebGL|GPU|WGSL|SVG)/, 'W7'], [/^CSS/, 'W2'], [/^(Audio|Video)Track/, 'W8'],
  [/^(MathML|HTML)/, 'W1'], [/^XR/, 'W9'], [/^(Transition|Animation)Event$/, 'W2'],
  [/^(CloseWatcher|DOMStringList|FormDataEvent|SubmitEvent|XMLSerializer|BarProp)$/, 'W1'], [/^(DOMRectList|Houdini_APIs)$/, 'W2'],
  [/^(MediaError|MediaStreamTrackAudioSourceNode|AudioParamDescriptor|AudioParamMap|MediaStream_Image_Capture_API)$/, 'W8'],
  [/^(PushSubscriptionOptions|ResizeObserverSize|Notifications_API|Service_Worker_API|DOMHighResTimeStamp)$/, 'W6'],
  [/^Background_Synchronization_API$/, 'W4'], [/^(AesDerivedKeyParams|Battery_Status_API|Sensor_APIs)$/, 'W9'],
];

export function webModule(row) {
  const [, , iface = '', member = ''] = row.path.split('/');
  if (iface === 'console' || iface === 'Console_API') return 'E1';
  if (ESSENTIALS_ASYNC[iface]?.test(member)) return 'E8';
  if (ESSENTIALS[iface]?.test(member)) return 'E7';
  if (!iface) return 'W1';
  if (MODULE_OF_GROUP.has(row.group)) return MODULE_OF_GROUP.get(row.group);
  for (const [re, m] of BY_NAME) if (re.test(iface)) return m;
}

// ---------- all rows that need an assignment ----------
export function planRows() {
  const out = [];
  for (const r of readCsv(path.join(DIR, 'mdn-javascript.csv')).records) out.push({ map: 'mdn-javascript', key: r.path, title: r.title, module: jsModule(r.path) });
  for (const spec of ['ecma262', 'ecma402']) {
    for (const r of readCsv(path.join(DIR, `${spec}.csv`)).records) {
      if (Number(r.level) <= 3) out.push({ map: spec, key: r.id, title: `${r.number} ${r.title}`, module: specModule(r.number, spec) });
    }
  }
  for (const r of readCsv(path.join(DIR, 'mdn-webapi.csv')).records) if (!r.status) out.push({ map: 'mdn-webapi', key: r.path, title: r.title, module: webModule(r) });
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const args = process.argv.slice(2);
  const rows = planRows();
  const known = new Set(MODULES.map((m) => m[0]));
  const orphans = rows.filter((r) => r.module !== 'ERRORS' && !known.has(r.module));
  const errorsPages = rows.filter((r) => r.module === 'ERRORS').length;
  const count = (id, maps) => rows.filter((r) => r.module === id && maps.includes(r.map)).length;
  const listId = args[args.indexOf('--list') + 1];

  if (args.includes('--list')) {
    for (const r of rows.filter((x) => x.module === listId)) console.log(`${r.map.padEnd(15)} ${r.key}  ${r.map === 'mdn-webapi' || r.map === 'mdn-javascript' ? '' : r.title}`);
  } else if (args.includes('--markdown')) {
    for (const c of [1, 2, 3, 4]) {
      const ms = MODULES.filter((m) => m[1] === c);
      console.log(`\n| Модуль | Дней | Страниц MDN | Разделов спецификаций | Всего | В день |\n|---|---|---|---|---|---|`);
      let d = 0, t = 0;
      for (const [id, , days, name] of ms) {
        const mdn = count(id, ['mdn-javascript', 'mdn-webapi']), spec = count(id, ['ecma262', 'ecma402']);
        d += days; t += mdn + spec;
        console.log(`| ${id} ${name} | ${days} | ${mdn} | ${spec} | ${mdn + spec} | ${Math.round((mdn + spec) / days)} |`);
      }
      console.log(`| Проекты | ${PROJECT_DAYS} | | | | |\n| **Итого** | **${d + PROJECT_DAYS}** | | | **${t}** | **${Math.round(t / d)}** в учебный день |`);
    }
  } else {
    for (const c of [1, 2, 3, 4]) {
      const ms = MODULES.filter((m) => m[1] === c);
      const days = ms.reduce((a, m) => a + m[2], 0);
      const total = ms.reduce((a, m) => a + count(m[0], ['mdn-javascript', 'mdn-webapi', 'ecma262', 'ecma402']), 0);
      console.log(`course ${c}: ${days} study days + ${PROJECT_DAYS} project days, ${total} rows, ${Math.round(total / days)} per study day`);
      for (const [id, , d, name] of ms) {
        const js = count(id, ['mdn-javascript']), web = count(id, ['mdn-webapi']), spec = count(id, ['ecma262', 'ecma402']);
        console.log(`   ${id} ${String(d).padStart(2)} days  js ${String(js).padStart(4)}  web ${String(web).padStart(4)}  spec ${String(spec).padStart(4)}  ${name}`);
      }
    }
    console.log(`error-message pages, placed day by day later: ${errorsPages}`);
    console.log(`rows without a module: ${orphans.length}`);
    for (const r of orphans.slice(0, 30)) console.log(`   ${r.map} ${r.key}`);
    process.exit(orphans.length ? 1 : 0);
  }
}
