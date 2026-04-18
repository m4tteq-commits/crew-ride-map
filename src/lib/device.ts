// Persistent per-device identifier and profile (nickname + color) stored in localStorage.

const KEY_DEVICE = "dt_device_id";
const KEY_NICK = "dt_nickname";
const KEY_COLOR = "dt_color";
const KEY_ROOM = "dt_room_code";
const KEY_MAPBOX = "dt_mapbox_token";

export const COLORS = [
  "#22d3ee", // cyan
  "#a78bfa", // violet
  "#f472b6", // pink
  "#34d399", // emerald
  "#fbbf24", // amber
  "#f87171", // red
  "#60a5fa", // blue
  "#fb923c", // orange
];

export function getDeviceId(): string {
  let id = localStorage.getItem(KEY_DEVICE);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY_DEVICE, id);
  }
  return id;
}

export function getProfile() {
  return {
    nickname: localStorage.getItem(KEY_NICK) ?? "",
    color: localStorage.getItem(KEY_COLOR) ?? COLORS[0],
  };
}

export function saveProfile(nickname: string, color: string) {
  localStorage.setItem(KEY_NICK, nickname);
  localStorage.setItem(KEY_COLOR, color);
}

export function getRoomCode(): string | null {
  return localStorage.getItem(KEY_ROOM);
}
export function setRoomCode(code: string | null) {
  if (code) localStorage.setItem(KEY_ROOM, code);
  else localStorage.removeItem(KEY_ROOM);
}

export function getMapboxToken(): string | null {
  return localStorage.getItem(KEY_MAPBOX);
}
export function setMapboxToken(token: string) {
  localStorage.setItem(KEY_MAPBOX, token);
}

// Generate a friendly room code like BLUE-FOX-42
const WORDS_A = ["BLUE", "RED", "GOLD", "FAST", "WILD", "NEON", "MOON", "STAR"];
const WORDS_B = ["FOX", "BEAR", "WOLF", "HAWK", "LYNX", "PUMA", "OWL", "SHARK"];
export function generateRoomCode(): string {
  const a = WORDS_A[Math.floor(Math.random() * WORDS_A.length)];
  const b = WORDS_B[Math.floor(Math.random() * WORDS_B.length)];
  const n = Math.floor(Math.random() * 90 + 10);
  return `${a}-${b}-${n}`;
}
