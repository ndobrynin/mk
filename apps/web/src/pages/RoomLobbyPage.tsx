import { useCallback, useEffect, useState, type ReactElement } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ru } from "../i18n/ru";
import { getRoom, leaveRoom, type RoomView } from "../lib/api";

export function RoomLobbyPage(): ReactElement {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<RoomView | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);

  const loadRoom = useCallback((): void => {
    if (!roomId) {
      return;
    }

    setLoadError(null);

    getRoom(roomId)
      .then(setRoom)
      .catch(() => setLoadError(ru.lobby.loadError));
  }, [roomId]);

  useEffect(() => {
    loadRoom();
  }, [loadRoom]);

  async function handleLeave(): Promise<void> {
    if (!roomId) {
      return;
    }

    setIsLeaving(true);

    try {
      await leaveRoom(roomId);
      navigate("/rooms");
    } catch {
      setLoadError(ru.lobby.loadError);
    } finally {
      setIsLeaving(false);
    }
  }

  if (loadError) {
    return <p role="alert">{loadError}</p>;
  }

  if (!room) {
    return <p>{ru.common.loading}</p>;
  }

  return (
    <main>
      <h1>{ru.lobby.title}</h1>
      <p>
        {ru.lobby.codeLabel}: <strong>{room.code}</strong>
      </p>
      <h2>{ru.lobby.seatsLabel}</h2>
      <ul>
        {Array.from({ length: room.maxSeats }, (_, seatIndex) => {
          const seat = room.seats.find((candidate) => candidate.seatIndex === seatIndex);
          const isHost = seat !== undefined && seat.userId === room.hostUserId;

          return (
            <li key={seatIndex}>
              {seat ? seat.userId : ru.lobby.emptySeat}
              {isHost ? ` (${ru.lobby.hostBadge})` : ""}
            </li>
          );
        })}
      </ul>
      <button type="button" onClick={handleLeave} disabled={isLeaving}>
        {ru.lobby.leaveButton}
      </button>
    </main>
  );
}
