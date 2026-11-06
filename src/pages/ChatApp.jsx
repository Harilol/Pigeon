import { useState } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import SettingsPanel from '../components/SettingsPanel';
import ChatPanel from '../components/ChatPanel';
import PigeonMark from '../components/PigeonMark';
import useAppContext from '../useAppContext';
import { AI_PROVIDERS } from '../providers';
import styles from './ChatApp.module.css';

const configuredApiBase = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '');
const API_BASE = configuredApiBase || (import.meta.env.DEV ? 'http://127.0.0.1:8000' : '');
const HISTORY_STORAGE_KEY = 'pigeon.chatHistory';
const REQUEST_TIMEOUT_MS = 30_000;

function getApiUrl(path) {
  if (!API_BASE) {
    throw new Error('The Pigeon API URL is not configured. Set VITE_API_BASE_URL for this deployment.');
  }
  return `${API_BASE}${path}`;
}

function readChatHistory() {
  try {
    const storedHistory = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!storedHistory) return [];

    const parsedHistory = JSON.parse(storedHistory);
    if (!Array.isArray(parsedHistory)) throw new TypeError('Saved conversation history is not a list.');

    return parsedHistory.filter((conversation) =>
      conversation
      && typeof conversation.id === 'string'
      && typeof conversation.title === 'string'
      && Array.isArray(conversation.messages),
    );
  } catch (error) {
    console.warn('Could not read saved Pigeon conversations.', error);
    return [];
  }
}

async function postForm(url, formData) {
  const controller = new AbortController();
  let timeoutId;
  try {
    const request = (async () => {
      const response = await fetch(url, { method: 'POST', body: formData, signal: controller.signal });
      let data;
      try {
        data = await response.json();
      } catch (error) {
        throw new Error(`The Pigeon API returned an unreadable response (HTTP ${response.status}).`, { cause: error });
      }
      return { response, data };
    })();

    const timeout = new Promise((_, reject) => {
      timeoutId = window.setTimeout(() => {
        controller.abort();
        const error = new Error(`The request timed out after ${REQUEST_TIMEOUT_MS / 1000} seconds.`);
        error.name = 'AbortError';
        reject(error);
      }, REQUEST_TIMEOUT_MS);
    });

    return await Promise.race([request, timeout]);
  } finally {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  }
}

function getMissingDatabaseFields(config) {
  return [
    ['host', 'host'],
    ['user', 'username'],
    ['pass', 'password'],
    ['dbname', 'database name'],
    ['port', 'port'],
  ].filter(([key]) => !config[key]?.trim()).map(([, label]) => label);
}

function getApiError(response, data) {
  const candidate = data?.error ?? data?.detail ?? data?.message;
  const message = typeof candidate === 'string'
    ? candidate
    : candidate && typeof candidate.message === 'string'
      ? candidate.message
      : null;

  if (message) return message;
  if (!response.ok) {
    const statusText = response.statusText ? ` ${response.statusText}` : '';
    return `The Pigeon API returned HTTP ${response.status}${statusText}.`;
  }
  return null;
}

