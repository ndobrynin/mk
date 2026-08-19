import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactElement } from "react";
import { useParams } from "react-router-dom";
import { GameOverBanner } from "../components/GameOverBanner";
import { CatalogCard, catalogCardName, ShopOverlay } from "../components/ShopOverlay";
import { ru } from "../i18n/ru";
import { getAccessToken } from "../lib/auth-storage";
import {
  createGameSocket,
  decodeJwtSubject,
  type GameCommandName,
  type GameEvent,
  type GameOverPayload,
  type GameSnapshot,
  type GameSocket,
  type PlayerView,
} from "../lib/socket";

const BUILD_PHASE = "build";
const PICK_PLAYER_PHASES = ["pickMovingCompanyPlayer", "pickBusinessCenterPlayer", "pickTvStationPlayer"];
const PICK_OWN_CARD_PHASES = ["pickMovingCompanyCard", "pickBusinessCenterOwnCard"];
const PICK_ESTABLISHMENT_TYPE_PHASES = ["pickRenovationType", "pickConferenceType"];
const SKIPPABLE_PICK_PHASES = ["pickBusinessCenterPlayer", "pickBusinessCenterOwnCard", "pickBusinessCenterTheirCard"];

type EdgeArea = "top" | "left" | "right";

const tableStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(12rem, 1fr) minmax(20rem, 2fr) minmax(12rem, 1fr)",
  gridTemplateRows: "auto auto 1fr auto",
  gridTemplateAreas: `"header header header" "top top top" "left market right" "bottom bottom bottom"`,
  minHeight: "100vh",
  minWidth: "1024px",
  gap: "0.75rem",
  padding: "0.75rem",
  boxSizing: "border-box",
};

function edgeForOpponent(index: number, total: number): EdgeArea {
  if (total <= 1) {
    return "top";
  }
  if (total === 2) {
    return index === 0 ? "left" : "right";
  }
  if (index === 0) {
    return "left";
  }
  if (index === 1) {
    return "top";
  }
  return "right";
}

function cardIdsFromEvents(events: GameEvent[]): Set<string> {
  const ids = new Set<string>();

  for (const event of events) {
    for (const key of ["cardId", "landmarkId", "cardA", "cardB"] as const) {
      const value = event[key];
      if (typeof value === "string") {
        ids.add(value);
      }
    }
  }

  return ids;
}

