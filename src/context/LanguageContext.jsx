import { createContext, useCallback, useContext, useState } from 'react';

const LanguageContext = createContext(null);
const LANG_STORAGE_KEY = 'ce_language_mode';

/**
 * รองรับ 2 โหมดภาษาที่ผู้ใช้สลับได้จากหน้าเว็บ:
 * - 'TH': ภาษาไทย (ค่าเริ่มต้น)
 * - 'EN': ภาษาอังกฤษ (English)
 */
export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY);
      return saved === 'EN' ? 'EN' : 'TH';
    } catch {
      return 'TH';
    }
  });

  const setLang = useCallback((nextLang) => {
    const normalized = nextLang === 'EN' ? 'EN' : 'TH';
    setLangState(normalized);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, normalized);
    } catch {
      // ignore storage errors
    }
  }, []);

  const t = useCallback(
    (th, en) => {
      if (lang === 'EN') return en || th;
      return th;
    },
    [lang]
  );

  const tDesc = useCallback(
    (th, en) => {
      if (lang === 'EN') return en || th;
      return th;
    },
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, tDesc }}>
      {children}
    </LanguageContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage ต้องถูกเรียกใช้ภายใน <LanguageProvider> เท่านั้น');
  }
  return ctx;
}
