import type { ReactElement } from "react";
import { ru } from "../i18n/ru";

interface GameOverBannerProps {
  winnerId?: string;
  selfId?: string;
}

export function GameOverBanner({ winnerId, selfId }: GameOverBannerProps): ReactElement {
  const isSelfWinner = winnerId !== undefined && winnerId === selfId;

  return (
    <section role="alertdialog" aria-label={ru.gameOver.title}>
      <h2>{ru.gameOver.title}</h2>
      <p>{isSelfWinner ? ru.gameOver.youWon : ru.gameOver.someoneWon}</p>
      {winnerId ? <p>{winnerId}</p> : null}
    </section>
  );
}
