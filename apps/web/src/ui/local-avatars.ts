export interface Avatar {
  id: "cat" | "onigiri" | "fugu" | "girl";
  label: string;
  glyph: string;
}

export const LOCAL_AVATARS: readonly Avatar[] = [
  { id: "cat", label: "Бизнес Кот", glyph: "🐱" },
  { id: "onigiri", label: "Онигири", glyph: "🍙" },
  { id: "fugu", label: "Робот Фугу", glyph: "🐡" },
  { id: "girl", label: "Радуга", glyph: "👧" },
];

export function pickAvatarId(taken: readonly string[]): Avatar["id"] {
  const free = LOCAL_AVATARS.filter((avatar) => !taken.includes(avatar.id));
  const pool = free.length > 0 ? free : LOCAL_AVATARS;
  const index = Math.floor(Math.random() * pool.length);
  return pool[index]?.id ?? LOCAL_AVATARS[0].id;
}

export function avatarById(id: string): Avatar {
  return LOCAL_AVATARS.find((avatar) => avatar.id === id) ?? LOCAL_AVATARS[0];
}
