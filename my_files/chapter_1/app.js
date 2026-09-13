console.log("Привет, JavaScript!");
const title = document.getElementById("title");
title.textContent = "Hello, JavaScript!";
const btn = document.getElementById("btn");
btn.addEventListener("click", function () {
  alert("Ты нажал кнопку!");
});
