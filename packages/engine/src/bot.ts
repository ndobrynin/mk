import {
  ESTABLISHMENTS,
  LANDMARKS,
  getEstablishment,
  getLandmark,
  type EstablishmentDef,
  type Icon,
} from './catalog.js';
import { apply, type Command, type GameState, type Player, type Rng } from './index.js';

const STUB_RNG: Rng = { nextInt: () => 0 };

function playersOf(state: GameState): Player[] {
  return state.players as Player[];
}

function isFunctional(establishment: { repaired?: boolean }): boolean {
  return establishment.repaired !== false;
}

function hasLandmark(player: Player, id: string): boolean {
  return player.landmarks.some((landmark) => landmark.id === id && landmark.constructed);
}

function constructedCount(player: Player): number {
  return player.landmarks.filter((landmark) => landmark.constructed).length;
}

function countFunctional(player: Player, cardId: string): number {
  return player.establishments.filter((e) => e.id === cardId && isFunctional(e)).length;
}

function countIcon(player: Player, icon: Icon): number {
  let count = 0;
  for (const establishment of player.establishments) {
    if (!isFunctional(establishment)) continue;
    const def = getEstablishment(establishment.id);
    if (def && def.icons.includes(icon)) count += 1;
  }
  return count;
}

function cityFeeds(player: Player): boolean {
  return hasLandmark(player, 'city-hall') || player.establishments.length > 2;
}

function estimatePayout(def: EstablishmentDef, player: Player): number {
  const eff = def.effect;
  let amount = 0;
  switch (eff.kind) {
    case 'flat':
      amount = eff.amount;
      break;
    case 'flatIfFewLandmarks':
      amount = constructedCount(player) <= eff.maxLandmarks ? eff.amount : 0;
      break;
    case 'flatIfHarbor':
      amount = hasLandmark(player, 'harbor') ? eff.amount : 0;
      break;
    case 'perIcon':
      amount = countIcon(player, eff.icon) * eff.amount;
      break;
    case 'perCard':
      amount = countFunctional(player, eff.cardId) * eff.amount;
      break;
    case 'gainPerCardThenRepairSelf':
      amount = countFunctional(player, eff.cardId) * eff.amount;
      break;
    case 'takeFlat':
      amount = eff.amount;
      break;
    case 'takeFlatIfHarbor':
      amount = hasLandmark(player, 'harbor') ? eff.amount : 0;
      break;
    case 'takeFlatIfActiveLandmarksAtLeast':
      amount = constructedCount(player) >= eff.min ? eff.amount : 0;
      break;
    case 'stadium':
      amount = eff.amount;
      break;
    default:
      amount = 0;
  }
  if ((def.icons.includes('cup') || def.icons.includes('shop')) && hasLandmark(player, 'mall')) {
    amount += 1;
  }
  return amount;
}

/** Expected income on a 1d6 roll, divided by cost. `cost: null` is not scored. */
function evPerCost(def: EstablishmentDef, player: Player): number {
  if (def.cost === null || def.cost <= 0) return Number.NEGATIVE_INFINITY;
  const faces = def.activation.filter((n) => n >= 1 && n <= 6).length;
  return faces / 6 * estimatePayout(def, player) / def.cost;
}

function candidateCommands(state: GameState): Command[] {
  const players = playersOf(state);
  const candidates: Command[] = [
    { type: 'roll' },
    { type: 'chooseDiceCount', count: 1 },
    { type: 'chooseDiceCount', count: 2 },
    { type: 'chooseDiceCount', count: 3 },
    { type: 'reroll' },
    { type: 'keepRoll' },
    { type: 'harborAdd' },
    { type: 'harborSkip' },
    { type: 'passBuild' },
    { type: 'ventureFundDeposit' },
    { type: 'skip' },
  ];

  const three = state.threeDice ?? [];
  for (let i = 0; i < three.length; i += 1) {
    for (let j = 0; j < three.length; j += 1) {
      if (i === j) continue;
      candidates.push({ type: 'keepTwo', indices: [i, j] });
    }
  }

  for (const player of players) {
    candidates.push({ type: 'pickPlayer', playerId: player.id });
  }

  const cardIds: string[] = [];
  const seen = new Set<string>();
  const addCardId = (id: string): void => {
    if (seen.has(id)) return;
    seen.add(id);
    cardIds.push(id);
  };
  for (const def of ESTABLISHMENTS) addCardId(def.id);
  for (const player of players) {
    for (const establishment of player.establishments) addCardId(establishment.id);
  }
  for (const id of Object.keys(state.market ?? {})) addCardId(id);

  for (const cardId of cardIds) {
    candidates.push({ type: 'pickCard', cardId });
    candidates.push({ type: 'pickEstablishmentType', cardId });
    candidates.push({ type: 'buildEstablishment', cardId });
  }

  for (const landmark of LANDMARKS) {
    candidates.push({ type: 'buildLandmark', landmarkId: landmark.id });
  }

  return candidates;
}

export function legalCommands(state: GameState): Command[] {
  return candidateCommands(state).filter((command) => apply(state, command, STUB_RNG).ok);
}

function chooseBuild(player: Player, legal: Command[]): Command {
  if (cityFeeds(player)) {
    const landmark = legal.find((command) => {
      if (command.type !== 'buildLandmark') return false;
      const def = getLandmark(command.landmarkId);
      return def !== undefined && def.cost !== null;
    });
    if (landmark) return landmark;
  }

  let best: Extract<Command, { type: 'buildEstablishment' }> | undefined;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const command of legal) {
    if (command.type !== 'buildEstablishment') continue;
    const def = getEstablishment(command.cardId);
    if (!def || def.cost === null) continue;
    const score = evPerCost(def, player);
    if (best === undefined || score > bestScore) {
      best = command;
      bestScore = score;
    }
  }
  if (best) return best;
  return { type: 'passBuild' };
}

export function chooseBotCommand(state: GameState, playerId: string): Command {
  if (state.phase === 'rolling') {
    return { type: 'roll' };
  }
  if (state.phase === 'decideReroll') {
    return { type: 'keepRoll' };
  }
  if (state.phase === 'decideHarbor') {
    return { type: 'harborSkip' };
  }

  const legal = legalCommands(state);

  if (state.phase === 'build') {
    const player = playersOf(state).find((p) => p.id === playerId);
    if (!player) {
      throw new Error(`unknown player "${playerId}"`);
    }
    return chooseBuild(player, legal);
  }

  const first = legal[0];
  if (!first) {
    throw new Error(`no legal command in phase "${state.phase}"`);
  }
  return first;
}
