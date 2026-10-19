import { BookingStatus, Prisma } from "../../generated/prisma/client.js";
import { conflict, notFound } from "../../lib/errors.js";
import { toPage, toSkipTake } from "../../lib/pagination.js";
import { prisma } from "../../lib/prisma.js";
import { isExclusionConstraintViolation, isRecordNotFound } from "../../lib/prisma-errors.js";
import type { AuthUser } from "../auth/token.js";
import {
  assertCancellable,
  assertRoomCapacity,
  assertValidBookingPeriod,
  canManageBooking,
} from "./booking.rules.js";
import type { CreateBookingInput, ListMyBookingsQuery } from "./booking.schemas.js";

const NO_OVERLAP_CONSTRAINT = "bookings_no_overlap";

const bookingInclude = {
  room: { select: { id: true, name: true } },
} satisfies Prisma.BookingInclude;

type BookingWithRoom = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>;

const bookingNotFound = (bookingId: string) => notFound(`Booking ${bookingId} was not found.`);

const roomUnavailable = () => conflict("The room is already booked for this period.");

export const toBookingResponse = (booking: BookingWithRoom) => ({
  id: booking.id,
  title: booking.title,
  attendees: booking.attendees,
  startsAt: booking.startsAt,
  endsAt: booking.endsAt,
  status: booking.status,
  cancelledAt: booking.cancelledAt,
  userId: booking.userId,
  room: booking.room,
});

export const createBooking = async (user: AuthUser, input: CreateBookingInput, now = new Date()) => {
  assertValidBookingPeriod(input.startsAt, input.endsAt, now);

  const room = await prisma.room.findUnique({ where: { id: input.roomId } });

  if (!room || !room.isActive) {
    throw notFound(`Room ${input.roomId} was not found.`);
  }

  assertRoomCapacity(input.attendees, room.capacity);

  const overlappingBooking = await prisma.booking.findFirst({
    where: {
      roomId: room.id,
      status: BookingStatus.CONFIRMED,
      startsAt: { lt: input.endsAt },
      endsAt: { gt: input.startsAt },
    },
    select: { id: true },
  });

  if (overlappingBooking) {
    throw roomUnavailable();
  }

  try {
    const booking = await prisma.booking.create({
      data: {
        roomId: room.id,
        userId: user.id,
        title: input.title,
        attendees: input.attendees,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
      },
      include: bookingInclude,
    });

    return toBookingResponse(booking);
  } catch (error) {
    if (isExclusionConstraintViolation(error, NO_OVERLAP_CONSTRAINT)) {
      throw roomUnavailable();
    }

    throw error;
  }
};

export const listMyBookings = async (user: AuthUser, query: ListMyBookingsQuery, now = new Date()) => {
  const where: Prisma.BookingWhereInput = { userId: user.id };

  if (query.status !== undefined) {
    where.status = query.status;
  }

  if (query.scope === "upcoming") {
    where.endsAt = { gt: now };
  }

  if (query.scope === "past") {
    where.endsAt = { lte: now };
  }

  const [bookings, totalCount] = await prisma.$transaction([
    prisma.booking.findMany({
      where,
      include: bookingInclude,
      orderBy: { startsAt: query.scope === "upcoming" ? "asc" : "desc" },
      ...toSkipTake(query),
    }),
    prisma.booking.count({ where }),
  ]);

  return toPage(bookings.map(toBookingResponse), totalCount, query);
};

const findManageableBooking = async (user: AuthUser, bookingId: string) => {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: bookingInclude });

  if (!booking || !canManageBooking(user, booking)) {
    throw bookingNotFound(bookingId);
  }

  return booking;
};

export const getBooking = async (user: AuthUser, bookingId: string) =>
  toBookingResponse(await findManageableBooking(user, bookingId));

export const cancelBooking = async (user: AuthUser, bookingId: string, now = new Date()) => {
  const booking = await findManageableBooking(user, bookingId);

  if (booking.status === BookingStatus.CANCELLED) {
    throw conflict("This booking is already cancelled.");
  }

  assertCancellable(booking.startsAt, now);

  try {
    const cancelledBooking = await prisma.booking.update({
      where: { id: booking.id, status: BookingStatus.CONFIRMED },
      data: { status: BookingStatus.CANCELLED, cancelledAt: now },
      include: bookingInclude,
    });

    return toBookingResponse(cancelledBooking);
  } catch (error) {
    if (isRecordNotFound(error)) {
      throw conflict("This booking is already cancelled.");
    }

    throw error;
  }
};
