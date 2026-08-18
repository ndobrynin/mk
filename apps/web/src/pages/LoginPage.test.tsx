import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ru } from "../i18n/ru";
import { LoginPage } from "./LoginPage";
import { RoomsPage } from "./RoomsPage";

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 401,
    json: () => Promise.resolve(body),
  } as Response;
}

function renderLoginApp(): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/rooms" element={<RoomsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("LoginPage", () => {
  it("logs the user in and shows the rooms list after success", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ accessToken: "access-1", refreshToken: "refresh-1" }))
      .mockResolvedValueOnce(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    renderLoginApp();

    await userEvent.type(screen.getByLabelText(ru.auth.emailLabel), "player@example.com");
    await userEvent.type(screen.getByLabelText(ru.auth.passwordLabel), "supersecret1");
    await userEvent.click(screen.getByRole("button", { name: ru.auth.loginSubmit }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: ru.rooms.title })).toBeInTheDocument();
    });

    expect(localStorage.getItem("kidagrad.accessToken")).toBe("access-1");
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://127.0.0.1:4010/auth/login",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("shows a dictionary error message when login fails", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ message: "nope" }, false));
    vi.stubGlobal("fetch", fetchMock);

    renderLoginApp();

    await userEvent.type(screen.getByLabelText(ru.auth.emailLabel), "player@example.com");
    await userEvent.type(screen.getByLabelText(ru.auth.passwordLabel), "wrongpass1");
    await userEvent.click(screen.getByRole("button", { name: ru.auth.loginSubmit }));

    expect(await screen.findByRole("alert")).toHaveTextContent(ru.auth.genericError);
    expect(localStorage.getItem("kidagrad.accessToken")).toBeNull();
  });
});
