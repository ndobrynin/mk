import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ru } from "../i18n/ru";
import { RegisterPage } from "./RegisterPage";
import { RoomsPage } from "./RoomsPage";

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 201 : 409,
    json: () => Promise.resolve(body),
  } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("RegisterPage", () => {
  it("registers the user and shows the rooms list after success", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          id: "user-1",
          email: "player@example.com",
          accessToken: "access-1",
          refreshToken: "refresh-1",
        }),
      )
      .mockResolvedValueOnce(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/rooms" element={<RoomsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText(ru.auth.emailLabel), "player@example.com");
    await userEvent.type(screen.getByLabelText(ru.auth.passwordLabel), "supersecret1");
    await userEvent.click(screen.getByRole("button", { name: ru.auth.registerSubmit }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: ru.rooms.title })).toBeInTheDocument();
    });

    expect(localStorage.getItem("kidagrad.accessToken")).toBe("access-1");
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://127.0.0.1:4010/auth/register",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
