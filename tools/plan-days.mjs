// Phase 3, step 2: days of a course. Every row of the course modules gets a day and a depth
// ("подробно" or "кратко"); the lesson is 1, because new material is introduced in the lecture.
//
//   node tools/plan-days.mjs 1              load per day; lists rows that no rule matched
//   node tools/plan-days.mjs 1 --list 16    rows of one day
//   node tools/plan-days.mjs 1 --markdown   table for docs/plan-1-essentials.md
//   node tools/plan-days.mjs 1 --apply      write course, day, lesson and depth into docs/coverage/*.csv
import path from 'node:path';
import { readCsv, writeCsv } from './lib/csv.mjs';
import { MODULES, planRows } from './plan-modules.mjs';

const DIR = path.join(import.meta.dirname, '..', 'docs', 'coverage');

// short key of a row: "Web/JavaScript/Reference/Global_Objects/Array/map" -> "Array/map",
// "Web/API/Element/append" -> "Element/append", "Web/JavaScript" -> "JS root"
export function shortKey(key) {
  for (const p of ['Web/JavaScript/Reference/Global_Objects/', 'Web/JavaScript/Reference/', 'Web/JavaScript/', 'Web/API/']) {
    if (key.startsWith(p)) return key.slice(p.length);
  }
  return key === 'Web/JavaScript' ? 'JS root' : key === 'Web/API' ? 'API root' : key;
}

const DAYS_1 = [
  [1, 'E1', 'Что такое JavaScript и где он работает'],
  [2, 'E1', 'Инструменты: редактор, страница, консоль'],
  [3, 'E1', 'Обзор языка и первая программа'],
  [4, 'E2', 'Переменные: let, const, var'],
  [5, 'E2', 'Типы данных и typeof'],
  [6, 'E2', 'Арифметика и присваивание'],
  [7, 'E2', 'Сравнение и логические операторы'],
  [8, 'E2', 'Преобразование типов и приоритет операторов'],
  [9, 'E3', 'Условия: if, else, switch'],
  [10, 'E3', 'Циклы: for, while, do...while'],
  [11, 'E3', 'Перебор значений: for...of, for...in; try...catch'],
  [12, 'E4', 'Функции: объявление, параметры, return'],
  [13, 'E4', 'Стрелочные функции и функции-выражения'],
  [14, 'E4', 'Параметры по умолчанию и остаточные параметры'],
  [15, 'E4', 'Практика: разбиваем задачу на функции (смешанный день)'],
  [16, 'E5', 'Строки и их методы'],
  [17, 'E5', 'Числа и первые даты: Number, parseInt, Date'],
  [18, 'E5', 'Math и случайные числа'],
  [19, 'E6', 'Массивы: создание и основные методы'],
  [20, 'E6', 'Перебор массивов: forEach, map, filter, reduce'],
  [21, 'E6', 'Объекты: свойства, методы, перебор'],
  [22, 'E6', 'Деструктуризация, spread и необязательная цепочка'],
  [23, 'E6', 'JSON: parse и stringify'],
  [24, 'E7', 'DOM: находим элементы на странице'],
  [25, 'E7', 'Меняем страницу: текст, разметка, атрибуты, классы, стили'],
  [26, 'E7', 'Создаём и удаляем элементы'],
  [27, 'E7', 'События: слушатели, объект события, всплытие'],
  [28, 'E7', 'Формы: поля, отправка, проверка ввода'],
  [29, null, 'Мини-проект: список дел'],
  [30, 'E8', 'Таймеры и промисы'],
  [31, 'E8', 'fetch, async/await и localStorage'],
  [32, null, 'Мини-проект: каталог с данными с сервера'],
  [33, null, 'Итоговый проект: замысел и план'],
  [34, null, 'Итоговый проект: реализация'],
  [35, null, 'Итоговый проект: доработка и проверка'],
  [36, null, 'Защита проектов'],
];

