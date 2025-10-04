import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getString, setString, Keys } from '../storage/Session';

// Import translations
import en from '../locales/en/translation.json';
import ru from '../locales/ru/translation.json';
import es from '../locales/es/translation.json';

const resources = {
  en: { translation: en },
  ru: { translation: ru },
  es: { translation: es },
};

// Get device language
const getDeviceLanguage = async (): Promise<string> => {
  try {
    // First check if user has selected a language
    const savedLanguage = await getString(Keys.SELECTED_LANGUAGE);
    if (savedLanguage) {
      return savedLanguage;
    }

    // Fallback to English for now (can be enhanced later)
    return 'en';
  } catch (error) {
    console.error('Error getting device language:', error);
    return 'en';
  }
};

// Initialize i18n
const initI18n = async () => {
  const language = await getDeviceLanguage();
  
  await i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: language,
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false,
      },
    });
};

// Initialize i18n immediately with fallback
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // Default to English initially
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

// Then update with actual language when available
initI18n();

// Change language function
export const changeLanguage = async (language: string) => {
  try {
    await i18n.changeLanguage(language);
    await setString(Keys.SELECTED_LANGUAGE, language);
  } catch (error) {
    console.error('Error changing language:', error);
  }
};

// Initialize i18n
initI18n();

export default i18n;
