import { Inject } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import jwt from 'jsonwebtoken';
import type { Server, Socket } from 'socket.io';
import { GameService } from './game.service.js';
import { parseGameCommand, type CommandResult } from './game.types.js';

interface GameSession {
  userId: string;
  roomId: string;
}

interface HandshakeAuth {
  token?: string;
  roomId?: string;
}

function extractHandshakeAuth(client: Socket): HandshakeAuth {
  const auth = client.handshake.auth as Record<string, unknown> | undefined;
  const query = client.handshake.query as Record<string, unknown> | undefined;

  const token =
    typeof auth?.token === 'string'
      ? auth.token
      : typeof query?.token === 'string'
        ? query.token
        : undefined;

  const roomId =
    typeof auth?.roomId === 'string'
      ? auth.roomId
      : typeof query?.roomId === 'string'
        ? query.roomId
        : undefined;

  return { token, roomId };
}

function verifyAccessToken(token: string): string | undefined {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    return typeof payload !== 'string' && typeof payload.sub === 'string' ? payload.sub : undefined;
  } catch {
    return undefined;
  }
}

@WebSocketGateway()
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server!: Server;

  private readonly sessions = new Map<string, GameSession>();

  constructor(@Inject(GameService) private readonly gameService: GameService) {}

  async handleConnection(client: Socket): Promise<void> {
    const { token, roomId } = extractHandshakeAuth(client);

    if (!token || !roomId) {
      client.emit('error', { message: 'token and roomId are required' });
      client.disconnect(true);
      return;
    }

    const userId = verifyAccessToken(token);

    if (!userId) {
      client.emit('error', { message: 'invalid or missing token' });
      client.disconnect(true);
      return;
    }

    try {
      const room = await this.gameService.assertSeated(roomId, userId);
      this.sessions.set(client.id, { userId, roomId });
      await client.join(roomId);

      const roomState = await this.gameService.buildRoomStateView(room);
      client.emit('room.state', roomState);

      const snapshot = await this.gameService.getSnapshot(roomId);
      if (snapshot) {
        client.emit('game.snapshot', snapshot);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'could not join room';
      client.emit('error', { message });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    this.sessions.delete(client.id);
  }

  private requireSession(client: Socket): GameSession {
    const session = this.sessions.get(client.id);

    if (!session) {
      throw new Error('socket is not associated with a room');
    }

    return session;
  }

  @SubscribeMessage('room.setReady')
  async onSetReady(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { ready?: unknown },
  ): Promise<CommandResult> {
    try {
      const { userId, roomId } = this.requireSession(client);
      const ready = body?.ready === true;
      const roomState = await this.gameService.setReady(roomId, userId, ready);
      this.server.to(roomId).emit('room.state', roomState);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'setReady failed' };
    }
  }

  @SubscribeMessage('room.start')
  async onStart(@ConnectedSocket() client: Socket): Promise<CommandResult> {
    try {
      const { userId, roomId } = this.requireSession(client);
      const { room, state } = await this.gameService.startGame(roomId, userId);
      this.server.to(roomId).emit('room.state', room);
      this.server.to(roomId).emit('game.snapshot', state);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'start failed' };
    }
  }

  @SubscribeMessage('roll')
  onRoll(@ConnectedSocket() client: Socket): Promise<CommandResult> {
    return this.dispatchCommand('roll', client, undefined);
  }

  @SubscribeMessage('chooseDiceCount')
  onChooseDiceCount(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: unknown,
  ): Promise<CommandResult> {
    return this.dispatchCommand('chooseDiceCount', client, body);
  }

  @SubscribeMessage('keepTwo')
  onKeepTwo(@ConnectedSocket() client: Socket, @MessageBody() body: unknown): Promise<CommandResult> {
    return this.dispatchCommand('keepTwo', client, body);
  }

  @SubscribeMessage('reroll')
  onReroll(@ConnectedSocket() client: Socket): Promise<CommandResult> {
    return this.dispatchCommand('reroll', client, undefined);
  }

  @SubscribeMessage('keepRoll')
  onKeepRoll(@ConnectedSocket() client: Socket): Promise<CommandResult> {
    return this.dispatchCommand('keepRoll', client, undefined);
  }

  @SubscribeMessage('harborAdd')
  onHarborAdd(@ConnectedSocket() client: Socket): Promise<CommandResult> {
    return this.dispatchCommand('harborAdd', client, undefined);
  }

  @SubscribeMessage('harborSkip')
  onHarborSkip(@ConnectedSocket() client: Socket): Promise<CommandResult> {
    return this.dispatchCommand('harborSkip', client, undefined);
  }

  @SubscribeMessage('pickPlayer')
  onPickPlayer(@ConnectedSocket() client: Socket, @MessageBody() body: unknown): Promise<CommandResult> {
    return this.dispatchCommand('pickPlayer', client, body);
  }

  @SubscribeMessage('pickCard')
  onPickCard(@ConnectedSocket() client: Socket, @MessageBody() body: unknown): Promise<CommandResult> {
    return this.dispatchCommand('pickCard', client, body);
  }

  @SubscribeMessage('pickEstablishmentType')
  onPickEstablishmentType(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: unknown,
  ): Promise<CommandResult> {
    return this.dispatchCommand('pickEstablishmentType', client, body);
  }

  @SubscribeMessage('buildEstablishment')
  onBuildEstablishment(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: unknown,
  ): Promise<CommandResult> {
    return this.dispatchCommand('buildEstablishment', client, body);
  }

  @SubscribeMessage('buildLandmark')
  onBuildLandmark(@ConnectedSocket() client: Socket, @MessageBody() body: unknown): Promise<CommandResult> {
    return this.dispatchCommand('buildLandmark', client, body);
  }

  @SubscribeMessage('passBuild')
  onPassBuild(@ConnectedSocket() client: Socket): Promise<CommandResult> {
    return this.dispatchCommand('passBuild', client, undefined);
  }

  @SubscribeMessage('ventureFundDeposit')
  onVentureFundDeposit(@ConnectedSocket() client: Socket): Promise<CommandResult> {
    return this.dispatchCommand('ventureFundDeposit', client, undefined);
  }

  @SubscribeMessage('skip')
  onSkip(@ConnectedSocket() client: Socket): Promise<CommandResult> {
    return this.dispatchCommand('skip', client, undefined);
  }

  private async dispatchCommand(
    eventName: string,
    client: Socket,
    payload: unknown,
  ): Promise<CommandResult> {
    let session: GameSession;

    try {
      session = this.requireSession(client);
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'no active session' };
    }

    const command = parseGameCommand(eventName, payload);

    if (!command) {
      return { ok: false, error: `invalid payload for "${eventName}"` };
    }

    const result = await this.gameService.applyCommand(session.roomId, session.userId, command);

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    this.server.to(session.roomId).emit('game.snapshot', result.state);
    this.server.to(session.roomId).emit('game.events', result.events ?? []);

    if (result.state?.phase === 'gameOver') {
      this.server.to(session.roomId).emit('game.over', { winnerId: result.state.winnerId });
    }

    return { ok: true };
  }
}
