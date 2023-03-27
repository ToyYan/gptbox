import i18n from "i18next";
import { useTranslation, initReactI18next } from "react-i18next";
const locales = [ "bn", "de", "en", "es", "fr", "he", "id", "ja", "ko", "pt", "ru", "sv", "te", "vi", "zh" ];
const ns = [ 'common', 'chat', 'sidebar', 'markdown', 'settings' ];
const genterResource = () => {
  const resources: Record<string, any> = {};
  locales.forEach(locale => {
    resources[locale] = {};
    ns.forEach(n => {
      /* webpackInclude: /\.json$/ */
      /* webpackChunkName: "language" */
      /* webpackMode: "lazy" */
      /* webpackPrefetch: true */
      /* webpackPreload: true */
      try{
        resources[locale][n] = require('@/locales/' + locale + '/' + n + '.json');
      } catch(e) {}
    });
  });
  return resources;
}

const resources = genterResource();

i18n
.use(initReactI18next)
.init({
  resources,
  lng: "en", 
  interpolation: {
    escapeValue: false 
  }
});

export { useTranslation };

export default i18n;
















