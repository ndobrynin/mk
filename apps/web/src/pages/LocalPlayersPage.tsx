import { useState, type CSSProperties, type FormEvent, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { ru } from "../i18n/ru";

const MAX_PLAYERS = 4;
const CITY_BG_WIDTH = 1448;
const CITY_BG_HEIGHT = 1086;
const STADIUM_WIDTH = 1760;
const STADIUM_HEIGHT = 1242;
const MENU_WIDTH = 142;
const MENU_HEIGHT = 60;
const NAME_INPUT_WIDTH = 259;
const NAME_INPUT_HEIGHT = 54;
const ADD_BUTTON_WIDTH = 172;
const ADD_BUTTON_HEIGHT = 54;

const screenStyle: CSSProperties = {
  position: "relative",
  minHeight: "100vh",
  minWidth: "1024px",
  overflow: "hidden",
  boxSizing: "border-box",
  fontFamily: '"Montserrat", sans-serif',
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
  width: MENU_WIDTH,
  height: MENU_HEIGHT,
  border: "none",
  borderRadius: "1.25rem",
  background: "#1c1c1c",
  color: "#fff",
  fontFamily: '"Montserrat", sans-serif',
  fontSize: "1.25rem",
  fontWeight: 600,
  cursor: "pointer",
};

const contentStyle: CSSProperties = {
  position: "relative",
  zIndex: 2,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  paddingTop: "8.1%",
  minHeight: "100vh",
  boxSizing: "border-box",
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontFamily: '"Banana Brick", Impact, "Arial Black", sans-serif',
  fontSize: "2.75rem",
  lineHeight: 1.2,
  fontWeight: 400,
  color: "#0176c0",
  textAlign: "center",
};

const formStyle: CSSProperties = {
  display: "flex",
  gap: "1.125rem",
  marginTop: "2.5rem",
  alignItems: "center",
};

const nameInputStyle: CSSProperties = {
  width: NAME_INPUT_WIDTH,
  height: NAME_INPUT_HEIGHT,
  boxSizing: "border-box",
  border: "none",
  borderRadius: "0.9rem",
  padding: "0 1.25rem",
  fontFamily: '"Montserrat", sans-serif',
  fontSize: "1.125rem",
  background: "#fff",
  color: "#1c1c1c",
};

const addButtonStyle: CSSProperties = {
  width: ADD_BUTTON_WIDTH,
  height: ADD_BUTTON_HEIGHT,
  border: "none",
  borderRadius: "0.9rem",
  background: "#8eaaab",
  color: "#fff",
  fontFamily: '"Montserrat", sans-serif',
  fontSize: "1.125rem",
  fontWeight: 600,
  cursor: "pointer",
};

const listStyle: CSSProperties = {
  listStyle: "none",
  margin: "6rem 0 0",
  padding: 0,
  display: "flex",
  gap: "4rem",
  justifyContent: "center",
  flexWrap: "wrap",
  maxWidth: "60rem",
  color: "#fff",
  fontSize: "1.25rem",
  fontWeight: 600,
  textAlign: "center",
};

export function LocalPlayersPage(): ReactElement {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [players, setPlayers] = useState<string[]>([]);
  const atCapacity = players.length >= MAX_PLAYERS;

  function handleAdd(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || atCapacity) {
      return;
    }
    setPlayers((current) => [...current, trimmed]);
    setName("");
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
      <button type="button" style={menuButtonStyle} onClick={() => navigate("/")}>
        {ru.localPlayers.menu}
      </button>
      <div style={contentStyle}>
        <h1 style={titleStyle}>{ru.localPlayers.title}</h1>
        <form style={formStyle} onSubmit={handleAdd}>
          <input
            id="local-player-name"
            style={nameInputStyle}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={ru.localPlayers.namePlaceholder}
            aria-label={ru.localPlayers.namePlaceholder}
          />
          <button type="submit" style={addButtonStyle} disabled={atCapacity}>
            {ru.localPlayers.add}
          </button>
        </form>
        <ul style={listStyle}>
          {players.map((player, index) => (
            <li key={`${player}-${index}`}>{player}</li>
          ))}
        </ul>
      </div>
    </main>
  );
}
