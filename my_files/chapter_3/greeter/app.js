// ====== Приветсвие ======
alert("Привет! Сейчас мы познакомимся 👋");

// Спрашиваем имя
const name = prompt("Как тебя зовут?");

// Если пользователь нажал "Отмена" - выходим
if (name === null || name.trim() === "") {
  alert("Жаль, без имени не познакомиться. Пока!");
} else {
  // Спрашиваем возраст и сразу превращаем в число
  const age = Number(prompt("Сколько тебе лет, " + name + "?"));

  //Считаем, сколько лет до 100

  const yearsTo100 = 100 - age;

  // Выводим в консоль красиво через group
  console.group("👤 Профиль пользователя");
  console.log("Имя: ", name);
  console.log("Возраст:", age);
  console.log("Лет до 100:", yearsTo100);
  console.groupEnd();

  // Спрашиваем, нравиться ли JS

  const likeJS = confirm("Тебе нравится JavaScript?");

  if (likeJS) {
    alert("Отлично, " + name + "! Продолжай учиться 🎉");
    console.log("%c" + name + " любит JS!", "color: green; font-size: 16px;");
  } else {
    alert("Ничего, " + name + ". Через пару занятий полюбишь 😉 ");
    console.warn(name + " пока не любит JS. Дадим шанс!");
  }
}
