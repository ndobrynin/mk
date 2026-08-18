/**
 * Card catalog — data, not per-card functions. Effects follow docs/rules.md §7-8 and §11.
 *
 * Cost provenance: transcribed from the Figma visuals at
 * https://www.figma.com/design/I1NOY3anFnhayDXTVwUHbw/Untitled?node-id=75-39 (see docs/rules.md
 * for the full table and per-id notes). Where a cost could not be read this session (Figma MCP
 * quota exhausted mid-transcription), `cost` is `null` — this is intentional, NOT a placeholder
 * zero. Code that needs a numeric cost (buildEstablishment / buildLandmark) must treat `null` as
 * "not buildable yet" rather than guessing.
 */

export type CardColor = 'blue' | 'green' | 'red' | 'purple';

export type Icon = 'wheat' | 'cow' | 'cup' | 'shop' | 'mountain';

export type EstablishmentEffect =
  /** Flat gain from the bank, per functional copy owned. */
  | { kind: 'flat'; amount: number }
  /** Flat gain, only if the owner has at most `maxLandmarks` constructed landmarks. */
  | { kind: 'flatIfFewLandmarks'; amount: number; maxLandmarks: number }
  /** Flat gain, only if the owner has the harbor landmark constructed. */
  | { kind: 'flatIfHarbor'; amount: number }
  /** Gain per functional card the owner has bearing `icon`. */
  | { kind: 'perIcon'; icon: Icon; amount: number }
  /** Gain per functional copy of `cardId` the owner has (flower-shop counts flower-garden). */
  | { kind: 'perCard'; cardId: string; amount: number }
  /** Winery: gain per functional copy of `cardId` (vineyard), then this card goes into repair. */
  | { kind: 'gainPerCardThenRepairSelf'; cardId: string; amount: number }
  /** Trawler: active player rolls 2 extra dice; owners with harbor gain the sum. */
  | { kind: 'trawler' }
  /** Demolition company: demolish one of the owner's constructed landmarks, then +8. */
  | { kind: 'demolitionCompany'; bonus: number }
  /** Moving company: give away one non-purple establishment to a chosen player, then +4. */
  | { kind: 'movingCompany'; bonus: number }
  /** Flat amount taken from the active player (red cards). */
  | { kind: 'takeFlat'; amount: number }
  /** Taken from active only if owner has harbor (sushi-bar). */
  | { kind: 'takeFlatIfHarbor'; amount: number }
  /** Taken from active only if the active player has >= `min` constructed landmarks. */
  | { kind: 'takeFlatIfActiveLandmarksAtLeast'; amount: number; min: number }
  /** Take ALL of active's coins if active has >= `min` constructed landmarks. */
  | { kind: 'takeAllIfActiveLandmarksAtLeast'; min: number }
  /** Stadium: +2 from each opponent. */
  | { kind: 'stadium'; amount: number }
  /** TV station: pick an opponent, take up to `max` coins. */
  | { kind: 'tvStation'; max: number }
  /** Business center: optionally trade one non-purple establishment with an opponent. */
  | { kind: 'businessCenter' }
  /** Publisher: each opponent pays 1 per their own cup/shop-icon establishment. */
  | { kind: 'publisher'; amount: number }
  /** Renovation company: pick an establishment type; all copies (all players) go to repair. */
  | { kind: 'renovationCompany'; bonusPerCard: number }
  /** Tax office: everyone with >= threshold coins pays half (floor) to the owner. */
  | { kind: 'taxOffice'; threshold: number }
  /** Venture fund: take tokens-worth of coins from each opponent. */
  | { kind: 'ventureFund' }
  /** Conference center: pick an own establishment type, re-trigger it, then it returns to market. */
  | { kind: 'conferenceCenter' }
  /** Park: pool all coins, redistribute evenly, bank covers the shortfall. */
  | { kind: 'park' };

