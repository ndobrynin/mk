-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "hostUserId" TEXT NOT NULL,
    "maxSeats" INTEGER NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_seats" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seatIndex" INTEGER NOT NULL,

    CONSTRAINT "room_seats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_code_key" ON "rooms"("code");

-- CreateIndex
CREATE UNIQUE INDEX "room_seats_roomId_userId_key" ON "room_seats"("roomId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "room_seats_roomId_seatIndex_key" ON "room_seats"("roomId", "seatIndex");

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_hostUserId_fkey" FOREIGN KEY ("hostUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_seats" ADD CONSTRAINT "room_seats_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_seats" ADD CONSTRAINT "room_seats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
