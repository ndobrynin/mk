import {
  ESTABLISHMENTS,
  LANDMARKS,
  defaultMarket,
  getEstablishment,
  getLandmark,
  type EstablishmentDef,
  type Icon,
} from './catalog.js';

export type Command =
  | { type: 'roll' }
  | { type: 'chooseDiceCount'; count: 1 | 2 | 3 }
  | { type: 'keepTwo'; indices: [number, number] }
  | { type: 'reroll' }
  | { type: 'keepRoll' }
  | { type: 'harborAdd' }
  | { type: 'harborSkip' }
  | { type: 'pickPlayer'; playerId: string }
  | { type: 'pickCard'; cardId: string }
  | { type: 'pickEstablishmentType'; cardId: string }
  | { type: 'buildEstablishment'; cardId: string }
  | { type: 'buildLandmark'; landmarkId: string }
  | { type: 'passBuild' }
  | { type: 'ventureFundDeposit' }
  | { type: 'skip' };

export type GameState = {
  version: 1;
  phase: string;
  players: unknown[];
  activeIndex?: number;
  market?: Record<string, number>;
  diceCount?: 1 | 2 | 3;
  threeDice?: number[];
  pendingSum?: number;
  lastRoll?: { dice: number[] };
  turnFlags?: { rerolled: boolean; usedExtraTurn: boolean };
  pending?: unknown;
  winnerId?: string;
};

export type Rng = { nextInt(maxExclusive: number): number };

export type Landmark = { id: string; constructed: boolean };

export type Establishment = { id: string; repaired?: boolean };

export type Player = {
  id: string;
  coins: number;
  establishments: Establishment[];
  landmarks: Landmark[];
  ventureFundTokens?: number;
};

type IncomeTask =
  | { kind: 'red'; ownerId: string; cardId: string }
  | { kind: 'blue'; ownerId: string; cardId: string }
  | { kind: 'green'; cardId: string }
  | { kind: 'purple'; cardId: string }
  | { kind: 'trawler' };

type PendingSub =
  | { stage: 'movingCompanyCard'; targetPlayerId: string }
  | { stage: 'businessCenterOwnCard'; targetPlayerId: string }
  | { stage: 'businessCenterTheirCard'; targetPlayerId: string; ownCardId: string };

type PendingIncome = {
  kind: 'income';
  tasks: IncomeTask[];
  index: number;
  sub?: PendingSub;
};

type TurnFlags = { rerolled: boolean; usedExtraTurn: boolean };

type InternalState = GameState & {
  activeIndex: number;
  players: Player[];
  market: Record<string, number>;
  diceCount?: 1 | 2 | 3;
  threeDice?: number[];
  pendingSum?: number;
  lastRoll?: { dice: number[] };
  turnFlags?: TurnFlags;
  pending?: PendingIncome;
  winnerId?: string;
};

type GameEvent = Record<string, unknown>;

type ApplyResult =
  | { ok: true; state: GameState; events: unknown[] }
  | { ok: false; error: string };

const LANDMARK_IDS = LANDMARKS.map((landmark) => landmark.id);

function createLandmarks(): Landmark[] {
  return LANDMARK_IDS.map((id) => ({ id, constructed: false }));
}

function createPlayer(id: string): Player {
  return {
    id,
    coins: 3,
    establishments: [{ id: 'wheat-field' }, { id: 'bakery' }],
    landmarks: createLandmarks(),
  };
}