function PlayerCity({
  player,
  isSelf,
  isActive,
  highlightedIds,
}: {
  player: PlayerView;
  isSelf: boolean;
  isActive: boolean;
  highlightedIds: ReadonlySet<string>;
}): ReactElement {
  return (
    <section aria-label={isSelf ? ru.table.yourCityTitle : player.id}>
      <h3>{isSelf ? ru.table.yourCityTitle : player.id}</h3>
      {isActive ? <p>{ru.table.activePlayerLabel}</p> : null}
      <p>
        {ru.table.coinsLabel}: {player.coins}
      </p>
      <ul>
        {player.establishments.map((establishment, index) => (
          <li key={`${establishment.id}-${index}`}>
            <CatalogCard cardId={establishment.id} highlighted={highlightedIds.has(establishment.id)} />
          </li>
        ))}
      </ul>
      <h4>{ru.table.landmarksTitle}</h4>
      <ul>
        {player.landmarks.map((landmark) => (
          <li key={landmark.id}>
            <CatalogCard cardId={landmark.id} highlighted={highlightedIds.has(landmark.id)}>
              {landmark.constructed ? <p>{ru.table.constructedLabel}</p> : null}
            </CatalogCard>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function GameTablePage(): ReactElement {
  const { roomId } = useParams<{ roomId: string }>();
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [gameOver, setGameOver] = useState<GameOverPayload | null>(null);
  const [highlightedIds, setHighlightedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [serverError, setServerError] = useState<string | null>(null);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [selectedDiceIndices, setSelectedDiceIndices] = useState<number[]>([]);
  const socketRef = useRef<GameSocket | null>(null);
  const selfId = useMemo(() => decodeJwtSubject(getAccessToken()), []);

  useEffect(() => {
    if (!roomId) {
      return;
    }

    const socket = createGameSocket(roomId);
    socketRef.current = socket;

    const handleSnapshot = (state: GameSnapshot): void => {
      setSnapshot(state);
      setHighlightedIds(new Set());
      setSelectedDiceIndices([]);
      if (state.phase !== BUILD_PHASE) {
        setIsShopOpen(false);
      }
    };
    const handleEvents = (events: GameEvent[]): void => {
      setHighlightedIds(cardIdsFromEvents(events));
    };
    const handleGameOver = (payload: GameOverPayload): void => setGameOver(payload);
    const handleError = (payload: { message: string }): void => setServerError(payload.message);

    socket.on("game.snapshot", handleSnapshot);
    socket.on("game.events", handleEvents);
    socket.on("game.over", handleGameOver);
    socket.on("error", handleError);

    return () => {
      socket.off("game.snapshot", handleSnapshot);
      socket.off("game.events", handleEvents);
      socket.off("game.over", handleGameOver);
      socket.off("error", handleError);
      socket.disconnect();
    };
  }, [roomId]);

  const sendCommand = useCallback(async (name: GameCommandName, payload?: Record<string, unknown>): Promise<void> => {
    const socket = socketRef.current;
    if (!socket) {
      return;
    }

    setServerError(null);
    const result = payload === undefined ? await socket.sendCommand(name) : await socket.sendCommand(name, payload);

    if (!result.ok) {
      setServerError(result.error ?? ru.table.commandError);
    }
  }, []);

  if (!snapshot) {
    return <p>{serverError ?? ru.table.connecting}</p>;
  }

  const view: GameSnapshot = snapshot;
  const players = view.players;
  const activeIndex = snapshot.activeIndex ?? 0;
  const activePlayer = players[activeIndex];
  const isMyTurn = activePlayer !== undefined && activePlayer.id === selfId;
  const self = players.find((player) => player.id === selfId);
  const opponents = players.filter((player) => player.id !== selfId);
  const hasStation = self?.landmarks.some((landmark) => landmark.id === "station" && landmark.constructed) ?? false;
  const hasAquaPark = self?.landmarks.some((landmark) => landmark.id === "aqua-park" && landmark.constructed) ?? false;
  const showGameOver = gameOver !== null || view.phase === "gameOver";
  const winnerId = gameOver?.winnerId ?? view.winnerId;

  function toggleDiceIndex(index: number): void {
    setSelectedDiceIndices((current) => {
      if (current.includes(index)) {
        return current.filter((value) => value !== index);
      }
      if (current.length >= 2) {
        return current;
      }
      const next = [...current, index];
      if (next.length === 2) {
        void sendCommand("keepTwo", { indices: next });
      }
      return next;
    });
  }

  function renderPhaseActions(): ReactElement | null {
    if (!isMyTurn) {
      return null;
    }

    switch (view.phase) {
      case "rolling":
        return (
          <div>
            {hasStation || hasAquaPark ? (
              <button type="button" onClick={() => sendCommand("chooseDiceCount", { count: 2 })}>
                {ru.table.chooseDiceCount2}
              </button>
            ) : null}
            {hasAquaPark ? (
              <>
                <button type="button" onClick={() => sendCommand("chooseDiceCount", { count: 1 })}>
                  {ru.table.chooseDiceCount1}
                </button>
                <button type="button" onClick={() => sendCommand("chooseDiceCount", { count: 3 })}>
                  {ru.table.chooseDiceCount3}
                </button>
              </>
            ) : null}
            <button type="button" onClick={() => sendCommand("roll")}>
              {ru.table.rollButton}
            </button>
          </div>
        );
      case "chooseTwoOfThree":
        return (
          <div>
            <p>{ru.table.keepTwoHint}</p>
            <ul>
              {(view.threeDice ?? []).map((value, index) => (
                <li key={index}>
                  <button
                    type="button"
                    aria-pressed={selectedDiceIndices.includes(index)}
                    onClick={() => toggleDiceIndex(index)}
                  >
                    {value}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      case "decideReroll":
        return (
          <div>
            <button type="button" onClick={() => sendCommand("reroll")}>
              {ru.table.rerollButton}
            </button>
            <button type="button" onClick={() => sendCommand("keepRoll")}>
              {ru.table.keepRollButton}
            </button>
          </div>
        );
      case "decideHarbor":
        return (
          <div>
            <button type="button" onClick={() => sendCommand("harborAdd")}>
              {ru.table.harborAddButton}
            </button>
            <button type="button" onClick={() => sendCommand("harborSkip")}>
              {ru.table.harborSkipButton}
            </button>
          </div>
        );
      case BUILD_PHASE:
        return (
          <div>
            <button type="button" onClick={() => setIsShopOpen(true)}>
              {ru.table.openShopButton}
            </button>
            <button type="button" onClick={() => sendCommand("passBuild")}>
              {ru.table.passBuildButton}
            </button>
          </div>
        );
      case "endOfTurn":
        return (
          <div>
            <button type="button" onClick={() => sendCommand("ventureFundDeposit")}>
              {ru.table.ventureFundDepositButton}
            </button>
            <button type="button" onClick={() => sendCommand("skip")}>
              {ru.table.endTurnSkipButton}
            </button>
          </div>
        );
      default:
        if (PICK_PLAYER_PHASES.includes(view.phase)) {
          return (
            <div>
              <p>{ru.table.pickPlayerTitle}</p>
              <ul>
                {opponents.map((opponent) => (
                  <li key={opponent.id}>
                    <button type="button" onClick={() => sendCommand("pickPlayer", { playerId: opponent.id })}>
                      {opponent.id}
                    </button>
                  </li>
                ))}
              </ul>
              {SKIPPABLE_PICK_PHASES.includes(view.phase) ? (
                <button type="button" onClick={() => sendCommand("skip")}>
                  {ru.table.skipButton}
                </button>
              ) : null}
            </div>
          );
        }
        if (PICK_OWN_CARD_PHASES.includes(view.phase)) {
          return (
            <div>
              <p>{ru.table.pickCardTitle}</p>
              <ul>
                {(self?.establishments ?? []).map((establishment, index) => (
                  <li key={`${establishment.id}-${index}`}>
                    <button type="button" onClick={() => sendCommand("pickCard", { cardId: establishment.id })}>
                      {catalogCardName(establishment.id)}
                    </button>
                  </li>
                ))}
              </ul>
              {SKIPPABLE_PICK_PHASES.includes(view.phase) ? (
                <button type="button" onClick={() => sendCommand("skip")}>
                  {ru.table.skipButton}
                </button>
              ) : null}
            </div>
          );
        }
        if (view.phase === "pickBusinessCenterTheirCard") {
          const targetId = view.pending?.sub?.targetPlayerId;
          const target = players.find((player) => player.id === targetId);
          return (
            <div>
              <p>{ru.table.pickCardTitle}</p>
              <ul>
                {(target?.establishments ?? []).map((establishment, index) => (
                  <li key={`${establishment.id}-${index}`}>
                    <button type="button" onClick={() => sendCommand("pickCard", { cardId: establishment.id })}>
                      {catalogCardName(establishment.id)}
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => sendCommand("skip")}>
                {ru.table.skipButton}
              </button>
            </div>
          );
        }
        if (PICK_ESTABLISHMENT_TYPE_PHASES.includes(view.phase)) {
          const ownCardIds = new Set((self?.establishments ?? []).map((establishment) => establishment.id));
          return (
            <div>
              <p>{ru.table.pickEstablishmentTypeTitle}</p>
              <ul>
                {Array.from(ownCardIds).map((cardId) => (
                  <li key={cardId}>
                    <button type="button" onClick={() => sendCommand("pickEstablishmentType", { cardId })}>
                      {catalogCardName(cardId)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        }
        return null;
    }
  }

  return (
    <main style={tableStyle}>
      <header style={{ gridArea: "header" }}>
        <h1>
          {ru.table.roomCodeLabel}: {roomId}
        </h1>
        <p>
          {ru.table.phaseLabel}: {snapshot.phase}
        </p>
        {snapshot.lastRoll ? (
          <p>
            {ru.table.diceRolledLabel}: {snapshot.lastRoll.dice.join(", ")}
          </p>
        ) : null}
        {serverError ? <p role="alert">{serverError}</p> : null}
      </header>

      <section aria-label={ru.table.opponentsTitle} style={{ display: "contents" }}>
        {opponents.map((opponent, index) => (
          <div key={opponent.id} style={{ gridArea: edgeForOpponent(index, opponents.length) }}>
            <PlayerCity
              player={opponent}
              isSelf={false}
              isActive={activePlayer?.id === opponent.id}
              highlightedIds={highlightedIds}
            />
          </div>
        ))}
      </section>

      <section aria-label={ru.table.marketTitle} style={{ gridArea: "market" }}>
        <h2>{ru.table.marketTitle}</h2>
        <ul>
          {Object.entries(snapshot.market ?? {}).map(([cardId, supply]) => (
            <li key={cardId}>
              <CatalogCard cardId={cardId} highlighted={highlightedIds.has(cardId)}>
                <p>
                  {ru.table.supplyLabel}: {supply}
                </p>
              </CatalogCard>
            </li>
          ))}
        </ul>
        {renderPhaseActions()}
      </section>

      {self ? (
        <div style={{ gridArea: "bottom" }}>
          <PlayerCity player={self} isSelf isActive={activePlayer?.id === self.id} highlightedIds={highlightedIds} />
        </div>
      ) : null}

      {isShopOpen && self ? (
        <ShopOverlay
          snapshot={snapshot}
          self={self}
          highlightedIds={highlightedIds}
          onBuildEstablishment={(cardId) => {
            void sendCommand("buildEstablishment", { cardId });
          }}
          onBuildLandmark={(landmarkId) => {
            void sendCommand("buildLandmark", { landmarkId });
          }}
          onPassBuild={() => {
            setIsShopOpen(false);
            void sendCommand("passBuild");
          }}
          onClose={() => setIsShopOpen(false)}
        />
      ) : null}

      {showGameOver ? <GameOverBanner winnerId={winnerId} selfId={selfId} /> : null}
    </main>
  );
}
