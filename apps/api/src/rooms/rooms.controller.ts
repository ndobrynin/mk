import { Body, Controller, Get, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedUser, JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RoomsService, RoomView } from './rooms.service.js';

interface RequestWithUser {
  user: AuthenticatedUser;
}

interface CreateRoomBody {
  maxSeats: unknown;
  isPublic: unknown;
}

interface JoinByCodeBody {
  code: unknown;
}

@Controller('rooms')
@UseGuards(JwtAuthGuard)
export class RoomsController {
  constructor(@Inject(RoomsService) private readonly roomsService: RoomsService) {}

  @Post()
  createRoom(
    @Req() req: RequestWithUser,
    @Body() body: CreateRoomBody,
  ): Promise<RoomView> {
    return this.roomsService.createRoom(req.user.id, body?.maxSeats, body?.isPublic);
  }

  @Get()
  listRooms(): Promise<RoomView[]> {
    return this.roomsService.listPublicWaitingRooms();
  }

  @Post('join')
  joinByCode(
    @Req() req: RequestWithUser,
    @Body() body: JoinByCodeBody,
  ): Promise<RoomView> {
    return this.roomsService.joinRoomByCode(req.user.id, body?.code);
  }

  @Get(':id')
  getRoom(@Param('id') id: string): Promise<RoomView> {
    return this.roomsService.getRoomById(id);
  }

  @Post(':id/join')
  joinById(@Req() req: RequestWithUser, @Param('id') id: string): Promise<RoomView> {
    return this.roomsService.joinRoomById(req.user.id, id);
  }

  @Post(':id/leave')
  async leaveRoom(@Req() req: RequestWithUser, @Param('id') id: string): Promise<{ ok: true }> {
    await this.roomsService.leaveRoom(req.user.id, id);
    return { ok: true };
  }
}
