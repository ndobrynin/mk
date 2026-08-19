import type { ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { ru } from "../i18n/ru";
import { CityBackdrop } from "../ui/CityBackdrop";
import { DisplayTitle } from "../ui/DisplayTitle";
import { UiButton } from "../ui/UiButton";
import styles from "./HomePage.module.scss";

export function HomePage(): ReactElement {
  const navigate = useNavigate();

  return (
    <CityBackdrop>
      <DisplayTitle tone="logo" className={styles.logo}>
        {ru.home.logo}
      </DisplayTitle>
      <div className={styles.actions}>
        <UiButton onClick={() => navigate("/local")}>{ru.home.localPlay}</UiButton>
        <UiButton disabled>{ru.home.networkPlay}</UiButton>
      </div>
    </CityBackdrop>
  );
}
