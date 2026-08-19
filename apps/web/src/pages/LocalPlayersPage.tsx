import { useState, type CSSProperties, type FormEvent, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { ru } from "../i18n/ru";
import { avatarById, pickAvatarId } from "../ui/local-avatars";
import "../ui/menu.css";

const MAX_PLAYERS = 4;
const CITY_BG_WIDTH = 1921;
const CITY_BG_HEIGHT = 1082;
const STADIUM_WIDTH = 1760;
const STADIUM_HEIGHT = 1242;

interface LocalPlayer {
  id: string;
  name: string;
  avatarId: string;
}

const screenStyle: CSSProperties = {
  position: "relative",
  minHeight: "100vh",
  minWidth: "1024px",
  overflow: "hidden",
  background: "#1c1c1c",
};

const cityBgStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
  zIndex: 0,
};

const stadiumStyle: CSSProperties = {
  position: "absolute",
  left: "4.166%",
  top: "-8.087%",
  width: "91.667%",
  height: "114.787%",
  pointerEvents: "none",
  zIndex: 1,
};

const menuButtonStyle: CSSProperties = {
  position: "absolute",
  top: 40,
  left: 28,
  zIndex: 2,
};

const contentStyle: CSSProperties = {
  position: "relative",
  zIndex: 2,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  paddingTop: 140,
  minHeight: "100vh",
  boxSizing: "border-box",
};

const headingStyle: CSSProperties = {
  margin: 0,
  width: 739,
};

const formStyle: CSSProperties = {
  display: "flex",
  gap: 18,
  marginTop: 40,
  alignItems: "center",
};

const startStyle: CSSProperties = {
  marginTop: 48,
};

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
    <main style={screenStyle}>
      <img
        src="/city-bg.png"
        alt=""
        width={CITY_BG_WIDTH}
        height={CITY_BG_HEIGHT}
        style={cityBgStyle}
      />
      <img
        src="/stadium-overlay.svg"
        alt=""
        width={STADIUM_WIDTH}
        height={STADIUM_HEIGHT}
        style={stadiumStyle}
      />
      <button type="button" className="menu-chip" style={menuButtonStyle} onClick={() => navigate("/")}>
        {ru.localPlayers.menu}
      </button>
      <div style={contentStyle}>
        <h1 className="menu-heading" style={headingStyle}>
          {ru.localPlayers.title}
        </h1>
        <form style={formStyle} onSubmit={handleAdd}>
          <input
            id="local-player-name"
            className="menu-field"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={ru.localPlayers.namePlaceholder}
            aria-label={ru.localPlayers.namePlaceholder}
          />
          <button type="submit" className="menu-add" disabled={atCapacity}>
            {ru.localPlayers.add}
          </button>
        </form>
        {players.length > 0 ? (
          <>
            <h2 className="menu-registered">{ru.localPlayers.registered}</h2>
            <ul className="player-row">
              {players.map((player) => {
                const avatar = avatarById(player.avatarId);
                return (
                  <li key={player.id} className="player-card">
                    <p className="player-name">{player.name}</p>
                    <div className="player-avatar">
                      <span
                        className="player-avatar-fallback"
                        role="img"
                        style={{ background: avatar.background }}
                        aria-label={avatar.label}
                      >
                        {avatar.glyph}
                      </span>
                      <button
                        type="button"
                        className="player-remove"
                        aria-label={`${ru.localPlayers.remove}: ${player.name}`}
                        onClick={() => handleRemove(player.id)}
                      >
                        ×
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        ) : null}
        <button type="button" className="menu-cta" style={startStyle} disabled aria-disabled="true">
          {ru.localPlayers.start}
        </button>
      </div>
    </main>
  );
}
