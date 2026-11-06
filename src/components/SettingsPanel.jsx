import styles from './SettingsPanel.module.css';
import { AI_PROVIDERS } from '../providers';

function SettingInput({ label, name, value, onChange, type = 'text', autoComplete }) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={`setting-${name}`}>{label}</label>
      <input id={`setting-${name}`} type={type} name={name} value={value} onChange={onChange} className={styles.input} autoComplete={autoComplete} />
    </div>
  );
}

export default function SettingsPanel({ dbConfig, setDbConfig, aiConfig, setAiConfig, onConnect, isConnecting, connectionStatus }) {
  const selectedProvider = AI_PROVIDERS[aiConfig.provider] ?? AI_PROVIDERS.openrouter;
  const selectedApiKey = aiConfig.apiKeys[aiConfig.provider] ?? '';
  const isPresetModel = selectedProvider.models.some(({ id }) => id === aiConfig.model);
  const isCustomModel = aiConfig.model === '__custom__' || (!isPresetModel && aiConfig.model !== '');

  const handleDbChange = (e) => setDbConfig({ ...dbConfig, [e.target.name]: e.target.value });
  const handleProviderChange = (e) => {
    const provider = e.target.value;
    setAiConfig((current) => ({
      ...current,
      provider,
      model: '',
    }));
  };
  const handleApiKeyChange = (e) => {
    const apiKey = e.target.value;
    setAiConfig((current) => ({
      ...current,
      apiKeys: { ...current.apiKeys, [current.provider]: apiKey },
    }));
  };
  const handleModelChange = (e) => {
    const model = e.target.value;
    setAiConfig((current) => ({
      ...current,
      model,
    }));
  };

  return (
    <div className={styles.panel}>
      {connectionStatus.message && (
        <div
          className={`${styles.status} ${connectionStatus.error ? styles.statusErr : styles.statusOk}`}
          role={connectionStatus.error ? 'alert' : 'status'}
        >
          <span className={styles.statusIndicator} />{connectionStatus.message}
        </div>
      )}
      {/* DB Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <span className={styles.sectionIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <ellipse cx="12" cy="5" rx="8" ry="3" />
              <path d="M4 5v7c0 1.66 3.58 3 8 3s8-1.34 8-3V5M4 12v7c0 1.66 3.58 3 8 3 1.4 0 2.72-.16 3.86-.43" />
            </svg>
          </span>
          <span>Database<small>Connection details</small></span>
        </h2>
        <div className={styles.fieldGroup}>
          <SettingInput label="Host" name="host" value={dbConfig.host} onChange={handleDbChange} />
          <SettingInput label="Username" name="user" value={dbConfig.user} onChange={handleDbChange} />
          <SettingInput label="Password" name="pass" value={dbConfig.pass} onChange={handleDbChange} type="password" />
          <div className={styles.fieldRow}>
            <SettingInput label="Database" name="dbname" value={dbConfig.dbname} onChange={handleDbChange} />
            <SettingInput label="Port" name="port" value={dbConfig.port} onChange={handleDbChange} />
          </div>
        </div>
        <button onClick={onConnect} disabled={isConnecting} className={styles.connectBtn}>
          <span>{isConnecting ? 'Connecting…' : 'Connect database'}</span><span aria-hidden="true">→</span>
        </button>
      </div>

      {/* AI Section */}
      <div className={`${styles.section} ${styles.lastSection}`}>
        <h2 className={styles.sectionTitle}>
          <span className={`${styles.sectionIcon} ${styles.aiIcon}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m12 3 1.55 5.45L19 10l-5.45 1.55L12 17l-1.55-5.45L5 10l5.45-1.55L12 3Z" />
              <path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" />
            </svg>
          </span>
          <span>AI provider<small>Choose a provider and model</small></span>
        </h2>
        <div className={styles.fieldGroup}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="setting-provider">Provider</label>
            <select id="setting-provider" className={styles.input} value={aiConfig.provider} onChange={handleProviderChange}>
              {Object.entries(AI_PROVIDERS).map(([id, provider]) => (
                <option key={id} value={id}>{provider.label}</option>
              ))}
            </select>
          </div>
          <SettingInput
            label={selectedProvider.keyLabel}
            name="apiKey"
            value={selectedApiKey}
            onChange={handleApiKeyChange}
            type="password"
            autoComplete="new-password"
          />
          <div className={styles.field}>
            <label className={styles.label} htmlFor="setting-model">Model</label>
            <select id="setting-model" className={styles.input} value={isPresetModel ? aiConfig.model : isCustomModel ? '__custom__' : ''} onChange={handleModelChange}>
              <option value="" disabled>Choose a model…</option>
              {selectedProvider.models.map(({ id, label }) => (
                <option key={id} value={id}>{label}</option>
              ))}
              <option value="__custom__">Custom model ID…</option>
            </select>
          </div>
          {isCustomModel && (
            <SettingInput
              label="Custom model ID"
              name="customModel"
              value={aiConfig.model === '__custom__' ? '' : aiConfig.model}
              onChange={(e) => setAiConfig((current) => ({ ...current, model: e.target.value }))}
              autoComplete="off"
            />
          )}
        </div>
        <p className={styles.hint}>
          Choose a model that supports <b>tool calling</b>.<br/>
          <a href={selectedProvider.keyUrl} target="_blank" rel="noreferrer">Get an API key ↗</a>
          <span className={styles.hintDivider}>·</span>
          <a href={selectedProvider.modelsUrl} target="_blank" rel="noreferrer">Browse models ↗</a>
        </p>
      </div>
      <div className={styles.settingsFootnote}>
        <span className={styles.footnoteMark}>i</span>
        <p>Credentials stay in workspace memory. Theme and conversation history are saved in this browser.</p>
      </div>
    </div>
  );
}