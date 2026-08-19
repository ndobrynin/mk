import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ru } from "../i18n/ru";
import { HomePage } from "./HomePage";
import { LocalPlayersPage } from "./LocalPlayersPage";

function renderHomeApp(): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/local" element={<LocalPlayersPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("HomePage", () => {
  it("shows local and network play buttons and keeps network unavailable", async () => {
    renderHomeApp();

    expect(screen.getByRole("button", { name: ru.home.localPlay })).toBeInTheDocument();
    const networkButton = screen.getByRole("button", { name: ru.home.networkPlay });
    expect(networkButton).toBeDisabled();
    expect(networkButton).toHaveAttribute("aria-disabled", "true");

    await userEvent.click(networkButton);

    expect(screen.queryByRole("heading", { name: ru.localPlayers.title })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: ru.home.localPlay })).toBeInTheDocument();
  });

  it("opens local player registration from the local play button", async () => {
    renderHomeApp();

    await userEvent.click(screen.getByRole("button", { name: ru.home.localPlay }));

    expect(screen.getByRole("heading", { name: ru.localPlayers.title })).toBeInTheDocument();
  });
});
