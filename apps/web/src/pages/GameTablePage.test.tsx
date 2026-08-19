import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ru } from "../i18n/ru";
import type { GameSnapshot, GameSocket } from "../lib/socket";

const handlers = new Map<string, (payload: unknown) => void>();
const sendCommandMock = vi.fn().mockResolvedValue({ ok: true });
const disconnectMock = vi.fn();

function fakeSocket(): GameSocket {
  return {
    on: (event, handler) => {
      handlers.set(event, handler as (payload: unknown) => void);
    },
    off: (event) => {
      handlers.delete(event);
    },
    setReady: vi.fn().mockResolvedValue({ ok: true }),
    start: vi.fn().mockResolvedValue({ ok: true }),
    sendCommand: sendCommandMock,
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

import { GameTablePage } from "./GameTablePage";

function base64UrlEncode(value: string): string {
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function tokenFor(userId: string): string {
  const payload = base64UrlEncode(JSON.stringify({ sub: userId }));
  return `header.${payload}.signature`;
}

function makeSnapshot(overrides: Partial<GameSnapshot> = {}): GameSnapshot {
  return {
    version: 1,
    phase: "rolling",
    activeIndex: 0,
    market: { "wheat-field": 6, bakery: 6 },
    players: [
      {
        id: "user-1",
        coins: 3,
        establishments: [{ id: "wheat-field" }, { id: "bakery" }],
        landmarks: [
          { id: "harbor", constructed: false },
          { id: "station", constructed: false },
        ],
      },
      {
        id: "user-2",
        coins: 3,
        establishments: [{ id: "wheat-field" }, { id: "bakery" }],
        landmarks: [
          { id: "harbor", constructed: false },
          { id: "station", constructed: false },
        ],
      },
    ],
    ...overrides,
  };
}

function renderTable(): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={["/rooms/room-1/table"]}>
      <Routes>
        <Route path="/rooms/:roomId/table" element={<GameTablePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.setItem("kidagrad.accessToken", tokenFor("user-1"));
});

afterEach(() => {
  vi.clearAllMocks();
  handlers.clear();
});

function emitSnapshot(snapshot: GameSnapshot): void {
  act(() => {
    handlers.get("game.snapshot")?.(snapshot);
  });
}

describe("GameTablePage", () => {
  it("shows two cities from the snapshot after the game starts", async () => {
    renderTable();

    emitSnapshot(makeSnapshot());

    expect(await screen.findByText("user-2")).toBeInTheDocument();
    expect(screen.getByText(ru.table.yourCityTitle)).toBeInTheDocument();
  });

  it("sends roll without a dice value", async () => {
    renderTable();

    emitSnapshot(makeSnapshot());

    const rollButton = await screen.findByRole("button", { name: ru.table.rollButton });
    await userEvent.click(rollButton);

    expect(sendCommandMock).toHaveBeenCalledWith("roll");
    expect(sendCommandMock).not.toHaveBeenCalledWith("roll", expect.anything());
  });

  it("shows the server error without breaking the table when a command is illegal", async () => {
    sendCommandMock.mockResolvedValueOnce({ ok: false, error: "not your turn" });

    renderTable();

    emitSnapshot(makeSnapshot());

    const rollButton = await screen.findByRole("button", { name: ru.table.rollButton });
    await userEvent.click(rollButton);

    expect(await screen.findByRole("alert")).toHaveTextContent("not your turn");
    expect(screen.getByRole("button", { name: ru.table.rollButton })).toBeInTheDocument();
  });

  it("highlights catalog cards from game.events without rolling locally", async () => {
    renderTable();

    emitSnapshot(makeSnapshot());
    await screen.findByText(ru.table.yourCityTitle);

    act(() => {
      handlers.get("game.events")?.([{ type: "coinsGained", playerId: "user-1", amount: 1, cardId: "wheat-field" }]);
    });

    await waitFor(() => {
      expect(document.querySelector('[data-card-id="wheat-field"][data-highlighted="true"]')).not.toBeNull();
    });
    expect(sendCommandMock).not.toHaveBeenCalled();
  });
});
