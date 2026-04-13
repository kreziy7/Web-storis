import { useLanguageStore } from '../../store/languageStore';
import translations from '../i18n/translations';

export const useTranslation = () => {
  const { lang } = useLanguageStore();
  const t = translations[lang] || translations.en;
  return { t, lang };
};
