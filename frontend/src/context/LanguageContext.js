'use client';
import { createContext, useContext, useState } from 'react';
import { t as translate } from '@/lib/i18n';

const LanguageContext = createContext({ lang: 'es', setLang: () => {}, tz: 'America/La_Paz', setTz: () => {}, t: (k) => k });

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('es');
  const [tz, setTz] = useState('America/La_Paz');
  
  const t = (key) => translate(key, lang);
  return (
    <LanguageContext.Provider value={{ lang, setLang, tz, setTz, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}
