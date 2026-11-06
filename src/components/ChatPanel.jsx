import { useRef, useState } from 'react';
import PigeonMark from './PigeonMark';
import styles from './ChatPanel.module.css';

const suggestions = [
  'What tables are in my database?',
  'Show me the latest orders',
  'Which customers spend the most?',
];

function formatText(text) {
  if (!text) return '';
  return text.split('\n').map((line, index) => {
    const parts = line.split(/(\*\*.*?\*\*)/g);
    return (
      <span key={index}>
        {parts.map((part, partIndex) => part.startsWith('**') && part.endsWith('**')
          ? <strong key={partIndex}>{part.slice(2, -2)}</strong>
          : part)}
        {index < text.split('\n').length - 1 && <br />}
      </span>
    );
  });
}

export default function ChatPanel({ messages, isLoading, onSend }) {
  const [input, setInput] = useState('');
  const inputRef = useRef(null);

  const handleSubmit = (event) => {
    event.preventDefault();
    const question = input.trim();
    if (!question || isLoading) return;
    if (onSend(question) === false) return;
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
  };

  return (
    <section className={styles.panel} aria-label="Database conversation">
      <div className={styles.header}>
        <div>
          <span className={styles.kicker}>YOUR WORKSPACE</span>
          <h1 className={styles.headerTitle}>{messages.length ? 'Conversation' : 'Ask your data'}</h1>
        </div>
        <span className={styles.secureBadge}><span /> Ready when you are</span>
      </div>

      <div className={styles.messages} aria-live="polite">
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <PigeonMark className={styles.emptyIcon} />
            <span className={styles.welcomeLabel}>A FRESH PERSPECTIVE</span>
            <h2>What would you like<br />to know?</h2>
            <p>Ask a question about your PostgreSQL data. Start with one of these, or write your own.</p>
            <div className={styles.suggestions}>
              {suggestions.map((suggestion) => (
                <button key={suggestion} type="button" onClick={() => setInput(suggestion)}>{suggestion}<span>↗</span></button>
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.messageList}>
            {messages.map((message, index) => (
              <article key={`${index}-${message.role}`} className={`${styles.messageRow} ${message.role === 'user' ? styles.messageRowUser : styles.messageRowAi}`}>
                {message.role === 'ai' && (
                  <div className={styles.assistantAvatar}><PigeonMark className={styles.avatarMark} /></div>
                )}
                <div className={styles.messageContent}>
                  <span className={styles.messageAuthor}>{message.role === 'user' ? 'You' : 'Pigeon'}</span>
                  <div className={`${styles.bubble} ${message.role === 'user' ? styles.userBubble : styles.aiBubble}`}>
                    {message.role === 'user' ? message.content : formatText(message.content)}
                  </div>
                  {message.role === 'ai' && message.sql && (
                    <details className={styles.queryDetails}>
                      <summary className={styles.querySummary}>View SQL</summary>
                      <pre className={styles.queryCode}>{message.sql}</pre>
                    </details>
                  )}
                  {message.role === 'ai' && message.rows?.length > 0 && (
                    <div className={styles.tableContainer}>
                      <div className={styles.tableToolbar}>
                        <span>QUERY RESULTS</span>
                        <span>{message.rows.length}{message.truncated ? '+' : ''} rows{message.truncated ? ' · limited' : ''}</span>
                      </div>
                      <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                          <thead><tr>{(message.columns ?? []).map((column, columnIndex) => <th key={columnIndex}>{column}</th>)}</tr></thead>
                          <tbody>
                            {message.rows.map((row, rowIndex) => (
                              <tr key={rowIndex}>
                                {(Array.isArray(row) ? row : []).map((cell, cellIndex) => (
                                  <td key={cellIndex}>{cell === null ? <span className={styles.nullCell}>NULL</span> : String(cell)}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </article>
            ))}
            {isLoading && (
              <div className={styles.loadingRow} aria-label="Pigeon is thinking">
                <PigeonMark className={styles.loadingMark} />
                <div className={styles.typing}><span /><span /><span /></div>
                <span className={styles.thinkingLabel}>Thinking through your question…</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className={styles.inputArea}>
        <form onSubmit={handleSubmit} className={styles.inputWrapper}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              event.target.style.height = 'auto';
              event.target.style.height = `${Math.min(event.target.scrollHeight, 130)}px`;
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="Ask a question about your data…"
            className={styles.input}
            disabled={isLoading}
            rows={1}
            aria-label="Ask a question about your data"
          />
          <button type="submit" disabled={isLoading || !input.trim()} className={styles.sendBtn} aria-label="Send question">
            <span>{isLoading ? 'Working…' : 'Ask Pigeon'}</span><b aria-hidden="true">↑</b>
          </button>
        </form>
        <div className={styles.inputHint}><span>↵</span> to ask <i /> <span>shift + ↵</span> for a new line <span className={styles.inputDisclaimer}>Pigeon can make mistakes. Check important results.</span></div>
      </div>
    </section>
  );
}
