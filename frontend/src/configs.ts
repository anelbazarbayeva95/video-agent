export interface SavedConfig {
  id: string;
  name: string;
  prompt: string;
  createdAt: number;
}

const KEY = "video-agent-configs";

export function loadConfigs(): SavedConfig[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveConfig(name: string, prompt: string): SavedConfig {
  const configs = loadConfigs();
  const config: SavedConfig = {
    id: crypto.randomUUID(),
    name,
    prompt,
    createdAt: Date.now(),
  };
  configs.unshift(config);
  localStorage.setItem(KEY, JSON.stringify(configs));
  return config;
}

export function deleteConfig(id: string): void {
  const configs = loadConfigs().filter((c) => c.id !== id);
  localStorage.setItem(KEY, JSON.stringify(configs));
}