// [day, depth, pattern on the short key]; the first match wins
const RULES_1 = [
  // 1. Что такое JavaScript
  [1, 'подробно', /^Guide\/Introduction$/],
  [1, 'кратко', /^(JS root|Guide|Reference|JavaScript_technologies_overview)$/],
  // 2. Консоль
  [2, 'подробно', /^console(\/(log|error|warn|info|table|dir|time|timeEnd|count|group|groupEnd|clear|assert|trace)_static)?$/],
  [2, 'кратко', /^(console\/|Console_API$|Statements\/debugger$)/],
  // 3. Обзор языка
  [3, 'подробно', /^Guide\/Language_overview$/],
  // 4. Переменные
  [4, 'подробно', /^(Statements\/(let|const|var|block)|Guide\/Grammar_and_types)$/],
  [4, 'кратко', /^(Statements\/(Empty|Expression_statement)|Errors\/(Invalid_const_assignment|Missing_initializer_in_const|Undeclared_var|No_variable_name|Cant_access_lexical_declaration_before_init|Read-only))$/],
  // 5. Типы данных
  [5, 'подробно', /^(Guide\/Data_structures|Operators\/(typeof|null)|undefined|NaN|Boolean)$/],
  [5, 'кратко', /^(Infinity|Boolean\/|Errors\/(Unexpected_type|Not_defined))/],
  // 6. Арифметика
  [6, 'подробно', /^Operators\/(Addition|Subtraction|Multiplication|Division|Remainder|Assignment|Addition_assignment|Increment|Decrement)$/],
  [6, 'кратко', /^(Operators$|Operators\/(Exponentiation|Unary_negation|Unary_plus|(Subtraction|Multiplication|Division|Remainder|Exponentiation)_assignment)$)/],
  // 7. Сравнение и логика
  [7, 'подробно', /^Operators\/(Equality|Inequality|Strict_equality|Strict_inequality|Greater_than|Greater_than_or_equal|Less_than|Less_than_or_equal|Logical_AND|Logical_OR|Logical_NOT|Nullish_coalescing|Conditional_operator)$/],
  [7, 'кратко', /^Operators\/Comma_operator$/],
  // 8. Преобразования и приоритет
  [8, 'подробно', /^(Guide\/Expressions_and_operators|Operators\/(Operator_precedence|Grouping))$/],
  [8, 'кратко', /^Errors\/(Invalid_assignment_left-hand_side|Unexpected_token|Illegal_character|Identifier_after_number|String_literal_EOL|Missing_parenthesis_after_condition|Missing_curly_after_function_body)$/],
  // 9. Условия
  [9, 'подробно', /^(Statements\/(if\.\.\.else|switch)|Guide\/Control_flow_and_error_handling)$/],
  [9, 'кратко', /^Statements$/],
  // 10. Циклы
  [10, 'подробно', /^(Statements\/(for|while|do\.\.\.while|break|continue)|Guide\/Loops_and_iteration)$/],
  [10, 'кратко', /^(Statements\/label|Errors\/(Bad_break|Bad_continue|Label_not_found))$/],
  // 11. Перебор и ошибки
  [11, 'подробно', /^Statements\/(for\.\.\.of|for\.\.\.in|try\.\.\.catch|throw)$/],
  [11, 'кратко', /^Errors\/(is_not_iterable|Invalid_for-in_initializer|Invalid_for-of_initializer)$/],
  // 12. Функции
  [12, 'подробно', /^(Statements\/(function|return)|Functions|Guide\/Functions)$/],
  [12, 'кратко', /^Errors\/(Missing_formal_parameter|Missing_parenthesis_after_argument_list|Stmt_after_return|Unnamed_function_statement|Too_much_recursion|More_arguments_needed|Not_a_function)$/],
  // 13. Стрелочные функции
  [13, 'подробно', /^(Functions\/Arrow_functions|Operators\/function)$/],
  // 14. Параметры
  [14, 'подробно', /^Functions\/(Default_parameters|rest_parameters)$/],
  [14, 'кратко', /^Errors\/(Rest_with_default|Parameter_after_rest_parameter|Duplicate_parameter|Redeclared_parameter)$/],
  // 16. Строки
  [16, 'подробно', /^(String|Template_literals|String\/(length|at|charAt|includes|indexOf|lastIndexOf|slice|substring|startsWith|endsWith|toLowerCase|toUpperCase|trim|trimStart|trimEnd|padStart|padEnd|repeat|concat))$/],
  [16, 'кратко', /^(String\/|Errors\/(Negative_repetition_count|Resulting_string_too_large|Not_a_valid_code_point))/],
  // 17. Числа
  [17, 'подробно', /^(Guide\/Numbers_and_strings|parseInt|parseFloat|isNaN|isFinite|Number|Number\/(Number|isInteger|isNaN|isFinite|parseInt|parseFloat|toFixed|toString|MAX_SAFE_INTEGER))$/],
  [17, 'подробно', /^Date(\/(Date|now|getFullYear|getMonth|getDate|getHours|getMinutes|getTime|toLocaleDateString|toLocaleTimeString))?$/],
  [17, 'кратко', /^(Number\/|Errors\/(Bad_radix|Precision_range|Invalid_date))/],
  // 18. Math
  [18, 'подробно', /^(Math|Math\/(random|round|floor|ceil|abs|max|min|pow|sqrt|trunc|sign|PI))$/],
  [18, 'кратко', /^Math\//],
  // 19. Массивы
  [19, 'подробно', /^(Array|Guide\/Indexed_collections|Array\/(Array|length|push|pop|shift|unshift|slice|splice|indexOf|includes|join|concat|at|reverse|isArray|from|of))$/],
  [19, 'кратко', /^(Array\/(toString|copyWithin|fill|with|toReversed|toSpliced|lastIndexOf)|Errors\/Invalid_array_length)$/],
  // 20. Перебор массивов
  [20, 'подробно', /^Array\/(forEach|map|filter|find|findIndex|reduce|some|every|sort|flat|flatMap)$/],
  [20, 'кратко', /^(Array\/(reduceRight|findLast|findLastIndex|toSorted)|Errors\/(Reduce_of_empty_array_with_no_initial_value|Array_sort_argument))$/],
  // 21. Объекты
  [21, 'подробно', /^(Object|Guide\/Working_with_objects|Object\/(keys|values|entries|assign|hasOwn)|Operators\/(Object_initializer|Property_accessors|delete|in))$/],
  [21, 'кратко', /^(Global_Objects|Object\/(fromEntries|groupBy)|Errors\/(No_properties|Missing_colon_after_property_id|Missing_curly_after_property_list|Cant_assign_to_property|in_operator_no_object|Cant_delete|Missing_name_after_dot_operator|Missing_bracket_after_list|Duplicate_proto))$/],
  // 22. Деструктуризация и spread
  [22, 'подробно', /^Operators\/(Destructuring|Spread_syntax|Optional_chaining)$/],
  // 23. JSON
  [23, 'подробно', /^JSON(\/(parse|stringify))?$/],
  [23, 'кратко', /^Errors\/(JSON_bad_parse|Cyclic_object_value)$/],
  // 24. DOM: поиск
  [24, 'подробно', /^(Document|Document\/(querySelector|querySelectorAll|getElementById|body|title)|Element\/(querySelector|querySelectorAll|closest|matches)|Document_Object_Model|Document_Object_Model\/(Anatomy_of_the_DOM|Selection_and_traversal_on_the_DOM_tree))$/],
  [24, 'кратко', /^(Document\/(getElementsByClassName|getElementsByTagName|head)|NodeList(\/.*)?|Element\/(children|firstElementChild|lastElementChild|nextElementSibling|previousElementSibling)|Node\/(childNodes|firstChild|lastChild|nextSibling|previousSibling|parentNode|parentElement|contains|nodeName|nodeType))$/],
  // 25. DOM: изменение
  [25, 'подробно', /^(Element|Element\/(innerHTML|getAttribute|setAttribute|removeAttribute|hasAttribute|id|className|classList)|DOMTokenList|DOMTokenList\/(add|remove|toggle|contains)|HTMLElement|HTMLElement\/(style|dataset|innerText)|Node\/textContent)$/],
  [25, 'кратко', /^(Element\/(insertAdjacentHTML|scrollIntoView)|DOMTokenList\/replace|HTMLElement\/hidden|Document_Object_Model\/Reflected_attributes)$/],
  // 26. DOM: создание и удаление
  [26, 'подробно', /^(Document\/(createElement|createTextNode)|Element\/(append|prepend|remove|replaceWith)|Node|Node\/(appendChild|removeChild|insertBefore|replaceChild|cloneNode)|Document_Object_Model\/Building_and_updating_the_DOM_tree)$/],
  [26, 'кратко', /^Element\/(before|after)$/],
  // 27. События
  [27, 'подробно', /^(EventTarget|EventTarget\/(addEventListener|removeEventListener)|Event|Event\/(target|currentTarget|type|preventDefault|stopPropagation|bubbles)|Element\/(click_event|keydown_event|keyup_event)|MouseEvent|MouseEvent\/(clientX|clientY|button)|KeyboardEvent|KeyboardEvent\/(key|code)|Document_Object_Model\/Events|Document\/DOMContentLoaded_event)$/],
  [27, 'кратко', /^(EventTarget\/|Event\/|HTMLElement\/(click|focus|blur)|Window\/load_event)/],
  // 28. Формы
  [28, 'подробно', /^(HTMLInputElement|HTMLInputElement\/(value|checked)|HTMLFormElement|HTMLFormElement\/submit_event|HTMLElement\/change_event|Element\/input_event)$/],
  [28, 'кратко', /^(HTMLFormElement\/reset|Window\/(alert|confirm|prompt))$/],
  // 30. Таймеры и промисы
  [30, 'подробно', /^(Window\/(setTimeout|setInterval|clearTimeout|clearInterval)|Guide\/Using_promises|Promise|Promise\/(then|catch|finally|Promise))$/],
  [30, 'кратко', /^Promise\/(resolve|reject)$/],
  // 31. fetch, async/await, localStorage
  [31, 'подробно', /^(Window\/fetch|Fetch_API|Fetch_API\/Using_Fetch|Response|Response\/(json|text|ok|status)|Statements\/async_function|Operators\/await|Storage|Storage\/(getItem|setItem|removeItem|clear)|Web_Storage_API|Web_Storage_API\/Using_the_Web_Storage_API|Window\/(localStorage|sessionStorage)|encodeURIComponent|decodeURIComponent)$/],
  [31, 'кратко', /^(Storage\/(key|length)|encodeURI|decodeURI|Errors\/Malformed_URI)$/],
];

export const PLAN = {
  1: { course: 'Essentials', days: DAYS_1, rules: RULES_1 },
};

export function assign(courseNo) {
  const plan = PLAN[courseNo];
  if (!plan) throw new Error(`no day plan for course ${courseNo}`);
  const modules = new Set(MODULES.filter((m) => m[1] === courseNo).map((m) => m[0]));
  const rows = planRows().filter((r) => modules.has(r.module) || r.module === 'ERRORS');
  const out = [], missed = [];
  for (const r of rows) {
    const rule = plan.rules.find(([, , re]) => re.test(shortKey(r.key)));
    if (rule) out.push({ ...r, day: rule[0], depth: rule[1] });
    else if (r.module !== 'ERRORS') missed.push(r);
  }
  return { plan, rows: out, missed };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const args = process.argv.slice(2);
  const courseNo = Number(args[0]);
  const { plan, rows, missed } = assign(courseNo);
  const ofDay = (d) => rows.filter((r) => r.day === d);

  if (args.includes('--list')) {
    const d = Number(args[args.indexOf('--list') + 1]);
    for (const r of ofDay(d)) console.log(`${r.depth.padEnd(9)} ${shortKey(r.key)}`);
  } else if (args.includes('--markdown')) {
    console.log('| День | Модуль | Тема | Подробно | Кратко |\n|---|---|---|---|---|');
    for (const [day, module, title] of plan.days) {
      const d = ofDay(day);
      const full = d.filter((r) => r.depth === 'подробно').length, brief = d.length - full;
      console.log(`| ${day} | ${module ?? 'проект'} | ${title} | ${full || ''} | ${brief || ''} |`);
    }
    console.log(`| | | **Итого** | **${rows.filter((r) => r.depth === 'подробно').length}** | **${rows.filter((r) => r.depth === 'кратко').length}** |`);
  } else if (args.includes('--apply')) {
    const byMap = {};
    for (const r of rows) (byMap[r.map] ??= new Map()).set(r.key, r);
    for (const [map, assigned] of Object.entries(byMap)) {
      const file = path.join(DIR, `${map}.csv`);
      const csv = readCsv(file);
      const keyCol = map.startsWith('mdn') ? 'path' : 'id';
      let n = 0;
      for (const row of csv.records) {
        const a = assigned.get(row[keyCol]);
        if (!a) continue;
        Object.assign(row, { course: String(courseNo), day: String(a.day), lesson: '1', depth: a.depth });
        n++;
      }
      writeCsv(file, csv.header, csv.records);
      console.log(`${map}.csv: ${n} rows assigned to course ${courseNo}`);
    }
  } else {
    console.log(`course ${courseNo} (${plan.course}): ${rows.length} rows on ${plan.days.filter((d) => d[1]).length} study days`);
    for (const [day, module, title] of plan.days) {
      const d = ofDay(day);
      const full = d.filter((r) => r.depth === 'подробно').length;
      console.log(`  ${String(day).padStart(2)} ${(module ?? '--').padEnd(3)} ${String(d.length).padStart(3)} rows (${full} подробно)  ${title}`);
    }
    console.log(`rows without a day: ${missed.length}`);
    for (const r of missed.slice(0, 40)) console.log(`   ${r.module} ${shortKey(r.key)}`);
    process.exit(missed.length ? 1 : 0);
  }
}
