import { io, type Socket } from "socket.io-client";
import { API_BASE_URL } from "./api";
import { getAccessToken } from "./auth-storage";

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

export interface Landmark {
  id: string;
  constructed: boolean;
}

export interface Establishment {
  id: string;
  repaired?: boolean;
}

export interface PlayerView {
  id: string;
  coins: number;
  establishments: Establishment[];
  landmarks: Landmark[];
  ventureFundTokens?: number;
}

export interface PendingSubView {
  stage?: string;
  targetPlayerId?: string;
  ownCardId?: string;
}

export interface PendingView {
  kind?: string;
  index?: number;
  sub?: PendingSubView;
}

export interface GameSnapshot {
  version: 1;
  phase: string;
  players: PlayerView[];
  activeIndex?: number;
  market?: Record<string, number>;
  diceCount?: 1 | 2 | 3;
  threeDice?: number[];
  pendingSum?: number;
  lastRoll?: { dice: number[] };
  turnFlags?: { rerolled: boolean; usedExtraTurn: boolean };
  pending?: PendingView;
  winnerId?: string;
}

export type GameEvent = Record<string, unknown>;

export interface CommandResult {
  ok: boolean;
  error?: string;
}

export interface GameOverPayload {
  winnerId?: string;
}

export interface SocketErrorPayload {
  message: string;
}

export type GameCommandName =
  | "roll"
  | "chooseDiceCount"
  | "keepTwo"
  | "reroll"
  | "keepRoll"
  | "harborAdd"
  | "harborSkip"
  | "pickPlayer"
  | "pickCard"
  | "pickEstablishmentType"
  | "buildEstablishment"
  | "buildLandmark"
  | "passBuild"
  | "ventureFundDeposit"
  | "skip";

export interface GameSocketEvents {
  "room.state": RoomStateView;
  "game.snapshot": GameSnapshot;
  "game.events": GameEvent[];
  "game.over": GameOverPayload;
  error: SocketErrorPayload;
}

export interface GameSocket {
  on<K extends keyof GameSocketEvents>(event: K, handler: (payload: GameSocketEvents[K]) => void): void;
  off<K extends keyof GameSocketEvents>(event: K, handler: (payload: GameSocketEvents[K]) => void): void;
  setReady(ready: boolean): Promise<CommandResult>;
  start(): Promise<CommandResult>;
  sendCommand(name: GameCommandName, payload?: Record<string, unknown>): Promise<CommandResult>;
  disconnect(): void;
}

type UntypedListener = (...args: unknown[]) => void;

/** Narrow view of `Socket` used internally so untyped event names don't fight socket.io's overloads. */
interface UntypedEmitter {
  on(event: string, listener: UntypedListener): void;
  off(event: string, listener: UntypedListener): void;
  emit(event: string, ...args: unknown[]): void;
  disconnect(): void;
}

function parseCommandResult(value: unknown): CommandResult {
  if (typeof value !== "object" || value === null) {
    return { ok: false, error: "invalid ack" };
  }

  const record = value as { ok?: unknown; error?: unknown };
  if (record.ok === true) {
    return { ok: true };
  }

  return {
    ok: false,
    error: typeof record.error === "string" ? record.error : undefined,
  };
}

/**
 * Wraps a socket.io-client connection with the JWT + roomId handshake required by
 * `apps/api/src/game/game.gateway.ts`, and exposes a typed emit/on surface. Callers
 * must never pass a dice value to `sendCommand("roll")` — the server rolls the dice.
 */
export function createGameSocket(roomId: string): GameSocket {
  const rawSocket: Socket = io(API_BASE_URL, {
    auth: { token: getAccessToken() ?? "", roomId },
  });
  const socket = rawSocket as unknown as UntypedEmitter;

  return {
    on(event, handler) {
      socket.on(event, handler as UntypedListener);
    },
    off(event, handler) {
      socket.off(event, handler as UntypedListener);
    },
    setReady(ready) {
      return new Promise((resolve) => {
        socket.emit("room.setReady", { ready }, (ack: unknown) => {
          resolve(parseCommandResult(ack));
        });
      });
    },
    start() {
      return new Promise((resolve) => {
        socket.emit("room.start", (ack: unknown) => {
          resolve(parseCommandResult(ack));
        });
      });
    },
    sendCommand(name, payload) {
      return new Promise((resolve) => {
        const ack = (value: unknown): void => {
          resolve(parseCommandResult(value));
        };
        // `roll` never carries a client-chosen face — the engine rolls on the server.
        if (name === "roll" || payload === undefined) {
          socket.emit(name, ack);
        } else {
          socket.emit(name, payload, ack);
        }
      });
    },
    disconnect() {
      socket.disconnect();
    },
  };
}

/**
 * Reads the `sub` claim out of a JWT without verifying its signature — used only to
 * know which player in `game.snapshot` is "me" for layout purposes. The server is the
 * only party that trusts this token; the client never uses it for authorization.
 */
export function decodeJwtSubject(token: string | null): string | undefined {
  if (!token) {
    return undefined;
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return undefined;
  }

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64)) as { sub?: unknown };
    return typeof payload.sub === "string" ? payload.sub : undefined;
  } catch {
    return undefined;
  }
}
