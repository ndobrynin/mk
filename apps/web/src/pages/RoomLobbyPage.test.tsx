import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ru } from "../i18n/ru";
import type { RoomView } from "../lib/api";
import type { GameSocket, RoomStateView } from "../lib/socket";

const handlers = new Map<string, (payload: unknown) => void>();
const setReadyMock = vi.fn().mockResolvedValue({ ok: true });
const startMock = vi.fn().mockResolvedValue({ ok: true });
const disconnectMock = vi.fn();

function fakeSocket(): GameSocket {
  return {
    on: (event, handler) => {
      handlers.set(event, handler as (payload: unknown) => void);
    },
    off: (event) => {
      handlers.delete(event);
    },
    setReady: setReadyMock,
    start: startMock,
    sendCommand: vi.fn().mockResolvedValue({ ok: true }),
    disconnect: disconnectMock,
  };
}

vi.mock("../lib/socket", async () => {
  const actual = await vi.importActual<typeof import("../lib/socket")>("../lib/socket");
  return {
    ...actual,
    createGameSocket: vi.fn(() => fakeSocket()),
  };
});

import { RoomLobbyPage } from "./RoomLobbyPage";

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 400,
    json: () => Promise.resolve(body),
  } as Response;
}

function makeRoom(overrides: Partial<RoomView> = {}): RoomView {
  return {
    id: "room-1",
    code: "ABC123",
    hostUserId: "user-1",
    maxSeats: 4,
    isPublic: true,
    status: "waiting",
    createdAt: new Date().toISOString(),
    seats: [
      { userId: "user-1", seatIndex: 0 },
      { userId: "user-2", seatIndex: 1 },
    ],
    ...overrides,
  };
}

function makeRoomState(overrides: Partial<RoomStateView> = {}): RoomStateView {
  return {
    id: "room-1",
    code: "ABC123",
    hostUserId: "user-1",
    maxSeats: 4,
    isPublic: true,
    status: "waiting",
    seats: [
      { userId: "user-1", seatIndex: 0, ready: false },
      { userId: "user-2", seatIndex: 1, ready: false },
    ],
    ...overrides,
  };
}

function base64UrlEncode(value: string): string {
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function tokenFor(userId: string): string {
  const payload = base64UrlEncode(JSON.stringify({ sub: userId }));
  return `header.${payload}.signature`;
}

function renderLobby(): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={["/rooms/room-1"]}>
      <Routes>
        <Route path="/rooms/:roomId" element={<RoomLobbyPage />} />
        <Route path="/rooms/:roomId/table" element={<p>table</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.setItem("kidagrad.accessToken", tokenFor("user-1"));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  handlers.clear();
});

describe("RoomLobbyPage", () => {
  it("sends room.setReady when the ready button is clicked", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(makeRoom())));

    renderLobby();

    await screen.findByRole("heading", { name: ru.lobby.title });

    act(() => {
      handlers.get("room.state")?.(makeRoomState());
    });

    const readyButton = await screen.findByRole("button", { name: ru.lobby.readyButton });
    await userEvent.click(readyButton);

    expect(setReadyMock).toHaveBeenCalledWith(true);
  });

  it("sends room.start when the host clicks start", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(makeRoom())));

    renderLobby();

    await screen.findByRole("heading", { name: ru.lobby.title });

    act(() => {
      handlers.get("room.state")?.(makeRoomState());
    });

    const startButton = await screen.findByRole("button", { name: ru.lobby.startButton });
    await userEvent.click(startButton);

    expect(startMock).toHaveBeenCalledTimes(1);
  });

  it("navigates to the table once a game.snapshot arrives", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(makeRoom())));

    renderLobby();

    await screen.findByRole("heading", { name: ru.lobby.title });

    act(() => {
      handlers.get("game.snapshot")?.({});
    });

    await waitFor(() => {
      expect(screen.getByText("table")).toBeInTheDocument();
    });
  });
});
