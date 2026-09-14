/**
 * Language switcher for JavaScript Essentials course
 * Supports: Russian (ru), English (en) and Turkmen (tk) on pages that have it
 * Pages without the chosen language fall back to Russian
 * Saves preference to localStorage
 */

function pageHasLang(lang) {
    return lang === 'ru' || lang === 'en' || document.querySelector('[data-lang="' + lang + '"]') !== null;
}

function setLang(lang) {
    var shown = pageHasLang(lang) ? lang : 'ru';

    document.querySelectorAll('[data-lang]').forEach(function(el) {
        if (el.dataset.lang === shown) {
            el.classList.remove('lang-hidden');
        } else {
            el.classList.add('lang-hidden');
        }
    });

    document.documentElement.lang = shown;
    localStorage.setItem('javascript-essentials-lang', lang);

    document.querySelectorAll('.lang-btn').forEach(function(btn) {
        btn.textContent = shown === 'ru' ? 'EN' : 'RU';
    });

    document.querySelectorAll('.lang-opt').forEach(function(btn) {
        var active = btn.dataset.setLang === shown;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
}

function toggleLang() {
    setLang(document.documentElement.lang === 'ru' ? 'en' : 'ru');
}

document.addEventListener('DOMContentLoaded', function() {
    var lang = localStorage.getItem('javascript-essentials-lang') || 'ru';
    setLang(lang);
});
