import styles from './Sidebar.module.css';

function HistoryIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 8a8 8 0 1 1-.2 5" /><path d="M3 3v5h5m4-1v5l3 2" /></svg>;
}

export default function Sidebar({ conversations, activeChatId, onNewChat, onSelectChat, disabled }) {
  return (
    <aside className={styles.sidebar} aria-label="Conversation history">
      <div className={styles.header}>
        <div className={styles.headerText}>
          <span className={styles.overline}>YOUR WORKSPACE</span>
          <span className={styles.title}>History</span>
        </div>
        <button className={styles.newBtn} onClick={onNewChat} disabled={disabled}>
          <span aria-hidden="true">+</span> New chat
        </button>
      </div>
      {conversations.length ? (
        <div className={styles.conversationList}>
          <span className={styles.listLabel}>RECENT</span>
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              className={`${styles.conversation} ${conversation.id === activeChatId ? styles.conversationActive : ''}`}
              onClick={() => onSelectChat(conversation)}
              disabled={disabled}
              title={conversation.title}
            >
              <span className={styles.conversationIcon}><HistoryIcon /></span>
              <span className={styles.conversationTitle}>{conversation.title}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}><HistoryIcon /></span>
          <strong>No conversations yet</strong>
          <p>Your questions and answers will appear here as you explore.</p>
        </div>
      )}
      <div className={styles.sidebarFooter}>
        <span className={styles.footerStatus} />
        <span>Saved in this browser</span>
      </div>
    </aside>
  );
}