function ControlIcon({ name }) {
  const paths = {
    history: <><path d="M3 8a8 8 0 1 1-.2 5" /><path d="M3 3v5h5M12 8v4l2.5 1.5" /></>,
    settings: <><path d="M4 6h9m4 0h3M4 12h3m4 0h9M4 18h9m4 0h3" /><circle cx="15" cy="6" r="2" /><circle cx="9" cy="12" r="2" /><circle cx="15" cy="18" r="2" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></>,
    moon: <path d="M20.2 15.4A8.5 8.5 0 0 1 8.6 3.8 8.5 8.5 0 1 0 20.2 15.4Z" />,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export default function ChatApp() {
  const { theme, setTheme, dbConfig, setDbConfig, aiConfig, setAiConfig } = useAppContext();
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth > 960);
  const [isSettingsOpen, setIsSettingsOpen] = useState(() => window.innerWidth > 960);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState({ message: '', error: false });
  const [chatHistory, setChatHistory] = useState(readChatHistory);
  const [activeChatId, setActiveChatId] = useState(() => chatHistory[0]?.id ?? null);
  const [messages, setMessages] = useState(() => chatHistory[0]?.messages ?? []);
  const [isLoading, setIsLoading] = useState(false);

  const saveConversation = (id, updatedMessages) => {
    const firstQuestion = updatedMessages.find((message) => message.role === 'user')?.content ?? 'New conversation';
    const conversation = {
      id,
      title: firstQuestion.length > 42 ? `${firstQuestion.slice(0, 42)}…` : firstQuestion,
      messages: updatedMessages,
    };
    const updatedHistory = [conversation, ...chatHistory.filter((item) => item.id !== id)];
    setChatHistory(updatedHistory);
    try {
      window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory));
    } catch (error) {
      console.warn('Could not save Pigeon conversations in this browser.', error);
      setConnectionStatus({
        message: 'This conversation could not be saved in browser storage.',
        error: true,
      });
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setActiveChatId(null);
  };

  const handleSelectChat = (conversation) => {
    if (isLoading) return;
    setActiveChatId(conversation.id);
    setMessages(conversation.messages);
  };

  const handleConnect = async () => {
    const missingFields = getMissingDatabaseFields(dbConfig);
    if (missingFields.length) {
      setConnectionStatus({
        message: `Add your database ${missingFields.join(', ')} in Settings before connecting.`,
        error: true,
      });
      return;
    }

    setIsConnecting(true);
    setConnectionStatus({ message: 'Connecting…', error: false });
    try {
      const formData = new FormData();
      Object.entries(dbConfig).forEach(([key, value]) => formData.append(`db_${key === 'dbname' ? 'name' : key}`, value));
      const { response, data } = await postForm(getApiUrl('/api/connect/'), formData);
      const apiError = getApiError(response, data);
      if (apiError) {
        setConnectionStatus({ message: apiError, error: true });
      } else {
        setConnectionStatus({ message: 'Connected. You can start asking questions.', error: false });
      }
    } catch (error) {
      const message = error.name === 'AbortError'
        ? 'The database connection request timed out. Check the connection details and try again.'
        : error instanceof TypeError
          ? 'Could not reach the Pigeon API. Check that the local service is running.'
          : error.message;
      setConnectionStatus({ message, error: true });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSendMessage = (question) => {
    const missingDatabaseFields = getMissingDatabaseFields(dbConfig);
    const provider = AI_PROVIDERS[aiConfig.provider];
    const model = aiConfig.model === '__custom__' ? '' : aiConfig.model.trim();
    const missingFields = [
      ...(missingDatabaseFields.length ? [`database ${missingDatabaseFields.join(', ')}`] : []),
      ...(!(aiConfig.apiKeys[aiConfig.provider] ?? '').trim() ? [provider.keyLabel] : []),
      ...(!model ? ['AI model'] : []),
    ];
    if (missingFields.length) {
      setConnectionStatus({
        message: `Add your ${missingFields.join(' and ')} in Settings before asking a question.`,
        error: true,
      });
      setIsSettingsOpen(true);
      return false;
    }

    setConnectionStatus({ message: '', error: false });
    const chatId = activeChatId ?? Date.now().toString();
    const nextMessages = [...messages, { role: 'user', content: question }];
    setActiveChatId(chatId);
    setMessages(nextMessages);
    saveConversation(chatId, nextMessages);
    setIsLoading(true);

    const send = async () => {
      try {
        const formData = new FormData();
        formData.append('q', question);
        formData.append('db_host', dbConfig.host);
        formData.append('db_user', dbConfig.user);
        formData.append('db_pass', dbConfig.pass);
        formData.append('db_name', dbConfig.dbname);
        formData.append('db_port', dbConfig.port);
        formData.append('provider', aiConfig.provider);
        formData.append('base_url', provider.baseUrl);
        formData.append('api_key', aiConfig.apiKeys[aiConfig.provider]);
        formData.append('model', model);

        const { response, data } = await postForm(getApiUrl('/api/ask/'), formData);
        const apiError = getApiError(response, data);
        const reply = apiError
          ? { role: 'ai', content: apiError }
          : typeof data.answer === 'string'
            ? {
              role: 'ai',
              content: data.answer,
              sql: data.sql,
              columns: data.columns,
              rows: data.rows,
              truncated: data.truncated,
            }
            : { role: 'ai', content: 'The Pigeon API response did not include an answer. Check the backend response format.' };
        const completedMessages = [...nextMessages, reply];
        setMessages(completedMessages);
        saveConversation(chatId, completedMessages);
      } catch (error) {
        const message = error.name === 'AbortError'
          ? 'The request timed out after 30 seconds. Check your connection and try again.'
          : error instanceof TypeError
            ? 'Could not reach the Pigeon API. Check that the local service is running.'
            : error.message;
        const completedMessages = [...nextMessages, { role: 'ai', content: message }];
        setMessages(completedMessages);
        saveConversation(chatId, completedMessages);
      } finally {
        setIsLoading(false);
      }
    };
    void send();
    return true;
  };

  return (
    <div className={`${styles.appWrapper} ${styles[theme]}`}>
      <header className={styles.topHeader}>
        <div className={styles.headerLeft}>
          <Link to="/" viewTransition className={styles.logo} aria-label="Return to Pigeon home">
            <PigeonMark className={styles.logoMark} />
            <span>Pigeon</span>
          </Link>
          <span className={styles.headerDivider} />
          <span className={styles.workspaceName}>Postgres workspace</span>
        </div>

        <div className={styles.headerRight}>
          <div className={styles.panelControls} role="group" aria-label="Workspace panels">
            <button
              className={`${styles.panelToggle} ${isSidebarOpen ? styles.panelToggleActive : ''}`}
              onClick={() => setIsSidebarOpen((open) => !open)}
              aria-pressed={isSidebarOpen}
              title={isSidebarOpen ? 'Hide history panel' : 'Show history panel'}
            >
              <ControlIcon name="history" /><span>History</span>
            </button>
            <button
              className={`${styles.panelToggle} ${isSettingsOpen ? styles.panelToggleActive : ''}`}
              onClick={() => setIsSettingsOpen((open) => !open)}
              aria-pressed={isSettingsOpen}
              title={isSettingsOpen ? 'Hide settings panel' : 'Show settings panel'}
            >
              <ControlIcon name="settings" /><span>Settings</span>
            </button>
          </div>
          <span className={styles.headerDivider} />
          <button
            className={styles.themeToggle}
            onClick={() => setTheme((current) => current === 'light' ? 'dark' : 'light')}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          >
            <ControlIcon name={theme === 'light' ? 'moon' : 'sun'} />
            <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
          </button>
        </div>
      </header>

      <main className={styles.mainLayout}>
        <div className={`${styles.sidebarContainer} ${isSidebarOpen ? styles.open : styles.closed}`}>
          <Sidebar
            conversations={chatHistory}
            activeChatId={activeChatId}
            onNewChat={handleNewChat}
            onSelectChat={handleSelectChat}
            disabled={isLoading}
          />
        </div>

        <ChatPanel messages={messages} isLoading={isLoading} onSend={handleSendMessage} />

        <div className={`${styles.settingsContainer} ${isSettingsOpen ? styles.openRight : styles.closedRight}`}>
          <SettingsPanel
            dbConfig={dbConfig}
            setDbConfig={setDbConfig}
            aiConfig={aiConfig}
            setAiConfig={setAiConfig}
            onConnect={handleConnect}
            isConnecting={isConnecting}
            connectionStatus={connectionStatus}
          />
        </div>
      </main>
    </div>
  );
}
