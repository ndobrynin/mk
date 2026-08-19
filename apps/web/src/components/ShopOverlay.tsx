import type { CSSProperties, ReactElement, ReactNode } from "react";
import { ru } from "../i18n/ru";
import type { GameSnapshot, PlayerView } from "../lib/socket";

export function catalogCardName(cardId: string): string {
  return cardId in ru.cards ? ru.cards[cardId as keyof typeof ru.cards] : cardId;
}

const cardStyle = (highlighted: boolean): CSSProperties => ({
  display: "inline-block",
  padding: "0.35rem 0.5rem",
  border: highlighted ? "2px solid #f5c542" : "1px solid #c8c8c8",
  background: highlighted ? "#fff6d6" : "#fff",
  borderRadius: "0.25rem",
});

/**
 * One catalog card. Ids match `packages/engine` (`wheat-field`, `bakery`, `harbor`, …).
 * Income and cost math stay on the server; this only renders the name from `ru.cards`.
 */
export function CatalogCard({
  cardId,
  highlighted = false,
  children,
}: {
  cardId: string;
  highlighted?: boolean;
  children?: ReactNode;
}): ReactElement {
  return (
    <article data-card-id={cardId} data-highlighted={highlighted ? "true" : "false"} style={cardStyle(highlighted)}>
      <p>{catalogCardName(cardId)}</p>
      {children}
    </article>
  );
}

interface ShopOverlayProps {
  snapshot: GameSnapshot;
  self: PlayerView;
  highlightedIds: ReadonlySet<string>;
  onBuildEstablishment: (cardId: string) => void;
  onBuildLandmark: (landmarkId: string) => void;
  onPassBuild: () => void;
  onClose: () => void;
}

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const dialogStyle: CSSProperties = {
  background: "#fff",
  padding: "1.5rem",
  maxHeight: "90vh",
  overflow: "auto",
  minWidth: "24rem",
};

/**
 * Building is always attempted on the server: this overlay only disables buttons for
 * facts already visible in the snapshot (zero supply, landmark already constructed).
 * Cost checks and everything else stay server-side, per the "no client income math" rule.
 */
export function ShopOverlay({
  snapshot,
  self,
  highlightedIds,
  onBuildEstablishment,
  onBuildLandmark,
  onPassBuild,
  onClose,
}: ShopOverlayProps): ReactElement {
  const marketEntries = Object.entries(snapshot.market ?? {});

  return (
    <div style={overlayStyle}>
      <section role="dialog" aria-label={ru.shop.title} style={dialogStyle}>
        <h2>{ru.shop.title}</h2>
        <p>
          {ru.table.coinsLabel}: {self.coins}
        </p>

        <h3>{ru.shop.establishmentsTitle}</h3>
        <ul>
          {marketEntries.map(([cardId, supply]) => (
            <li key={cardId}>
              <CatalogCard cardId={cardId} highlighted={highlightedIds.has(cardId)}>
                <p>
                  {ru.table.supplyLabel}: {supply}
                </p>
                <button type="button" onClick={() => onBuildEstablishment(cardId)} disabled={supply <= 0}>
                  {ru.shop.buildButton}
                </button>
              </CatalogCard>
            </li>
          ))}
        </ul>

        <h3>{ru.table.landmarksTitle}</h3>
        <ul>
          {self.landmarks.map((landmark) => (
            <li key={landmark.id}>
              <CatalogCard cardId={landmark.id} highlighted={highlightedIds.has(landmark.id)}>
                {landmark.constructed ? (
                  <p>{ru.table.constructedLabel}</p>
                ) : (
                  <button type="button" onClick={() => onBuildLandmark(landmark.id)}>
                    {ru.shop.buildButton}
                  </button>
                )}
              </CatalogCard>
            </li>
          ))}
        </ul>

        <button type="button" onClick={onPassBuild}>
          {ru.table.passBuildButton}
        </button>
        <button type="button" onClick={onClose}>
          {ru.shop.closeButton}
        </button>
      </section>
    </div>
  );
}
