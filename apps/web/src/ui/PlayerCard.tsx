import type { ReactElement } from "react";
import type { Avatar } from "./local-avatars";
import { UiButton } from "./UiButton";
import styles from "./PlayerCard.module.scss";

interface PlayerCardProps {
  name: string;
  avatar: Avatar;
  removeLabel: string;
  onRemove: () => void;
}

export function PlayerCard({ name, avatar, removeLabel, onRemove }: PlayerCardProps): ReactElement {
  return (
    <li className={styles.card}>
      <p className={styles.name}>{name}</p>
      <div className={styles.avatar}>
        <span className={styles.face} data-avatar={avatar.id} role="img" aria-label={avatar.label}>
          {avatar.glyph}
        </span>
        <UiButton variant="icon" className={styles.remove} aria-label={removeLabel} onClick={onRemove}>
          ×
        </UiButton>
      </div>
    </li>
  );
}
