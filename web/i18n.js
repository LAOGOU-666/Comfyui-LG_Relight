// web/i18n.js
import i18nData from './i18n.json';

function getUserLang() {
    // Usa preferencia ComfyUI si existe, si no, toma el idioma del navegador
    return window.comfyUILang || navigator.language.slice(0, 2) || 'en';
}

export function t(key) {
    const lang = getUserLang();
    return (i18nData[lang] && i18nData[lang][key]) || i18nData['en'][key] || key;
}
