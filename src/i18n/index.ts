import i18n from "i18next";
import cn from './cn';
import en from './en';
import { useTranslation, initReactI18next } from "react-i18next";
const resources = {
  en: {
    translation: en,
  },
  cn: {
    translation: cn,
  }
};

i18n
.use(initReactI18next)
.init({
  resources,
  lng: "cn", 
  interpolation: {
    escapeValue: false 
  }
});

export { useTranslation };

export default i18n;