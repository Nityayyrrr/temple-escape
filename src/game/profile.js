/* Profile persistence (localStorage) + shop catalogue. Plain JavaScript. */

const KEY = 'temple-escape-profile-v1';

export const defaultProfile = () => ({
  coins: 0,
  highScore: 0,
  bestDist: 0,
  totalRuns: 0,
  lifetimeCoins: 0,
  inventory: { shield: 0, magnet: 0, boost: 0, multiplier: 0 },
  magnetMastery: 0, // 0..3
  skinsOwned: ['explorer'],
  selectedSkin: 'explorer',
  muted: false,
});

export function loadProfile() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultProfile();
    const parsed = JSON.parse(raw);
    const base = defaultProfile();
    return {
      ...base,
      ...parsed,
      inventory: { ...base.inventory, ...(parsed.inventory ?? {}) },
      skinsOwned:
        parsed.skinsOwned && parsed.skinsOwned.length > 0
          ? parsed.skinsOwned
          : ['explorer'],
    };
  } catch {
    return defaultProfile();
  }
}

export function saveProfile(p) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable */
  }
}

/* ----------------------------- shop catalogue ---------------------------- */

export const CONSUMABLES = [
  {
    id: 'shield',
    name: 'Shield Charm',
    tagline: 'Start protected',
    desc: 'Begin the run with a spirit shield that absorbs one crash.',
    price: 150,
  },
  {
    id: 'magnet',
    name: 'Coin Magnet',
    tagline: 'Coins fly to you',
    desc: 'Start the run with a magnet pulling in every nearby coin.',
    price: 200,
  },
  {
    id: 'boost',
    name: 'Wings of Garuda',
    tagline: 'Fly past 1,500m',
    desc: 'Blast forward at insane speed, invincible and magnetic.',
    price: 250,
  },
  {
    id: 'multiplier',
    name: 'Golden Fleece',
    tagline: '2x score, all run',
    desc: 'Every meter and every coin counts double for the whole run.',
    price: 300,
  },
];

export const MAGNET_MASTERY_PRICES = [400, 900, 1800];
export const MAGNET_BASE_SEC = 8;
export const magnetDuration = (mastery) => MAGNET_BASE_SEC + mastery * 4;

export const SKINS = [
  {
    id: 'explorer',
    name: 'The Explorer',
    desc: 'Classic adventurer garb. Free, because you earned it just by showing up.',
    price: 0,
    colors: {
      skin: '#d99e6a',
      shirt: '#b2452e',
      pants: '#4a3b2c',
      hat: '#5f4222',
      pack: '#6e5230',
    },
  },
  {
    id: 'jade',
    name: 'Jade Warden',
    desc: 'Blessed by the jungle spirits. Runs quieter than your conscience.',
    price: 500,
    colors: {
      skin: '#d99e6a',
      shirt: '#1fae8c',
      pants: '#123f34',
      hat: '#0e6b52',
      pack: '#0f3f30',
    },
  },
  {
    id: 'crimson',
    name: 'Crimson Raider',
    desc: 'Runs on pure adrenaline and the tears of volcano monks.',
    price: 800,
    colors: {
      skin: '#c98a5a',
      shirt: '#c22f3d',
      pants: '#33121a',
      hat: '#7d1521',
      pack: '#42121c',
    },
  },
  {
    id: 'sun',
    name: 'Sun God',
    desc: 'Literal legend. Coins practically collect themselves around this aura.',
    price: 1500,
    colors: {
      skin: '#e8b04b',
      shirt: '#f2c437',
      pants: '#8a5a10',
      hat: '#c98d12',
      pack: '#7a520c',
    },
  },
];

export const skinById = (id) => SKINS.find((s) => s.id === id) ?? SKINS[0];