export function setup(playerIds: string[]): GameState {
  if (playerIds.length < 2 || playerIds.length > 4) {
    throw new Error('setup requires 2, 3, or 4 playerIds');
  }

  const players: Player[] = playerIds.map((id) => createPlayer(id));

  const state: InternalState = {
    version: 1,
    phase: 'rolling',
    activeIndex: 0,
    players,
    market: defaultMarket(),
  };

  return state;
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function clonePlayer(player: Player): Player {
  return {
    ...player,
    establishments: player.establishments.map((e) => ({ ...e })),
    landmarks: player.landmarks.map((l) => ({ ...l })),
  };
}

function clonePlayers(players: Player[]): Player[] {
  return players.map(clonePlayer);
}

function isFunctional(e: Establishment): boolean {
  return e.repaired !== false;
}

function countFunctional(player: Player, cardId: string): number {
  return player.establishments.filter((e) => e.id === cardId && isFunctional(e)).length;
}

function countRaw(player: Player, cardId: string): number {
  return player.establishments.filter((e) => e.id === cardId).length;
}

function countIcon(player: Player, icon: Icon): number {
  let count = 0;
  for (const e of player.establishments) {
    if (!isFunctional(e)) continue;
    const def = getEstablishment(e.id);
    if (def && def.icons.includes(icon)) count += 1;
  }
  return count;
}

function hasLandmark(player: Player, id: string): boolean {
  return player.landmarks.some((l) => l.id === id && l.constructed);
}

function constructedCount(player: Player): number {
  return player.landmarks.filter((l) => l.constructed).length;
}

function nonPurpleEligible(player: Player): Establishment[] {
  return player.establishments.filter((e) => {
    const def = getEstablishment(e.id);
    return def !== undefined && def.color !== 'purple';
  });
}

/** Cards eligible to be given away by moving-company: non-purple, excluding the moving-company card itself. */
function giveAwayEligible(player: Player): Establishment[] {
  return nonPurpleEligible(player).filter((e) => e.id !== 'moving-company');
}

/**
 * Order to collect from for red-card income: starting from the player right
 * before the active player (going backwards around the table), excluding
 * the active player itself.
 */
function counterclockwiseOrder(activeIndex: number, playerCount: number): number[] {
  const order: number[] = [];
  for (let step = 1; step < playerCount; step += 1) {
    order.push((activeIndex - step + playerCount) % playerCount);
  }
  return order;
}

function rollDice(count: number, rng: Rng): number[] {
  return Array.from({ length: count }, () => rng.nextInt(6) + 1);
}

function findPlayer(players: Player[], id: string): Player | undefined {
  return players.find((p) => p.id === id);
}

function findPlayerIndex(players: Player[], id: string): number {
  return players.findIndex((p) => p.id === id);
}

// ---------------------------------------------------------------------------
// Gain / take computation for simple (non-paused) card effects
// ---------------------------------------------------------------------------

function computeGain(def: EstablishmentDef, owner: Player, copies: number): number {
  const eff = def.effect;
  let amount = 0;
  switch (eff.kind) {
    case 'flat':
      amount = eff.amount * copies;
      break;
    case 'flatIfFewLandmarks':
      amount = constructedCount(owner) <= eff.maxLandmarks ? eff.amount * copies : 0;
      break;
    case 'flatIfHarbor':
      amount = hasLandmark(owner, 'harbor') ? eff.amount * copies : 0;
      break;
    case 'perIcon':
      amount = countIcon(owner, eff.icon) * eff.amount;
      break;
    case 'perCard':
      amount = countFunctional(owner, eff.cardId) * eff.amount;
      break;
    case 'gainPerCardThenRepairSelf':
      amount = countFunctional(owner, eff.cardId) * eff.amount;
      break;
    default:
      amount = 0;
  }
  if (def.icons.includes('cup') || def.icons.includes('shop')) {
    if (hasLandmark(owner, 'mall')) amount += copies;
  }
  return amount;
}

function computeRedAmount(def: EstablishmentDef, owner: Player, active: Player, copies: number): number {
  const eff = def.effect;
  let amount = 0;
  switch (eff.kind) {
    case 'takeFlat':
      amount = eff.amount * copies;
      break;
    case 'takeFlatIfHarbor':
      amount = hasLandmark(owner, 'harbor') ? eff.amount * copies : 0;
      break;
    case 'takeFlatIfActiveLandmarksAtLeast':
      amount = constructedCount(active) >= eff.min ? eff.amount * copies : 0;
      break;
    case 'takeAllIfActiveLandmarksAtLeast':
      amount = constructedCount(active) >= eff.min ? active.coins : 0;
      break;
    default:
      amount = 0;
  }
  if ((def.icons.includes('cup') || def.icons.includes('shop')) && eff.kind !== 'takeAllIfActiveLandmarksAtLeast') {
    if (hasLandmark(owner, 'mall')) amount += copies;
  }
  return amount;
}

// ---------------------------------------------------------------------------
// Income task queue
// ---------------------------------------------------------------------------

function buildIncomeTasks(sum: number, players: Player[], activeIndex: number): IncomeTask[] {
  const active = players[activeIndex];
  const tasks: IncomeTask[] = [];

  for (const ownerIndex of counterclockwiseOrder(activeIndex, players.length)) {
    const owner = players[ownerIndex];
    for (const def of ESTABLISHMENTS) {
      if (def.color === 'red' && def.activation.includes(sum) && countFunctional(owner, def.id) > 0) {
        tasks.push({ kind: 'red', ownerId: owner.id, cardId: def.id });
      }
    }
  }

  let trawlerAdded = false;
  for (const owner of players) {
    for (const def of ESTABLISHMENTS) {
      if (def.color !== 'blue' || !def.activation.includes(sum)) continue;
      if (def.effect.kind === 'trawler') {
        if (!trawlerAdded && countFunctional(owner, def.id) > 0) {
          tasks.push({ kind: 'trawler' });
          trawlerAdded = true;
        }
        continue;
      }
      if (countFunctional(owner, def.id) > 0) {
        tasks.push({ kind: 'blue', ownerId: owner.id, cardId: def.id });
      }
    }
  }

  for (const def of ESTABLISHMENTS) {
    if (def.color === 'green' && def.activation.includes(sum) && countFunctional(active, def.id) > 0) {
      tasks.push({ kind: 'green', cardId: def.id });
    }
  }

  for (const def of ESTABLISHMENTS) {
    if (def.color === 'purple' && def.activation.includes(sum) && countFunctional(active, def.id) > 0) {
      tasks.push({ kind: 'purple', cardId: def.id });
    }
  }

  return tasks;
}

type IncomeContext = {
  players: Player[];
  market: Record<string, number>;
  activeIndex: number;
  events: GameEvent[];
  rng: Rng;
};

/** Returns a phase name + pending sub-state if the task needs the active player to choose something. */
function processIncomeTask(
  ctx: IncomeContext,
  task: IncomeTask,
): { phase: string; sub?: PendingSub } | undefined {
  const active = ctx.players[ctx.activeIndex];

  if (task.kind === 'red') {
    const owner = findPlayer(ctx.players, task.ownerId);
    const def = getEstablishment(task.cardId);
    if (!owner || !def) return undefined;
    const copies = countFunctional(owner, task.cardId);
    const amount = computeRedAmount(def, owner, active, copies);
    const paid = Math.min(active.coins, Math.max(amount, 0));
    active.coins -= paid;
    owner.coins += paid;
    ctx.events.push({ type: 'coinsTransferred', from: active.id, to: owner.id, amount: paid, cardId: def.id });
    return undefined;
  }

  if (task.kind === 'trawler') {
    const dice = rollDice(2, ctx.rng);
    const total = dice[0] + dice[1];
    ctx.events.push({ type: 'trawlerRoll', dice, sum: total });
    for (const owner of ctx.players) {
      if (countFunctional(owner, 'trawler') > 0 && hasLandmark(owner, 'harbor')) {
        owner.coins += total;
        ctx.events.push({ type: 'coinsGained', playerId: owner.id, amount: total, cardId: 'trawler' });
      }
    }
    return undefined;
  }

  if (task.kind === 'blue') {
    const owner = findPlayer(ctx.players, task.ownerId);
    const def = getEstablishment(task.cardId);
    if (!owner || !def) return undefined;
    const copies = countFunctional(owner, task.cardId);
    const amount = computeGain(def, owner, copies);
    owner.coins += amount;
    ctx.events.push({ type: 'coinsGained', playerId: owner.id, amount, cardId: def.id });
    return undefined;
  }

  if (task.kind === 'green') {
    const def = getEstablishment(task.cardId);
    if (!def) return undefined;
    return processGreenTask(ctx, def);
  }

  return processPurpleTask(ctx, task.cardId);
}

function processGreenTask(
  ctx: IncomeContext,
  def: EstablishmentDef,
): { phase: string; sub?: PendingSub } | undefined {
  const active = ctx.players[ctx.activeIndex];
  const eff = def.effect;

  if (eff.kind === 'demolitionCompany') {
    const landmark = active.landmarks.find((l) => l.constructed);
    if (!landmark) return undefined; // no legal target: skip entirely
    landmark.constructed = false;
    active.coins += eff.bonus;
    ctx.events.push({ type: 'landmarkDemolished', playerId: active.id, landmarkId: landmark.id });
    return undefined;
  }

  if (eff.kind === 'movingCompany') {
    if (giveAwayEligible(active).length === 0) return undefined; // nothing to give away: skip
    return { phase: 'pickMovingCompanyPlayer' };
  }

  const copies = countFunctional(active, def.id);
  const amount = computeGain(def, active, copies);
  active.coins += amount;
  ctx.events.push({ type: 'coinsGained', playerId: active.id, amount, cardId: def.id });

  if (eff.kind === 'gainPerCardThenRepairSelf') {
    for (const e of active.establishments) {
      if (e.id === def.id) e.repaired = false;
    }
  }

  return undefined;
}

function processPurpleTask(ctx: IncomeContext, cardId: string): { phase: string; sub?: PendingSub } | undefined {
  const def = getEstablishment(cardId);
  if (!def) return undefined;
  const active = ctx.players[ctx.activeIndex];
  const eff = def.effect;

  if (eff.kind === 'stadium') {
    for (const opponent of ctx.players) {
      if (opponent.id === active.id) continue;
      const paid = Math.min(opponent.coins, eff.amount);
      opponent.coins -= paid;
      active.coins += paid;
      ctx.events.push({ type: 'coinsTransferred', from: opponent.id, to: active.id, amount: paid, cardId: def.id });
    }
    return undefined;
  }

  if (eff.kind === 'tvStation') {
    return { phase: 'pickTvStationPlayer' };
  }

  if (eff.kind === 'businessCenter') {
    const ownHasCard = nonPurpleEligible(active).length > 0;
    const someoneElseHasCard = ctx.players.some(
      (p) => p.id !== active.id && nonPurpleEligible(p).length > 0,
    );
    if (!ownHasCard || !someoneElseHasCard) return undefined;
    return { phase: 'pickBusinessCenterPlayer' };
  }

  if (eff.kind === 'publisher') {
    for (const opponent of ctx.players) {
      if (opponent.id === active.id) continue;
      const amount = (countIcon(opponent, 'cup') + countIcon(opponent, 'shop')) * eff.amount;
      const paid = Math.min(opponent.coins, amount);
      opponent.coins -= paid;
      active.coins += paid;
      ctx.events.push({ type: 'coinsTransferred', from: opponent.id, to: active.id, amount: paid, cardId: def.id });
    }
    return undefined;
  }

  if (eff.kind === 'renovationCompany') {
    const anyEligible = ESTABLISHMENTS.some(
      (candidate) =>
        candidate.color !== 'purple' &&
        ctx.players.some((p) => countFunctional(p, candidate.id) > 0),
    );
    if (!anyEligible) return undefined;
    return { phase: 'pickRenovationType' };
  }

  if (eff.kind === 'taxOffice') {
    for (const player of ctx.players) {
      if (player.coins >= eff.threshold) {
        const half = Math.floor(player.coins / 2);
        player.coins -= half;
        active.coins += half;
        if (player.id !== active.id) {
          ctx.events.push({ type: 'coinsTransferred', from: player.id, to: active.id, amount: half, cardId: def.id });
        }
      }
    }
    return undefined;
  }

  if (eff.kind === 'ventureFund') {
    const tokens = active.ventureFundTokens ?? 0;
    if (tokens > 0) {
      for (const opponent of ctx.players) {
        if (opponent.id === active.id) continue;
        const paid = Math.min(opponent.coins, tokens);
        opponent.coins -= paid;
        active.coins += paid;
        ctx.events.push({ type: 'coinsTransferred', from: opponent.id, to: active.id, amount: paid, cardId: def.id });
      }
    }
    return undefined;
  }

  if (eff.kind === 'conferenceCenter') {
    const eligible = nonPurpleEligible(active).filter((e) => {
      const d = getEstablishment(e.id);
      return d !== undefined && ['flat', 'flatIfFewLandmarks', 'flatIfHarbor', 'perIcon', 'perCard'].includes(d.effect.kind);
    });
    if (eligible.length === 0) return undefined;
    return { phase: 'pickConferenceType' };
  }

  if (eff.kind === 'park') {
    const total = ctx.players.reduce((sum, p) => sum + p.coins, 0);
    const share = Math.ceil(total / ctx.players.length);
    for (const p of ctx.players) {
      p.coins = share;
    }
    ctx.events.push({ type: 'parkRedistributed', share });
    return undefined;
  }

  return undefined;
}

function applyLoanOfficeTax(active: Player, events: GameEvent[]): void {
  const copies = countFunctional(active, 'loan-office');
  if (copies === 0) return;
  const amount = Math.min(active.coins, 2 * copies);
  if (amount > 0) {
    active.coins -= amount;
    events.push({ type: 'loanOfficeTax', playerId: active.id, amount });
  }
}

function applyCityHallBonus(active: Player, events: GameEvent[]): void {
  if (active.coins === 0 && hasLandmark(active, 'city-hall')) {
    active.coins += 1;
    events.push({ type: 'cityHallBonus', playerId: active.id });
  }
}

/** Runs the income task queue starting at `startIndex`, mutating `ctx` in place. */
function runIncomeQueue(
  ctx: IncomeContext,
  tasks: IncomeTask[],
  startIndex: number,
): { done: true } | { done: false; phase: string; pending: PendingIncome } {
  let index = startIndex;
  while (index < tasks.length) {
    const pause = processIncomeTask(ctx, tasks[index]);
    if (pause) {
      return { done: false, phase: pause.phase, pending: { kind: 'income', tasks, index, sub: pause.sub } };
    }
    index += 1;
  }
  return { done: true };
}

function finishIncomeAndEnterBuild(
  ctx: IncomeContext,
  lastRoll: { dice: number[] } | undefined,
  turnFlags: TurnFlags | undefined,
): InternalState {
  applyCityHallBonus(ctx.players[ctx.activeIndex], ctx.events);
  return {
    version: 1,
    phase: 'build',
    activeIndex: ctx.activeIndex,
    players: ctx.players,
    market: ctx.market,
    lastRoll,
    turnFlags,
  };
}

function startIncome(current: InternalState, sum: number, events: GameEvent[], rng: Rng): ApplyResult {
  const players = clonePlayers(current.players);
  const market = { ...current.market };
  const active = players[current.activeIndex];

  const anyBankBuilt = players.some((p) => hasLandmark(p, 'bank'));
  if (anyBankBuilt && rng.nextInt(10000) === 0) {
    events.push({ type: 'bankEdge' });
    for (const p of players) {
      if (hasLandmark(p, 'bank')) {
        p.coins += 3;
        events.push({ type: 'coinsGained', playerId: p.id, amount: 3, cardId: 'bank' });
      }
    }
    applyLoanOfficeTax(active, events);
    const ctx: IncomeContext = { players, market, activeIndex: current.activeIndex, events, rng };
    return { ok: true, state: finishIncomeAndEnterBuild(ctx, current.lastRoll, current.turnFlags), events };
  }

  applyLoanOfficeTax(active, events);
  const tasks = buildIncomeTasks(sum, players, current.activeIndex);
  const ctx: IncomeContext = { players, market, activeIndex: current.activeIndex, events, rng };
  const result = runIncomeQueue(ctx, tasks, 0);
  if (!result.done) {
    return {
      ok: true,
      state: {
        version: 1,
        phase: result.phase,
        activeIndex: current.activeIndex,
        players: ctx.players,
        market: ctx.market,
        lastRoll: current.lastRoll,
        turnFlags: current.turnFlags,
        pending: result.pending,
      },
      events,
    };
  }
  return { ok: true, state: finishIncomeAndEnterBuild(ctx, current.lastRoll, current.turnFlags), events };
}

function resumeIncome(current: InternalState, events: GameEvent[], rng: Rng): ApplyResult {
  const pending = current.pending;
  if (!pending) return { ok: false, error: 'no pending income to resume' };
  const players = current.players; // already cloned by caller before mutation
  const market = { ...current.market };
  const ctx: IncomeContext = { players, market, activeIndex: current.activeIndex, events, rng };
  const result = runIncomeQueue(ctx, pending.tasks, pending.index + 1);
  if (!result.done) {
    return {
      ok: true,
      state: {
        version: 1,
        phase: result.phase,
        activeIndex: current.activeIndex,
        players: ctx.players,
        market: ctx.market,
        lastRoll: current.lastRoll,
        turnFlags: current.turnFlags,
        pending: result.pending,
      },
      events,
    };
  }
  return { ok: true, state: finishIncomeAndEnterBuild(ctx, current.lastRoll, current.turnFlags), events };
}

// ---------------------------------------------------------------------------
// Dice resolution (choose count -> roll -> choose two of three -> reroll -> harbor -> income)
// ---------------------------------------------------------------------------

function afterDiceFinalized(current: InternalState, dice: number[], events: GameEvent[], rng: Rng): ApplyResult {
  const active = current.players[current.activeIndex];
  const withRoll: InternalState = { ...current, lastRoll: { dice }, threeDice: undefined };

  if (hasLandmark(active, 'amusement-park') && !(current.turnFlags?.rerolled)) {
    return {
      ok: true,
      state: { ...withRoll, phase: 'decideReroll' },
      events,
    };
  }

  return harborCheck(withRoll, dice, events, rng);
}

function harborCheck(current: InternalState, dice: number[], events: GameEvent[], rng: Rng): ApplyResult {
  const active = current.players[current.activeIndex];
  const sum = dice.reduce((a, b) => a + b, 0);
  if (hasLandmark(active, 'harbor') && sum >= 10) {
    return {
      ok: true,
      state: { ...current, phase: 'decideHarbor', pendingSum: sum },
      events,
    };
  }
  return startIncome(current, sum, events, rng);
}

// ---------------------------------------------------------------------------
// Main apply()
// ---------------------------------------------------------------------------

export function apply(state: GameState, command: Command, rng: Rng): ApplyResult {
  const current = state as InternalState;

  if (current.phase === 'gameOver') {
    return { ok: false, error: 'game is over' };
  }

  if (current.phase === 'rolling') {
    if (command.type === 'chooseDiceCount') {
      const active = current.players[current.activeIndex];
      if (command.count === 2 && !hasLandmark(active, 'station') && !hasLandmark(active, 'aqua-park')) {
        return { ok: false, error: 'station or aqua-park required to roll 2 dice' };
      }
      if (command.count === 3 && !hasLandmark(active, 'aqua-park')) {
        return { ok: false, error: 'aqua-park required to roll 3 dice' };
      }
      return { ok: true, state: { ...current, diceCount: command.count }, events: [] };
    }

    if (command.type === 'roll') {
      const diceCount = current.diceCount ?? 1;
      const dice = rollDice(diceCount, rng);
      const events: GameEvent[] = [{ type: 'diceRolled', dice }];
      const withCount: InternalState = { ...current, diceCount };

      if (diceCount === 3) {
        return {
          ok: true,
          state: { ...withCount, phase: 'chooseTwoOfThree', threeDice: dice },
          events,
        };
      }
      return afterDiceFinalized(withCount, dice, events, rng);
    }

    return { ok: false, error: `cannot apply "${command.type}" in phase "${current.phase}"` };
  }

  if (current.phase === 'chooseTwoOfThree') {
    if (command.type !== 'keepTwo') {
      return { ok: false, error: `cannot apply "${command.type}" in phase "${current.phase}"` };
    }
    const three = current.threeDice ?? [];
    const [i, j] = command.indices;
    if (
      i === j ||
      !Number.isInteger(i) ||
      !Number.isInteger(j) ||
      i < 0 ||
      j < 0 ||
      i >= three.length ||
      j >= three.length
    ) {
      return { ok: false, error: 'invalid dice indices' };
    }
    const dice = [three[i], three[j]];
    return afterDiceFinalized(current, dice, [], rng);
  }

  if (current.phase === 'decideReroll') {
    if (command.type === 'reroll') {
      const diceCount = current.diceCount ?? 1;
      const dice = rollDice(diceCount, rng);
      const events: GameEvent[] = [{ type: 'diceRolled', dice }];
      const withFlag: InternalState = {
        ...current,
        turnFlags: { rerolled: true, usedExtraTurn: current.turnFlags?.usedExtraTurn ?? false },
      };
      if (diceCount === 3) {
        return {
          ok: true,
          state: { ...withFlag, phase: 'chooseTwoOfThree', threeDice: dice },
          events,
        };
      }
      return afterDiceFinalized(withFlag, dice, events, rng);
    }
    if (command.type === 'keepRoll') {
      const dice = current.lastRoll?.dice ?? [];
      return harborCheck(current, dice, [], rng);
    }
    return { ok: false, error: `cannot apply "${command.type}" in phase "${current.phase}"` };
  }

  if (current.phase === 'decideHarbor') {
    if (command.type === 'harborAdd') {
      const sum = (current.pendingSum ?? 0) + 2;
      const events: GameEvent[] = [{ type: 'harborBonusApplied', bonus: 2 }];
      return startIncome({ ...current, pendingSum: undefined }, sum, events, rng);
    }
    if (command.type === 'harborSkip') {
      const sum = current.pendingSum ?? 0;
      return startIncome({ ...current, pendingSum: undefined }, sum, [], rng);
    }
    return { ok: false, error: `cannot apply "${command.type}" in phase "${current.phase}"` };
  }

  if (isPickPhase(current.phase)) {
    return handlePickCommand(current, command, rng);
  }

  if (current.phase === 'build') {
    return handleBuild(current, command);
  }

  if (current.phase === 'endOfTurn') {
    return handleEndOfTurn(current, command);
  }

  return { ok: false, error: `cannot apply "${command.type}" in phase "${current.phase}"` };
}

// ---------------------------------------------------------------------------
// Pick-phase (paused target selection) handling
// ---------------------------------------------------------------------------

const PICK_PHASES = [
  'pickMovingCompanyPlayer',
  'pickMovingCompanyCard',
  'pickBusinessCenterPlayer',
  'pickBusinessCenterOwnCard',
  'pickBusinessCenterTheirCard',
  'pickTvStationPlayer',
  'pickRenovationType',
  'pickConferenceType',
] as const;

function isPickPhase(phase: string): boolean {
  return (PICK_PHASES as readonly string[]).includes(phase);
}

function handlePickCommand(current: InternalState, command: Command, rng: Rng): ApplyResult {
  const pending = current.pending;
  if (!pending) return { ok: false, error: 'no pending pick' };
  const players = clonePlayers(current.players);
  const active = players[current.activeIndex];
  const events: GameEvent[] = [];

  if (current.phase === 'pickMovingCompanyPlayer') {
    if (command.type !== 'pickPlayer') return { ok: false, error: `cannot apply "${command.type}" in phase "${current.phase}"` };
    const target = findPlayer(players, command.playerId);
    if (!target || target.id === active.id) return { ok: false, error: 'invalid target player' };
    return {
      ok: true,
      state: {
        ...current,
        players,
        phase: 'pickMovingCompanyCard',
        pending: { ...pending, sub: { stage: 'movingCompanyCard', targetPlayerId: target.id } },
      },
      events: [],
    };
  }

  if (current.phase === 'pickMovingCompanyCard') {
    if (command.type !== 'pickCard') return { ok: false, error: `cannot apply "${command.type}" in phase "${current.phase}"` };
    const sub = pending.sub;
    if (!sub || sub.stage !== 'movingCompanyCard') return { ok: false, error: 'invalid pending state' };
    const eligible = giveAwayEligible(active);
    const owned = eligible.find((e) => e.id === command.cardId);
    if (!owned) return { ok: false, error: 'card not owned or not eligible' };
    const target = findPlayer(players, sub.targetPlayerId);
    if (!target) return { ok: false, error: 'target player not found' };
    const idx = active.establishments.findIndex((e) => e.id === command.cardId);
    const [moved] = active.establishments.splice(idx, 1);
    target.establishments.push(moved);
    const movingDef = getEstablishment('moving-company');
    active.coins += movingDef && movingDef.effect.kind === 'movingCompany' ? movingDef.effect.bonus : 0;
    events.push({ type: 'establishmentGiven', from: active.id, to: target.id, cardId: command.cardId });
    return resumeIncome({ ...current, players, pending }, events, rng);
  }

  if (current.phase === 'pickTvStationPlayer') {
    if (command.type !== 'pickPlayer') return { ok: false, error: `cannot apply "${command.type}" in phase "${current.phase}"` };
    const target = findPlayer(players, command.playerId);
    if (!target || target.id === active.id) return { ok: false, error: 'invalid target player' };
    const paid = Math.min(target.coins, 5);
    target.coins -= paid;
    active.coins += paid;
    events.push({ type: 'coinsTransferred', from: target.id, to: active.id, amount: paid, cardId: 'tv-station' });
    return resumeIncome({ ...current, players, pending }, events, rng);
  }

  if (current.phase === 'pickBusinessCenterPlayer') {
    if (command.type === 'skip') {
      return resumeIncome({ ...current, players, pending }, events, rng);
    }
    if (command.type !== 'pickPlayer') return { ok: false, error: `cannot apply "${command.type}" in phase "${current.phase}"` };
    const target = findPlayer(players, command.playerId);
    if (!target || target.id === active.id || nonPurpleEligible(target).length === 0) {
      return { ok: false, error: 'invalid target player' };
    }
    return {
      ok: true,
      state: {
        ...current,
        players,
        phase: 'pickBusinessCenterOwnCard',
        pending: { ...pending, sub: { stage: 'businessCenterOwnCard', targetPlayerId: target.id } },
      },
      events: [],
    };
  }

  if (current.phase === 'pickBusinessCenterOwnCard') {
    const sub = pending.sub;
    if (!sub || sub.stage !== 'businessCenterOwnCard') return { ok: false, error: 'invalid pending state' };
    if (command.type === 'skip') {
      return resumeIncome({ ...current, players, pending }, events, rng);
    }
    if (command.type !== 'pickCard') return { ok: false, error: `cannot apply "${command.type}" in phase "${current.phase}"` };
    const owned = nonPurpleEligible(active).find((e) => e.id === command.cardId);
    if (!owned) return { ok: false, error: 'card not owned or not eligible' };
    return {
      ok: true,
      state: {
        ...current,
        players,
        phase: 'pickBusinessCenterTheirCard',
        pending: {
          ...pending,
          sub: { stage: 'businessCenterTheirCard', targetPlayerId: sub.targetPlayerId, ownCardId: command.cardId },
        },
      },
      events: [],
    };
  }

  if (current.phase === 'pickBusinessCenterTheirCard') {
    const sub = pending.sub;
    if (!sub || sub.stage !== 'businessCenterTheirCard') return { ok: false, error: 'invalid pending state' };
    if (command.type === 'skip') {
      return resumeIncome({ ...current, players, pending }, events, rng);
    }
    if (command.type !== 'pickCard') return { ok: false, error: `cannot apply "${command.type}" in phase "${current.phase}"` };
    const target = findPlayer(players, sub.targetPlayerId);
    if (!target) return { ok: false, error: 'target player not found' };
    const theirCard = nonPurpleEligible(target).find((e) => e.id === command.cardId);
    if (!theirCard) return { ok: false, error: 'card not owned or not eligible' };
    const ownIdx = active.establishments.findIndex((e) => e.id === sub.ownCardId);
    const theirIdx = target.establishments.findIndex((e) => e.id === command.cardId);
    const [ownMoved] = active.establishments.splice(ownIdx, 1);
    const [theirMoved] = target.establishments.splice(theirIdx, 1);
    active.establishments.push(theirMoved);
    target.establishments.push(ownMoved);
    events.push({
      type: 'establishmentsTraded',
      playerA: active.id,
      cardA: sub.ownCardId,
      playerB: target.id,
      cardB: command.cardId,
    });
    return resumeIncome({ ...current, players, pending }, events, rng);
  }

  if (current.phase === 'pickRenovationType') {
    if (command.type !== 'pickEstablishmentType') return { ok: false, error: `cannot apply "${command.type}" in phase "${current.phase}"` };
    const def = getEstablishment(command.cardId);
    if (!def || def.color === 'purple') return { ok: false, error: 'invalid establishment type' };
    let totalCopies = 0;
    for (const p of players) {
      for (const e of p.establishments) {
        if (e.id === command.cardId && isFunctional(e)) {
          e.repaired = false;
          totalCopies += 1;
        }
      }
    }
    if (totalCopies === 0) return { ok: false, error: 'no functional copies of that type exist' };
    const renovationDef = getEstablishment('renovation-company');
    const bonusPerCard =
      renovationDef && renovationDef.effect.kind === 'renovationCompany' ? renovationDef.effect.bonusPerCard : 0;
    active.coins += bonusPerCard * totalCopies;
    events.push({ type: 'establishmentsRepaired', cardId: command.cardId, count: totalCopies });
    return resumeIncome({ ...current, players, pending }, events, rng);
  }

  if (current.phase === 'pickConferenceType') {
    if (command.type !== 'pickEstablishmentType') return { ok: false, error: `cannot apply "${command.type}" in phase "${current.phase}"` };
    const def = getEstablishment(command.cardId);
    if (!def) return { ok: false, error: 'invalid establishment type' };
    const owned = nonPurpleEligible(active).some((e) => e.id === command.cardId);
    const simpleKinds = ['flat', 'flatIfFewLandmarks', 'flatIfHarbor', 'perIcon', 'perCard'];
    if (!owned || !simpleKinds.includes(def.effect.kind)) {
      return { ok: false, error: 'invalid or ineligible establishment type' };
    }
    const copies = countFunctional(active, command.cardId);
    const amount = computeGain(def, active, copies);
    active.coins += amount;
    events.push({ type: 'coinsGained', playerId: active.id, amount, cardId: def.id });
    const idx = active.establishments.findIndex((e) => e.id === 'conference-center');
    if (idx >= 0) active.establishments.splice(idx, 1);
    const market = { ...current.market, 'conference-center': (current.market['conference-center'] ?? 0) + 1 };
    events.push({ type: 'conferenceCenterReturned' });
    return resumeIncome({ ...current, players, market, pending }, events, rng);
  }

  return { ok: false, error: `cannot apply "${command.type}" in phase "${current.phase}"` };
}

// ---------------------------------------------------------------------------
// Build phase
// ---------------------------------------------------------------------------

function maybeStartEndOfTurn(current: InternalState, players: Player[], events: GameEvent[]): ApplyResult {
  const active = players[current.activeIndex];
  const canDeposit = countFunctional(active, 'venture-fund') > 0 && active.coins >= 1;
  if (canDeposit) {
    return {
      ok: true,
      state: { ...current, players, phase: 'endOfTurn' },
      events,
    };
  }
  return finishTurn(current, players, events);
}

function finishTurn(current: InternalState, players: Player[], events: GameEvent[]): ApplyResult {
  const active = players[current.activeIndex];
  const dice = current.lastRoll?.dice ?? [];
  const isDouble = dice.length === 2 && dice[0] === dice[1];
  const alreadyUsedExtraTurn = current.turnFlags?.usedExtraTurn ?? false;

  if (isDouble && hasLandmark(active, 'tv-tower') && !alreadyUsedExtraTurn) {
    events.push({ type: 'extraTurn', playerId: active.id });
    return {
      ok: true,
      state: {
        version: 1,
        phase: 'rolling',
        activeIndex: current.activeIndex,
        players,
        market: current.market,
        turnFlags: { rerolled: false, usedExtraTurn: true },
      },
      events,
    };
  }

  const playerCount = players.length;
  const nextActiveIndex = (current.activeIndex + 1) % playerCount;
  events.push({ type: 'turnEnded', playerId: active.id });
  events.push({ type: 'turnStarted', playerId: players[nextActiveIndex].id });

  return {
    ok: true,
    state: {
      version: 1,
      phase: 'rolling',
      activeIndex: nextActiveIndex,
      players,
      market: current.market,
    },
    events,
  };
}

function handleBuild(current: InternalState, command: Command): ApplyResult {
  const players = clonePlayers(current.players);
  const active = players[current.activeIndex];
  const events: GameEvent[] = [];

  if (command.type === 'buildEstablishment') {
    const def = getEstablishment(command.cardId);
    if (!def) return { ok: false, error: `unknown establishment "${command.cardId}"` };
    if (def.cost === null) {
      return { ok: false, error: `cost not yet transcribed from Figma for "${def.id}"` };
    }
    const supply = current.market[def.id] ?? 0;
    if (supply <= 0) return { ok: false, error: `no supply left for "${def.id}"` };
    if (active.coins < def.cost) return { ok: false, error: 'not enough coins' };
    if (def.unique && countRaw(active, def.id) > 0) return { ok: false, error: `already own unique "${def.id}"` };

    const market = { ...current.market, [def.id]: supply - 1 };
    active.coins -= def.cost;
    active.establishments.push({ id: def.id });
    if (def.onPurchaseBonus) active.coins += def.onPurchaseBonus;
    events.push({ type: 'establishmentBuilt', playerId: active.id, cardId: def.id });

    return maybeStartEndOfTurn({ ...current, market }, players, events);
  }

  if (command.type === 'buildLandmark') {
    const ldef = getLandmark(command.landmarkId);
    if (!ldef) return { ok: false, error: `unknown landmark "${command.landmarkId}"` };
    if (ldef.cost === null) {
      return { ok: false, error: `cost not yet transcribed from Figma for "${ldef.id}"` };
    }
    const landmark = active.landmarks.find((l) => l.id === ldef.id);
    if (!landmark) return { ok: false, error: `unknown landmark "${ldef.id}"` };
    if (landmark.constructed) return { ok: false, error: `landmark "${ldef.id}" already constructed` };
    if (active.coins < ldef.cost) return { ok: false, error: 'not enough coins' };

    active.coins -= ldef.cost;
    landmark.constructed = true;
    events.push({ type: 'landmarkBuilt', playerId: active.id, landmarkId: ldef.id });

    if (active.landmarks.every((l) => l.constructed)) {
      events.push({ type: 'gameOver', winnerId: active.id });
      return {
        ok: true,
        state: {
          version: 1,
          phase: 'gameOver',
          activeIndex: current.activeIndex,
          players,
          market: current.market,
          winnerId: active.id,
        },
        events,
      };
    }

    return maybeStartEndOfTurn(current, players, events);
  }

  if (command.type === 'passBuild') {
    if (hasLandmark(active, 'airport')) {
      active.coins += 10;
      events.push({ type: 'airportBonus', playerId: active.id });
    }
    return maybeStartEndOfTurn(current, players, events);
  }

  return { ok: false, error: `cannot apply "${command.type}" in phase "${current.phase}"` };
}

function handleEndOfTurn(current: InternalState, command: Command): ApplyResult {
  const players = clonePlayers(current.players);
  const active = players[current.activeIndex];
  const events: GameEvent[] = [];

  if (command.type === 'ventureFundDeposit') {
    if (countFunctional(active, 'venture-fund') === 0) return { ok: false, error: 'no venture fund owned' };
    if (active.coins < 1) return { ok: false, error: 'not enough coins' };
    active.coins -= 1;
    active.ventureFundTokens = (active.ventureFundTokens ?? 0) + 1;
    events.push({ type: 'ventureFundDeposited', playerId: active.id });
    return finishTurn(current, players, events);
  }

  if (command.type === 'skip') {
    return finishTurn(current, players, events);
  }

  return { ok: false, error: `cannot apply "${command.type}" in phase "${current.phase}"` };
}

export { chooseBotCommand } from './bot.js';
