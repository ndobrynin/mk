import type { CSSProperties, ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { ru } from "../i18n/ru";
import "../ui/menu.css";

const CITY_BG_WIDTH = 1921;
const CITY_BG_HEIGHT = 1082;

const screenStyle: CSSProperties = {
  position: "relative",
  width: "100%",
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
};

const titleStyle: CSSProperties = {
  position: "absolute",
  top: "24.4%",
  left: "50%",
  transform: "translateX(-50%)",
  margin: 0,
  width: "59%",
  fontSize: "clamp(4.5rem, 8.7vw, 10.4rem)",
  lineHeight: 0.95,
};

const buttonsStyle: CSSProperties = {
  position: "absolute",
  top: "49.08%",
  left: "50%",
  transform: "translateX(-50%)",
  display: "flex",
  flexDirection: "column",
  gap: 30,
  alignItems: "center",
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
      <h1 className="menu-title" style={titleStyle}>
        {ru.common.appName}
      </h1>
      <div style={buttonsStyle}>
        <button type="button" className="menu-cta" onClick={() => navigate("/local")}>
          {ru.home.localPlay}
        </button>
        <button type="button" className="menu-cta" disabled aria-disabled="true">
          {ru.home.networkPlay}
        </button>
      </div>
    </main>
  );
}
