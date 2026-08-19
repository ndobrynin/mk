import { useState, type FormEvent, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { ru } from "../i18n/ru";
import { CityBackdrop } from "../ui/CityBackdrop";
import { DisplayTitle } from "../ui/DisplayTitle";
import { PlayerCard } from "../ui/PlayerCard";
import { UiButton } from "../ui/UiButton";
import { UiField } from "../ui/UiField";
import { avatarById, pickAvatarId } from "../ui/local-avatars";
import styles from "./LocalPlayersPage.module.scss";

const MAX_PLAYERS = 4;

interface LocalPlayer {
  id: string;
  name: string;
  avatarId: string;
}

export function LocalPlayersPage(): ReactElement {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [players, setPlayers] = useState<LocalPlayer[]>([]);
  const atCapacity = players.length >= MAX_PLAYERS;

  function handleAdd(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || atCapacity) {
      return;
    }
    setPlayers((current) => [
      ...current,
      {
        id: `${trimmed}-${current.length}-${Date.now()}`,
        name: trimmed,
        avatarId: pickAvatarId(current.map((player) => player.avatarId)),
      },
    ]);
    setName("");
  }

  function handleRemove(id: string): void {
    setPlayers((current) => current.filter((player) => player.id !== id));
  }

  return (
    <CityBackdrop stadium>
      <UiButton variant="chip" className={styles.menu} onClick={() => navigate("/")}>
        {ru.localPlayers.menu}
      </UiButton>
      <div className={styles.content}>
        <DisplayTitle className={styles.title}>{ru.localPlayers.title}</DisplayTitle>
        <form className={styles.form} onSubmit={handleAdd}>
          <UiField
            id="local-player-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={ru.localPlayers.namePlaceholder}
            aria-label={ru.localPlayers.namePlaceholder}
          />
          <UiButton type="submit" variant="add" disabled={atCapacity}>
            {ru.localPlayers.add}
          </UiButton>
        </form>
        {players.length > 0 ? (
          <>
            <DisplayTitle as="h2" tone="section" className={styles.registered}>
              {ru.localPlayers.registered}
            </DisplayTitle>
            <ul className={styles.row}>
              {players.map((player) => (
                <PlayerCard
                  key={player.id}
                  name={player.name}
                  avatar={avatarById(player.avatarId)}
                  removeLabel={`${ru.localPlayers.remove}: ${player.name}`}
                  onRemove={() => handleRemove(player.id)}
                />
              ))}
            </ul>
          </>
        ) : null}
        <UiButton className={styles.start} disabled>
          {ru.localPlayers.start}
        </UiButton>
      </div>
    </CityBackdrop>
  );
}
