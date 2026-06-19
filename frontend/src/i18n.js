import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import translationEN from "./i18n/en.json";
import translationSI from "./i18n/si.json";
import translationTA from "./i18n/ta.json";

// The resources
const resources = {
  en: {
    translation: translationEN,
  },
  si: {
    translation: translationSI,
  },
  ta: {
    translation: translationTA,
  },
};

// Get initial language from localStorage or default to English
const savedLanguage = localStorage.getItem("i18nextLng") || "en";
document.documentElement.lang = savedLanguage;

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    lng: savedLanguage,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

// Set language persistence and HTML lang attribute on change
i18n.on("languageChanged", (lng) => {
  localStorage.setItem("i18nextLng", lng);
  document.documentElement.lang = lng;
});

export default i18n;
