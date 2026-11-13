export const providers = [
  {
    value: 'gemini', label: 'Gemini', keysUrl: 'https://aistudio.google.com/app/apikey',
    models: ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-pro-preview'],
  },
  {
    value: 'openai', label: 'OpenAI', keysUrl: 'https://platform.openai.com/settings/organization/api-keys', hasEndpoint: true,
    models: ['gpt-6-astra', 'gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.6-luna', 'gpt-5.5', 'gpt-5.4-mini'],
  },
  {
    value: 'deepseek', label: 'DeepSeek', keysUrl: 'https://platform.deepseek.com/api_keys',
    models: ['deepseek-flash', 'deepseek-v4-pro'],
  },
  {
    value: 'sumopod', label: 'Sumopod', keysUrl: 'https://sumopod.com/dashboard/ai/keys',
    models: ['gemini/gemini-3.5-flash', 'gemini/gemini-3.1-pro-preview', 'gemini/gemini-3.1-flash-lite', 'gpt-5.4', 'gpt-5.4-mini', 'gpt-5.4-nano'],
  },
  {
    value: 'zai', label: 'Z.ai', keysUrl: 'https://z.ai/manage-apikey/apikey-list',
    models: ['glm-5.3', 'glm-5.3-flash', 'glm-5.2', 'glm-5.1', 'glm-5', 'glm-4.7'],
  },
  {
    value: 'zai_code', label: 'Z.ai (Coding Plan)', keysUrl: 'https://z.ai/manage-apikey/apikey-list',
    models: ['glm-5.3', 'glm-5.3-flash', 'glm-5.2', 'glm-5.1', 'glm-5', 'glm-4.7'],
  },
  {
    value: '9router', label: '9router', keysUrl: 'https://github.com/decolua/9router#readme', hasEndpoint: true,
    models: ['openai/gpt-5.6-terra', 'openai/gpt-5.6-luna', 'alicode/qwen3.7-plus', 'alicode/kimi-k2.5', 'ds/deepseek-v4-pro', 'anthropic/claude-sonnet-5'],
  },
  {
    value: 'openrouter', label: 'OpenRouter', keysUrl: 'https://openrouter.ai/workspaces/default/keys',
    models: ['openrouter/fusion', 'openrouter/free', 'openai/gpt-6-astra', 'google/gemini-3.8-flash', 'anthropic/claude-sonnet-5', 'deepseek/deepseek-v4.1-flash'],
  },
  {
    value: 'anthropic', label: 'Anthropic (Claude)', keysUrl: 'https://platform.claude.com/settings/keys',
    models: ['claude-fable-5-2', 'claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5', 'claude-opus-5', 'claude-sonnet-5'],
  },
]
