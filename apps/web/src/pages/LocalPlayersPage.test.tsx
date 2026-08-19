import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ru } from "../i18n/ru";
import { HomePage } from "./HomePage";
import { LocalPlayersPage } from "./LocalPlayersPage";

function renderLocalApp(): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={["/local"]}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/local" element={<LocalPlayersPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("LocalPlayersPage", () => {
  it("adds a typed name to the player list", async () => {
    renderLocalApp();

    await userEvent.type(screen.getByLabelText(ru.localPlayers.namePlaceholder), "Никита");
    await userEvent.click(screen.getByRole("button", { name: ru.localPlayers.add }));

    expect(screen.getByText("Никита")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: ru.localPlayers.registered })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Бизнес Кот|Онигири|Робот Фугу|Радуга/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `${ru.localPlayers.remove}: Никита` })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: ru.localPlayers.start })).toBeDisabled();
  });

  it("removes a registered player", async () => {
    renderLocalApp();

    await userEvent.type(screen.getByLabelText(ru.localPlayers.namePlaceholder), "Никита");
    await userEvent.click(screen.getByRole("button", { name: ru.localPlayers.add }));
    await userEvent.click(screen.getByRole("button", { name: `${ru.localPlayers.remove}: Никита` }));

    expect(screen.queryByText("Никита")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: ru.localPlayers.registered })).not.toBeInTheDocument();
  });

  it("returns to the home menu from the menu button", async () => {
    renderLocalApp();

    await userEvent.click(screen.getByRole("button", { name: ru.localPlayers.menu }));

    expect(screen.getByRole("button", { name: ru.home.localPlay })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: ru.localPlayers.title })).not.toBeInTheDocument();
  });

  it("does not add more than four player names", async () => {
    renderLocalApp();
    const nameInput = screen.getByLabelText(ru.localPlayers.namePlaceholder);
    const addButton = screen.getByRole("button", { name: ru.localPlayers.add });

    for (const player of ["Аня", "Боря", "Вика", "Гена"]) {
      await userEvent.type(nameInput, player);
      await userEvent.click(addButton);
    }

    expect(addButton).toBeDisabled();
    await userEvent.type(nameInput, "Лишний");
    await userEvent.click(addButton);

    expect(screen.getByText("Аня")).toBeInTheDocument();
    expect(screen.getByText("Боря")).toBeInTheDocument();
    expect(screen.getByText("Вика")).toBeInTheDocument();
    expect(screen.getByText("Гена")).toBeInTheDocument();
    expect(screen.queryByText("Лишний")).not.toBeInTheDocument();

    const avatars = screen.getAllByRole("img", { name: /Бизнес Кот|Онигири|Робот Фугу|Радуга/ });
    expect(avatars).toHaveLength(4);
    expect(new Set(avatars.map((node) => node.getAttribute("aria-label"))).size).toBe(4);
  });
});
