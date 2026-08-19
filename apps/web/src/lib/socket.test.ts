import { afterEach, describe, expect, it, vi } from "vitest";

const onMock = vi.fn();
const offMock = vi.fn();
const emitMock = vi.fn();
const disconnectMock = vi.fn();
const ioMock = vi.fn((_url?: unknown, _options?: unknown) => ({
  on: onMock,
  off: offMock,
  emit: emitMock,
  disconnect: disconnectMock,
}));

vi.mock("socket.io-client", () => ({
  io: (url: unknown, options?: unknown) => ioMock(url, options),
}));

import { createGameSocket, decodeJwtSubject } from "./socket";

function base64UrlEncode(value: string): string {
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

afterEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("createGameSocket", () => {
  it("connects with a JWT + roomId handshake", () => {
    localStorage.setItem("kidagrad.accessToken", "token-abc");

    createGameSocket("room-1");

    expect(ioMock).toHaveBeenCalledWith(
      "http://127.0.0.1:4010",
      expect.objectContaining({ auth: { token: "token-abc", roomId: "room-1" } }),
    );
  });

  it("sends roll without a dice value", async () => {
    const socket = createGameSocket("room-1");

    void socket.sendCommand("roll");

    expect(emitMock).toHaveBeenCalledTimes(1);
    const call = emitMock.mock.calls[0];
    expect(call[0]).toBe("roll");
    expect(call).toHaveLength(2);
    expect(typeof call[1]).toBe("function");
  });

  it("drops a client-supplied dice payload on roll", () => {
    const socket = createGameSocket("room-1");

    void socket.sendCommand("roll", { dice: 6 });

    const call = emitMock.mock.calls[0];
    expect(call[0]).toBe("roll");
    expect(call).toHaveLength(2);
    expect(call).not.toContainEqual({ dice: 6 });
  });

  it("sends buildEstablishment with its payload", () => {
    const socket = createGameSocket("room-1");

    void socket.sendCommand("buildEstablishment", { cardId: "bakery" });

    expect(emitMock).toHaveBeenCalledWith("buildEstablishment", { cardId: "bakery" }, expect.any(Function));
  });

  it("setReady emits room.setReady with the ready flag", () => {
    const socket = createGameSocket("room-1");

    void socket.setReady(true);

    expect(emitMock).toHaveBeenCalledWith("room.setReady", { ready: true }, expect.any(Function));
  });

  it("start emits room.start with only a callback", () => {
    const socket = createGameSocket("room-1");

    void socket.start();

    expect(emitMock).toHaveBeenCalledWith("room.start", expect.any(Function));
  });

  it("disconnect delegates to the underlying socket", () => {
    const socket = createGameSocket("room-1");

    socket.disconnect();

    expect(disconnectMock).toHaveBeenCalledTimes(1);
  });
});

describe("decodeJwtSubject", () => {
  it("reads the sub claim from a JWT payload", () => {
    const payload = base64UrlEncode(JSON.stringify({ sub: "user-42" }));
    const token = `header.${payload}.signature`;

    expect(decodeJwtSubject(token)).toBe("user-42");
  });

  it("returns undefined for a malformed token", () => {
    expect(decodeJwtSubject("not-a-jwt")).toBeUndefined();
    expect(decodeJwtSubject(null)).toBeUndefined();
  });
});
