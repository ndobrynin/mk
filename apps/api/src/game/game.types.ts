import type { Command } from '@kidagrad/engine';

export interface RoomSeatStateView {
  userId: string;
  seatIndex: number;
  ready: boolean;
}

export interface RoomStateView {
  id: string;
  code: string;
  hostUserId: string;
  maxSeats: number;
  isPublic: boolean;
  status: string;
  seats: RoomSeatStateView[];
}

export interface CommandResult {
  ok: boolean;
  error?: string;
}

const DICE_COUNTS = [1, 2, 3] as const;
type DiceCount = (typeof DICE_COUNTS)[number];

function isDiceCount(value: unknown): value is DiceCount {
  return typeof value === 'number' && (DICE_COUNTS as readonly number[]).includes(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isIndexPair(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((entry) => typeof entry === 'number' && Number.isInteger(entry))
  );
}

/**
 * Builds a typed engine `Command` from a raw socket payload for a given event name.
 * Returns `undefined` when the event name is unknown or the payload does not match
 * the shape the command needs; callers must treat that as an illegal command.
 */
export function parseGameCommand(eventName: string, payload: unknown): Command | undefined {
  const body = typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>) : {};

  switch (eventName) {
    case 'roll':
      return { type: 'roll' };
    case 'reroll':
      return { type: 'reroll' };
    case 'keepRoll':
      return { type: 'keepRoll' };
    case 'harborAdd':
      return { type: 'harborAdd' };
    case 'harborSkip':
      return { type: 'harborSkip' };
    case 'passBuild':
      return { type: 'passBuild' };
    case 'ventureFundDeposit':
      return { type: 'ventureFundDeposit' };
    case 'skip':
      return { type: 'skip' };
    case 'chooseDiceCount':
      return isDiceCount(body.count) ? { type: 'chooseDiceCount', count: body.count } : undefined;
    case 'keepTwo':
      return isIndexPair(body.indices) ? { type: 'keepTwo', indices: body.indices } : undefined;
    case 'pickPlayer':
      return isNonEmptyString(body.playerId) ? { type: 'pickPlayer', playerId: body.playerId } : undefined;
    case 'pickCard':
      return isNonEmptyString(body.cardId) ? { type: 'pickCard', cardId: body.cardId } : undefined;
    case 'pickEstablishmentType':
      return isNonEmptyString(body.cardId) ? { type: 'pickEstablishmentType', cardId: body.cardId } : undefined;
    case 'buildEstablishment':
      return isNonEmptyString(body.cardId) ? { type: 'buildEstablishment', cardId: body.cardId } : undefined;
    case 'buildLandmark':
      return isNonEmptyString(body.landmarkId)
        ? { type: 'buildLandmark', landmarkId: body.landmarkId }
        : undefined;
    default:
      return undefined;
  }
}

export const GAME_COMMAND_EVENT_NAMES = [
  'roll',
  'chooseDiceCount',
  'keepTwo',
  'reroll',
  'keepRoll',
  'harborAdd',
  'harborSkip',
  'pickPlayer',
  'pickCard',
  'pickEstablishmentType',
  'buildEstablishment',
  'buildLandmark',
  'passBuild',
  'ventureFundDeposit',
  'skip',
] as const;
