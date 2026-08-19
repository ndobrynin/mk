import type { ReactElement, ReactNode } from "react";
import styles from "./CityBackdrop.module.scss";

const CITY_BG_WIDTH = 1921;
const CITY_BG_HEIGHT = 1082;
const STADIUM_WIDTH = 1760;
const STADIUM_HEIGHT = 1242;

interface CityBackdropProps {
  stadium?: boolean;
  children: ReactNode;
}

export function CityBackdrop({ stadium = false, children }: CityBackdropProps): ReactElement {
  return (
    <main className={styles.screen}>
      <img
        className={styles.city}
        src="/city-bg.png"
        alt=""
        width={CITY_BG_WIDTH}
        height={CITY_BG_HEIGHT}
      />
      {stadium ? (
        <img
          className={styles.stadium}
          src="/stadium-overlay.svg"
          alt=""
          width={STADIUM_WIDTH}
          height={STADIUM_HEIGHT}
        />
      ) : null}
      {children}
    </main>
  );
}
