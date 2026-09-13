/**
 * Language switcher for JavaScript Essentials course
 * Supports: Russian (ru) and English (en)
 * Saves preference to localStorage
 */

function setLang(lang) {
    document.querySelectorAll('[data-lang]').forEach(function(el) {
        if (el.dataset.lang === lang) {
            el.classList.remove('lang-hidden');
        } else {
            el.classList.add('lang-hidden');
        }
    });

    document.documentElement.lang = lang;
    localStorage.setItem('javascript-essentials-lang', lang);

    document.querySelectorAll('.lang-btn').forEach(function(btn) {
        btn.textContent = lang === 'ru' ? 'EN' : 'RU';
    });
}

function toggleLang() {
    var current = localStorage.getItem('javascript-essentials-lang') || 'ru';
    setLang(current === 'ru' ? 'en' : 'ru');
}

document.addEventListener('DOMContentLoaded', function() {
    var lang = localStorage.getItem('javascript-essentials-lang') || 'ru';
    setLang(lang);
});
