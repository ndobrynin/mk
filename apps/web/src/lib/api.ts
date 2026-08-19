import { getAccessToken } from "./auth-storage";

export const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:4010";

export interface TokenPair {
  accessToken: string;
  refreshToken?: string;
}

export interface RegisteredUser extends TokenPair {
  id: string;
  email: string;
}

export interface RoomSeatView {
  userId: string;
  seatIndex: number;
  isBot?: boolean;
}

export interface RoomView {
  id: string;
  code: string;
  hostUserId: string;
  maxSeats: number;
  isPublic: boolean;
  status: string;
  createdAt: string;
  seats: RoomSeatView[];
}

interface ApiErrorBody {
  message?: string;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(body?.message ?? response.statusText, response.status);
  }

  return (await response.json()) as T;
}

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function register(email: string, password: string): Promise<RegisteredUser> {
  return request<RegisteredUser>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function login(email: string, password: string): Promise<TokenPair> {
  return request<TokenPair>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function listRooms(): Promise<RoomView[]> {
  return request<RoomView[]>("/rooms", { headers: authHeaders() });
}

export function createRoom(maxSeats: number, isPublic: boolean, fillBots = false): Promise<RoomView> {
  return request<RoomView>("/rooms", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ maxSeats, isPublic, fillBots }),
  });
}

export function joinRoomByCode(code: string): Promise<RoomView> {
  return request<RoomView>("/rooms/join", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ code }),
  });
}

export function getRoom(roomId: string): Promise<RoomView> {
  return request<RoomView>(`/rooms/${roomId}`, { headers: authHeaders() });
}

export function leaveRoom(roomId: string): Promise<{ ok: true }> {
  return request<{ ok: true }>(`/rooms/${roomId}/leave`, {
    method: "POST",
    headers: authHeaders(),
  });
}

export function addBot(roomId: string): Promise<RoomView> {
  return request<RoomView>(`/rooms/${roomId}/bots`, {
    method: "POST",
    headers: authHeaders(),
  });
}