export type EstablishmentDef = {
  id: string;
  color: CardColor;
  activation: number[];
  icons: Icon[];
  cost: number | null;
  unique: boolean;
  supply: number;
  effect: EstablishmentEffect;
  /** Loan office only: coins gained immediately when bought (rules.md §8, "Кредитное бюро"). */
  onPurchaseBonus?: number;
};

const REGULAR_SUPPLY = 6;
const PURPLE_SUPPLY = 5;

export const ESTABLISHMENTS: EstablishmentDef[] = [
  // --- Blue: any player's turn, funded by the bank ---
  {
    id: 'wheat-field',
    color: 'blue',
    activation: [1],
    icons: ['wheat'],
    cost: 1,
    unique: false,
    supply: REGULAR_SUPPLY,
    effect: { kind: 'flat', amount: 1 },
  },
  {
    id: 'farm',
    color: 'blue',
    activation: [2],
    icons: ['cow'],
    cost: 1,
    unique: false,
    supply: REGULAR_SUPPLY,
    effect: { kind: 'flat', amount: 1 },
  },
  {
    id: 'corn-field',
    color: 'blue',
    activation: [3, 4],
    icons: [],
    cost: 1,
    unique: false,
    supply: REGULAR_SUPPLY,
    effect: { kind: 'flatIfFewLandmarks', amount: 1, maxLandmarks: 1 },
  },
  {
    id: 'flower-garden',
    color: 'blue',
    activation: [4],
    icons: [],
    cost: null,
    unique: false,
    supply: REGULAR_SUPPLY,
    effect: { kind: 'flat', amount: 1 },
  },
  {
    id: 'nature-preserve',
    color: 'blue',
    activation: [5],
    icons: ['mountain'],
    cost: null,
    unique: false,
    supply: REGULAR_SUPPLY,
    effect: { kind: 'flat', amount: 1 },
  },
  {
    id: 'vineyard',
    color: 'blue',
    activation: [7],
    icons: [],
    cost: null,
    unique: false,
    supply: REGULAR_SUPPLY,
    effect: { kind: 'flat', amount: 3 },
  },
  {
    id: 'fishing-boat',
    color: 'blue',
    activation: [8],
    icons: [],
    cost: null,
    unique: false,
    supply: REGULAR_SUPPLY,
    effect: { kind: 'flatIfHarbor', amount: 3 },
  },
  {
    id: 'mine',
    color: 'blue',
    activation: [9],
    icons: ['mountain'],
    cost: null,
    unique: false,
    supply: REGULAR_SUPPLY,
    effect: { kind: 'flat', amount: 5 },
  },
  {
    id: 'apple-orchard',
    color: 'blue',
    activation: [10],
    icons: ['wheat'],
    cost: 1,
    unique: false,
    supply: REGULAR_SUPPLY,
    effect: { kind: 'flat', amount: 3 },
  },
  {
    id: 'trawler',
    color: 'blue',
    activation: [12, 13, 14],
    icons: [],
    cost: null,
    unique: false,
    supply: REGULAR_SUPPLY,
    effect: { kind: 'trawler' },
  },

  // --- Green: active player's own turn only, funded by the bank ---
  {
    id: 'convenience-store',
    color: 'green',
    activation: [2],
    icons: ['shop'],
    cost: null,
    unique: false,
    supply: REGULAR_SUPPLY,
    effect: { kind: 'flatIfFewLandmarks', amount: 2, maxLandmarks: 1 },
  },
  {
    id: 'bakery',
    color: 'green',
    activation: [2, 3],
    icons: ['shop'],
    cost: null,
    unique: false,
    supply: REGULAR_SUPPLY,
    effect: { kind: 'flat', amount: 1 },
  },
  {
    id: 'supermarket',
    color: 'green',
    activation: [4],
    icons: ['shop'],
    cost: null,
    unique: false,
    supply: REGULAR_SUPPLY,
    effect: { kind: 'flat', amount: 3 },
  },
  {
    id: 'demolition-company',
    color: 'green',
    activation: [4],
    icons: [],
    cost: null,
    unique: false,
    supply: REGULAR_SUPPLY,
    effect: { kind: 'demolitionCompany', bonus: 8 },
  },
  {
    id: 'loan-office',
    color: 'green',
    activation: [5, 6],
    icons: [],
    cost: null,
    unique: false,
    supply: REGULAR_SUPPLY,
    effect: { kind: 'flat', amount: 0 },
    onPurchaseBonus: 5,
  },
  {
    id: 'flower-shop',
    color: 'green',
    activation: [6],
    icons: ['shop'],
    cost: null,
    unique: false,
    supply: REGULAR_SUPPLY,
    effect: { kind: 'perCard', cardId: 'flower-garden', amount: 1 },
  },
  {
    id: 'cheese-factory',
    color: 'green',
    activation: [7],
    icons: [],
    cost: null,
    unique: false,
    supply: REGULAR_SUPPLY,
    effect: { kind: 'perIcon', icon: 'cow', amount: 3 },
  },
  {
    id: 'furniture-factory',
    color: 'green',
    activation: [8],
    icons: [],
    cost: null,
    unique: false,
    supply: REGULAR_SUPPLY,
    effect: { kind: 'perIcon', icon: 'mountain', amount: 3 },
  },
  {
    id: 'winery',
    color: 'green',
    activation: [9],
    icons: [],
    cost: null,
    unique: false,
    supply: REGULAR_SUPPLY,
    effect: { kind: 'gainPerCardThenRepairSelf', cardId: 'vineyard', amount: 6 },
  },
  {
    id: 'moving-company',
    color: 'green',
    activation: [9, 10],
    icons: [],
    cost: null,
    unique: false,
    supply: REGULAR_SUPPLY,
    effect: { kind: 'movingCompany', bonus: 4 },
  },
  {
    id: 'beverage-factory',
    color: 'green',
    activation: [11],
    icons: [],
    cost: null,
    unique: false,
    supply: REGULAR_SUPPLY,
    effect: { kind: 'perIcon', icon: 'cup', amount: 1 },
  },
  {
    id: 'produce-market',
    color: 'green',
    activation: [11, 12],
    icons: [],
    cost: null,
    unique: false,
    supply: REGULAR_SUPPLY,
    effect: { kind: 'perIcon', icon: 'wheat', amount: 2 },
  },
  {
    id: 'grocery-warehouse',
    color: 'green',
    activation: [12, 13],
    icons: [],
    cost: null,
    unique: false,
    supply: REGULAR_SUPPLY,
    effect: { kind: 'perIcon', icon: 'cup', amount: 2 },
  },

  // --- Red: opponent's turn only, funded by the active player, debt burns ---
  {
    id: 'sushi-bar',
    color: 'red',
    activation: [1],
    icons: ['cup'],
    cost: null,
    unique: false,
    supply: REGULAR_SUPPLY,
    effect: { kind: 'takeFlatIfHarbor', amount: 3 },
  },
  {
    id: 'cafe',
    color: 'red',
    activation: [3],
    icons: ['cup'],
    cost: null,
    unique: false,
    supply: REGULAR_SUPPLY,
    effect: { kind: 'takeFlat', amount: 1 },
  },
  {
    id: 'restaurant',
    color: 'red',
    activation: [5],
    icons: ['cup'],
    cost: null,
    unique: false,
    supply: REGULAR_SUPPLY,
    effect: { kind: 'takeFlatIfActiveLandmarksAtLeast', amount: 5, min: 2 },
  },
  {
    id: 'pizzeria',
    color: 'red',
    activation: [7],
    icons: ['cup'],
    cost: null,
    unique: false,
    supply: REGULAR_SUPPLY,
    effect: { kind: 'takeFlat', amount: 1 },
  },
  {
    id: 'burger-joint',
    color: 'red',
    activation: [8],
    icons: ['cup'],
    cost: null,
    unique: false,
    supply: REGULAR_SUPPLY,
    effect: { kind: 'takeFlat', amount: 1 },
  },
  {
    id: 'diner',
    color: 'red',
    activation: [9, 10],
    icons: ['cup'],
    cost: null,
    unique: false,
    supply: REGULAR_SUPPLY,
    effect: { kind: 'takeFlat', amount: 2 },
  },
  {
    id: 'exclusive-bar',
    color: 'red',
    activation: [12, 13, 14],
    icons: ['cup'],
    cost: null,
    unique: false,
    supply: REGULAR_SUPPLY,
    effect: { kind: 'takeAllIfActiveLandmarksAtLeast', min: 3 },
  },

  // --- Purple: active player's own turn only, unique (max 1 copy) ---
  {
    id: 'stadium',
    color: 'purple',
    activation: [6],
    icons: [],
    cost: null,
    unique: true,
    supply: PURPLE_SUPPLY,
    effect: { kind: 'stadium', amount: 2 },
  },
  {
    id: 'tv-station',
    color: 'purple',
    activation: [6],
    icons: [],
    cost: null,
    unique: true,
    supply: PURPLE_SUPPLY,
    effect: { kind: 'tvStation', max: 5 },
  },
  {
    id: 'business-center',
    color: 'purple',
    activation: [6],
    icons: [],
    cost: null,
    unique: true,
    supply: PURPLE_SUPPLY,
    effect: { kind: 'businessCenter' },
  },
  {
    id: 'publisher',
    color: 'purple',
    activation: [7],
    icons: [],
    cost: null,
    unique: true,
    supply: PURPLE_SUPPLY,
    effect: { kind: 'publisher', amount: 1 },
  },
  {
    id: 'renovation-company',
    color: 'purple',
    activation: [8],
    icons: [],
    cost: null,
    unique: true,
    supply: PURPLE_SUPPLY,
    effect: { kind: 'renovationCompany', bonusPerCard: 1 },
  },
  {
    id: 'tax-office',
    color: 'purple',
    activation: [8, 9],
    icons: [],
    cost: null,
    unique: true,
    supply: PURPLE_SUPPLY,
    effect: { kind: 'taxOffice', threshold: 10 },
  },
  {
    id: 'venture-fund',
    color: 'purple',
    activation: [10],
    icons: [],
    cost: null,
    unique: true,
    supply: PURPLE_SUPPLY,
    effect: { kind: 'ventureFund' },
  },
  {
    id: 'conference-center',
    color: 'purple',
    activation: [10],
    icons: [],
    cost: null,
    unique: true,
    supply: PURPLE_SUPPLY,
    effect: { kind: 'conferenceCenter' },
  },
  {
    id: 'park',
    color: 'purple',
    activation: [11, 12, 13],
    icons: [],
    cost: null,
    unique: true,
    supply: PURPLE_SUPPLY,
    effect: { kind: 'park' },
  },
];

export type LandmarkDef = { id: string; cost: number | null };

export const LANDMARKS: LandmarkDef[] = [
  { id: 'harbor', cost: 1 },
  { id: 'station', cost: 1 },
  { id: 'mall', cost: 10 },
  { id: 'tv-tower', cost: null },
  { id: 'amusement-park', cost: null },
  { id: 'aqua-park', cost: null },
  { id: 'airport', cost: null },
  { id: 'bank', cost: null },
  { id: 'city-hall', cost: null },
];

export function getEstablishment(id: string): EstablishmentDef | undefined {
  return ESTABLISHMENTS.find((def) => def.id === id);
}

export function getLandmark(id: string): LandmarkDef | undefined {
  return LANDMARKS.find((def) => def.id === id);
}

export function defaultMarket(): Record<string, number> {
  const market: Record<string, number> = {};
  for (const def of ESTABLISHMENTS) {
    market[def.id] = def.supply;
  }
  return market;
}
