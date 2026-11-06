import { useEffect, useState } from 'react';
import AppContext from './appContextStore';
import { DEFAULT_PROVIDER } from './providers';
const THEME_STORAGE_KEY = 'pigeon.theme';

function getInitialTheme() {
  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return storedTheme === 'dark' || storedTheme === 'light' ? storedTheme : 'light';
  } catch (error) {
    console.warn('Could not read the saved Pigeon theme.', error);
    return 'light';
  }
}

export function AppProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);
  const [dbConfig, setDbConfig] = useState({ host: '', user: '', pass: '', dbname: '', port: '' });
  const [aiConfig, setAiConfig] = useState({
    provider: DEFAULT_PROVIDER,
    apiKeys: {},
    model: '',
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
      console.warn('Could not save the Pigeon theme.', error);
    }
  }, [theme]);

  return (
    <AppContext.Provider value={{ theme, setTheme, dbConfig, setDbConfig, aiConfig, setAiConfig }}>
      {children}
    </AppContext.Provider>
  );
}
