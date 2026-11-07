// Saved games and settings in localStorage (prefix 'rumbo.'). Each player has a profile (name + avatar look)
// and her own saved game, so Mariel and Luciana can play on the same device. Every access is wrapped in
// try/catch: private browsing or a full storage never breaks the game, it just doesn't save.

const PROFILES_KEY = 'rumbo.profiles.v1';
const CURRENT_KEY = 'rumbo.current.v1';
const SETTINGS_KEY = 'rumbo.settings.v1';
const saveKey = (id) => `rumbo.save.${id}`;

const read = (key, fallback) => {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
};
const write = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
};
const remove = (key) => { try { localStorage.removeItem(key); } catch { /* storage blocked */ } };

export const profiles = () => {
  const list = read(PROFILES_KEY, []);
  return Array.isArray(list) ? list : [];
};
export const currentId = () => read(CURRENT_KEY, null);
export const currentProfile = () => profiles().find((p) => p.id === currentId()) || null;
export const playerName = () => currentProfile()?.name || 'Guitarrista';

export function selectProfile(id) { write(CURRENT_KEY, id); }

export function createProfile(name, look) {
  const list = profiles();
  const id = `p${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
  list.push({ id, name: String(name || '').trim().slice(0, 16) || 'Guitarrista', look: look || {}, created: Date.now() });
  write(PROFILES_KEY, list);
  selectProfile(id);
  return id;
}

export function updateProfile(id, patch) {
  write(PROFILES_KEY, profiles().map((p) => (p.id === id ? { ...p, ...patch } : p)));
}

export function deleteProfile(id) {
  write(PROFILES_KEY, profiles().filter((p) => p.id !== id));
  remove(saveKey(id));
  if (currentId() === id) remove(CURRENT_KEY);
}

export const loadGameOf = (id) => read(saveKey(id), null);
export const writeGameOf = (id, s) => write(saveKey(id), s);

export function loadGame() {
  const id = currentId();
  return id ? read(saveKey(id), null) : null;
}

export function saveGame(s) {
  const id = currentId();
  return !!id && write(saveKey(id), s);
}

export function deleteGame() {
  const id = currentId();
  if (id) remove(saveKey(id));
}

// ?borrar=1: wipes every profile, saved game and setting of this game on this device.
export function wipeAll() {
  for (const p of profiles()) remove(saveKey(p.id));
  [PROFILES_KEY, CURRENT_KEY, SETTINGS_KEY].forEach(remove);
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith('rumbo.')) localStorage.removeItem(k);
    }
  } catch { /* storage blocked */ }
}

export function loadSettings() {
  const saved = read(SETTINGS_KEY, {});
  return { sound: true, music: true, ...(saved && typeof saved === 'object' ? saved : {}) };
}

export function saveSettings(settings) { write(SETTINGS_KEY, settings); }
