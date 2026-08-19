import type { CSSProperties, ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { ru } from "../i18n/ru";

const CITY_BG_WIDTH = 1448;
const CITY_BG_HEIGHT = 1086;

const MENU_BUTTON_WIDTH = 655;
const MENU_BUTTON_HEIGHT = 129;

const screenStyle: CSSProperties = {
  position: "relative",
  minHeight: "100vh",
  minWidth: "1024px",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "1.875rem",
  boxSizing: "border-box",
  padding: "8rem 1.5rem 4rem",
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

const titleStyle: CSSProperties = {
  position: "relative",
  zIndex: 1,
  margin: 0,
  fontFamily: '"Banana Brick", Impact, "Arial Black", sans-serif',
  fontSize: "8.5rem",
  lineHeight: 1,
  fontWeight: 400,
  color: "#fff",
  textShadow: "0 4px 16px rgba(0, 0, 0, 0.35)",
  textAlign: "center",
};

const buttonsStyle: CSSProperties = {
  position: "relative",
  zIndex: 1,
  display: "flex",
  flexDirection: "column",
  gap: "1.875rem",
  alignItems: "center",
};

const menuButtonStyle: CSSProperties = {
  width: MENU_BUTTON_WIDTH,
  height: MENU_BUTTON_HEIGHT,
  border: "none",
  borderRadius: "1.5rem",
  background: "#8eaaab",
  color: "#fff",
  fontFamily: '"Montserrat", sans-serif',
  fontSize: "2.25rem",
  fontWeight: 700,
  cursor: "pointer",
};

const disabledMenuButtonStyle: CSSProperties = {
  ...menuButtonStyle,
  opacity: 0.45,
  cursor: "not-allowed",
};

export function HomePage(): ReactElement {
  const navigate = useNavigate();

  return (
    <main style={screenStyle}>
      <img
        src="/city-bg.png"
        alt=""
        width={CITY_BG_WIDTH}
        height={CITY_BG_HEIGHT}
        style={cityBgStyle}
      />
      <h1 style={titleStyle}>{ru.common.appName}</h1>
      <div style={buttonsStyle}>
        <button type="button" style={menuButtonStyle} onClick={() => navigate("/local")}>
          {ru.home.localPlay}
        </button>
        <button type="button" style={disabledMenuButtonStyle} disabled aria-disabled="true">
          {ru.home.networkPlay}
        </button>
      </div>
    </main>
  );
}
