import { useEffect, useState, type FormEvent, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { ru } from "../i18n/ru";
import { createRoom, joinRoomByCode, listRooms, type RoomView } from "../lib/api";

const SEAT_OPTIONS = [2, 3, 4] as const;

export function RoomsPage(): ReactElement {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<RoomView[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [maxSeats, setMaxSeats] = useState<number>(SEAT_OPTIONS[0]);
  const [isPublic, setIsPublic] = useState(true);
  const [fillBots, setFillBots] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    listRooms()
      .then((data) => {
        if (!cancelled) {
          setRooms(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError(ru.rooms.loadError);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setCreateError(null);

    try {
      const room = await createRoom(maxSeats, isPublic, fillBots);
      navigate(`/rooms/${room.id}`);
    } catch {
      setCreateError(ru.auth.genericError);
    }
  }

  async function handleJoin(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setJoinError(null);

    try {
      const room = await joinRoomByCode(joinCode);
      navigate(`/rooms/${room.id}`);
    } catch {
      setJoinError(ru.auth.genericError);
    }
  }

  return (
    <main>
      <h1>{ru.rooms.title}</h1>

      {loadError ? <p role="alert">{loadError}</p> : null}

      {rooms.length === 0 && !loadError ? <p>{ru.rooms.emptyList}</p> : null}

      <ul>
        {rooms.map((room) => (
          <li key={room.id}>
            <span>{room.code}</span>{" "}
            <span>
              {ru.rooms.seatsCount}: {room.seats.length}/{room.maxSeats}
            </span>
          </li>
        ))}
      </ul>

      <section>
        <h2>{ru.rooms.createTitle}</h2>
        <form onSubmit={handleCreate}>
          <label htmlFor="max-seats">{ru.rooms.maxSeatsLabel}</label>
          <select
            id="max-seats"
            value={maxSeats}
            onChange={(event) => setMaxSeats(Number(event.target.value))}
          >
            {SEAT_OPTIONS.map((seats) => (
              <option key={seats} value={seats}>
                {seats}
              </option>
            ))}
          </select>
          <label htmlFor="is-public">
            <input
              id="is-public"
              type="checkbox"
              checked={isPublic}
              onChange={(event) => setIsPublic(event.target.checked)}
            />
            {ru.rooms.isPublicLabel}
          </label>
          <label htmlFor="fill-bots">
            <input
              id="fill-bots"
              type="checkbox"
              checked={fillBots}
              onChange={(event) => setFillBots(event.target.checked)}
            />
            {ru.rooms.fillBotsLabel}
          </label>
          <button type="submit">{ru.rooms.createSubmit}</button>
        </form>
        {createError ? <p role="alert">{createError}</p> : null}
      </section>

      <section>
        <h2>{ru.rooms.joinByCodeTitle}</h2>
        <form onSubmit={handleJoin}>
          <label htmlFor="join-code">{ru.rooms.codeLabel}</label>
          <input
            id="join-code"
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value)}
            required
          />
          <button type="submit">{ru.rooms.joinSubmit}</button>
        </form>
        {joinError ? <p role="alert">{joinError}</p> : null}
      </section>
    </main>
  );
}
