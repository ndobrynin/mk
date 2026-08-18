import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ru } from "../i18n/ru";
import type { RoomView } from "../lib/api";
import { RoomLobbyPage } from "./RoomLobbyPage";
import { RoomsPage } from "./RoomsPage";

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
    seats: [{ userId: "user-1", seatIndex: 0 }],
    ...overrides,
  };
}

function renderRoomsApp(): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={["/rooms"]}>
      <Routes>
        <Route path="/rooms" element={<RoomsPage />} />
        <Route path="/rooms/:roomId" element={<RoomLobbyPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.setItem("kidagrad.accessToken", "token-1");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("RoomsPage", () => {
  it("creates a room and opens the lobby with the room code", async () => {
    const room = makeRoom({ id: "room-new", code: "NEWROOM" });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse(room))
      .mockResolvedValueOnce(jsonResponse(room));
    vi.stubGlobal("fetch", fetchMock);

    renderRoomsApp();

    await screen.findByText(ru.rooms.emptyList);

    await userEvent.click(screen.getByRole("button", { name: ru.rooms.createSubmit }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: ru.lobby.title })).toBeInTheDocument();
    });

    expect(screen.getByText("NEWROOM")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://127.0.0.1:4010/rooms",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("joins a room by code and opens the lobby with the room code", async () => {
    const room = makeRoom({ id: "room-joined", code: "JOINCD" });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse(room))
      .mockResolvedValueOnce(jsonResponse(room));
    vi.stubGlobal("fetch", fetchMock);

    renderRoomsApp();

    await screen.findByText(ru.rooms.emptyList);

    await userEvent.type(screen.getByLabelText(ru.rooms.codeLabel), "JOINCD");
    await userEvent.click(screen.getByRole("button", { name: ru.rooms.joinSubmit }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: ru.lobby.title })).toBeInTheDocument();
    });

    expect(screen.getByText("JOINCD")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://127.0.0.1:4010/rooms/join",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
