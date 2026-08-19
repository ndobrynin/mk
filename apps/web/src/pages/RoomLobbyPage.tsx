import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ru } from "../i18n/ru";
import { getRoom, leaveRoom, type RoomView } from "../lib/api";
import { getAccessToken } from "../lib/auth-storage";
import { createGameSocket, decodeJwtSubject, type GameSocket, type RoomStateView } from "../lib/socket";

interface DisplaySeat {
  userId: string;
  seatIndex: number;
  ready: boolean;
}

export function RoomLobbyPage(): ReactElement {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<RoomView | null>(null);
  const [liveState, setLiveState] = useState<RoomStateView | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const socketRef = useRef<GameSocket | null>(null);
  const selfId = useMemo(() => decodeJwtSubject(getAccessToken()), []);

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

  useEffect(() => {
    if (!roomId) {
      return;
    }

    const socket = createGameSocket(roomId);
    socketRef.current = socket;

    const handleRoomState = (state: RoomStateView): void => setLiveState(state);
    const handleSnapshot = (): void => {
      navigate(`/rooms/${roomId}/table`);
    };
    const handleError = (payload: { message: string }): void => setActionError(payload.message);

    socket.on("room.state", handleRoomState);
    socket.on("game.snapshot", handleSnapshot);
    socket.on("error", handleError);

    return () => {
      socket.off("room.state", handleRoomState);
      socket.off("game.snapshot", handleSnapshot);
      socket.off("error", handleError);
      socket.disconnect();
    };
  }, [roomId, navigate]);

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

  async function handleToggleReady(currentlyReady: boolean): Promise<void> {
    setActionError(null);
    const result = await socketRef.current?.setReady(!currentlyReady);
    if (result && !result.ok) {
      setActionError(result.error ?? ru.lobby.actionError);
    }
  }

  async function handleStart(): Promise<void> {
    setActionError(null);
    const result = await socketRef.current?.start();
    if (result && !result.ok) {
      setActionError(result.error ?? ru.lobby.actionError);
    }
  }

  if (loadError) {
    return <p role="alert">{loadError}</p>;
  }

  if (!room) {
    return <p>{ru.common.loading}</p>;
  }

  const code = liveState?.code ?? room.code;
  const hostUserId = liveState?.hostUserId ?? room.hostUserId;
  const maxSeats = liveState?.maxSeats ?? room.maxSeats;
  const seats: DisplaySeat[] =
    liveState?.seats ?? room.seats.map((seat) => ({ userId: seat.userId, seatIndex: seat.seatIndex, ready: false }));
  const mySeat = seats.find((seat) => seat.userId === selfId);
  const isHost = selfId !== undefined && hostUserId === selfId;

  return (
    <main>
      <h1>{ru.lobby.title}</h1>
      <p>
        {ru.lobby.codeLabel}: <strong>{code}</strong>
      </p>
      <h2>{ru.lobby.seatsLabel}</h2>
      <ul>
        {Array.from({ length: maxSeats }, (_, seatIndex) => {
          const seat = seats.find((candidate) => candidate.seatIndex === seatIndex);
          const isSeatHost = seat !== undefined && seat.userId === hostUserId;

          return (
            <li key={seatIndex}>
              {seat ? seat.userId : ru.lobby.emptySeat}
              {isSeatHost ? ` (${ru.lobby.hostBadge})` : ""}
              {seat ? ` — ${seat.ready ? ru.lobby.readyBadge : ru.lobby.notReadyBadge}` : ""}
            </li>
          );
        })}
      </ul>
      {mySeat ? (
        <button type="button" onClick={() => handleToggleReady(mySeat.ready)}>
          {mySeat.ready ? ru.lobby.notReadyButton : ru.lobby.readyButton}
        </button>
      ) : null}
      {isHost ? (
        <button type="button" onClick={handleStart}>
          {ru.lobby.startButton}
        </button>
      ) : null}
      {actionError ? <p role="alert">{actionError}</p> : null}
      <button type="button" onClick={handleLeave} disabled={isLeaving}>
        {ru.lobby.leaveButton}
      </button>
    </main>
  );
}
