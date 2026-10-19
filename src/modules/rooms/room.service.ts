import { BookingStatus, type Prisma, type Room } from "../../generated/prisma/client.js";
import { conflict, notFound } from "../../lib/errors.js";
import { toPage, toSkipTake } from "../../lib/pagination.js";
import { prisma } from "../../lib/prisma.js";
import { isRecordNotFound, isUniqueConstraintViolation } from "../../lib/prisma-errors.js";
import type { CreateRoomInput, ListRoomsQuery, RoomScheduleQuery, UpdateRoomInput } from "./room.schemas.js";

const roomNotFound = (roomId: string) => notFound(`Room ${roomId} was not found.`);

const duplicateRoomName = () => conflict("A room with this name already exists.");

export const toRoomResponse = (room: Room) => ({
  id: room.id,
  name: room.name,
  capacity: room.capacity,
  floor: room.floor,
  equipment: room.equipment,
  isActive: room.isActive,
});

export const listRooms = async (query: ListRoomsQuery) => {
  const where: Prisma.RoomWhereInput = { isActive: true };

  if (query.minCapacity !== undefined) {
    where.capacity = { gte: query.minCapacity };
  }

  if (query.equipment !== undefined) {
    where.equipment = { has: query.equipment };
  }

  if (query.availableFrom && query.availableTo) {
    where.bookings = {
      none: {
        status: BookingStatus.CONFIRMED,
        startsAt: { lt: query.availableTo },
        endsAt: { gt: query.availableFrom },
      },
    };
  }

  const [rooms, totalCount] = await prisma.$transaction([
    prisma.room.findMany({ where, orderBy: [{ floor: "asc" }, { name: "asc" }], ...toSkipTake(query) }),
    prisma.room.count({ where }),
  ]);

  return toPage(rooms.map(toRoomResponse), totalCount, query);
};

export const getRoom = async (roomId: string) => {
  const room = await prisma.room.findUnique({ where: { id: roomId } });

  if (!room) {
    throw roomNotFound(roomId);
  }

  return toRoomResponse(room);
};

export const createRoom = async (input: CreateRoomInput) => {
  try {
    return toRoomResponse(await prisma.room.create({ data: input }));
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      throw duplicateRoomName();
    }

    throw error;
  }
};

export const updateRoom = async (roomId: string, input: UpdateRoomInput) => {
  try {
    return toRoomResponse(await prisma.room.update({ where: { id: roomId }, data: input }));
  } catch (error) {
    if (isRecordNotFound(error)) {
      throw roomNotFound(roomId);
    }

    if (isUniqueConstraintViolation(error)) {
      throw duplicateRoomName();
    }

    throw error;
  }
};

export const getRoomSchedule = async (roomId: string, query: RoomScheduleQuery) => {
  await getRoom(roomId);

  return prisma.booking.findMany({
    where: {
      roomId,
      status: BookingStatus.CONFIRMED,
      startsAt: { lt: query.to },
      endsAt: { gt: query.from },
    },
    orderBy: { startsAt: "asc" },
    select: { id: true, title: true, startsAt: true, endsAt: true },
  });
};
