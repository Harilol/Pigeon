export const AI_PROVIDERS = {
  openrouter: {
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    keyLabel: 'OpenRouter API key',
    keyUrl: 'https://openrouter.ai/keys',
    modelsUrl: 'https://openrouter.ai/models?supported_parameters=tools',
    models: [
      { id: 'openai/gpt-4.1-mini', label: 'GPT-4.1 mini' },
      { id: 'openai/gpt-4o-mini', label: 'GPT-4o mini' },
    ],
  },
  openai: {
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    keyLabel: 'OpenAI API key',
    keyUrl: 'https://platform.openai.com/api-keys',
    modelsUrl: 'https://platform.openai.com/docs/models',
    models: [
      { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
      { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
    ],
  },
  gemini: {
    label: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    keyLabel: 'Gemini API key',
    keyUrl: 'https://aistudio.google.com/apikey',
    modelsUrl: 'https://ai.google.dev/gemini-api/docs/models',
    models: [
      { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash' },
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    ],
  },
  anthropic: {
    label: 'Anthropic Claude',
    baseUrl: 'https://api.anthropic.com/v1/',
    keyLabel: 'Anthropic API key',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    modelsUrl: 'https://platform.claude.com/docs/en/about-claude/models/overview',
    models: [
      { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
      { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
    ],
  },
};

export const DEFAULT_PROVIDER = 'openrouter';
