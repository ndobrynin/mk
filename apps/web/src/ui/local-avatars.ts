export interface Avatar {
  id: string;
  label: string;
  glyph: string;
  background: string;
}

export const LOCAL_AVATARS: readonly Avatar[] = [
  { id: "cat", label: "Бизнес Кот", glyph: "🐱", background: "#f4c27a" },
  { id: "onigiri", label: "Онигири", glyph: "🍙", background: "#d7c4f0" },
  { id: "fugu", label: "Робот Фугу", glyph: "🐡", background: "#9fd7c4" },
  { id: "girl", label: "Радуга", glyph: "👧", background: "#f5b4d2" },
];

export function pickAvatarId(taken: readonly string[]): string {
  const free = LOCAL_AVATARS.filter((avatar) => !taken.includes(avatar.id));
  const pool = free.length > 0 ? free : LOCAL_AVATARS;
  const index = Math.floor(Math.random() * pool.length);
  return pool[index]?.id ?? LOCAL_AVATARS[0].id;
}

export function avatarById(id: string): Avatar {
  return LOCAL_AVATARS.find((avatar) => avatar.id === id) ?? LOCAL_AVATARS[0];
}
