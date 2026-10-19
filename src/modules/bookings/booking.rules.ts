import { Role } from "../../generated/prisma/client.js";
import { businessRuleViolation } from "../../lib/errors.js";
import type { AuthUser } from "../auth/token.js";

export const MIN_BOOKING_MINUTES = 15;
export const MAX_BOOKING_MINUTES = 8 * 60;

const MILLISECONDS_PER_MINUTE = 60 * 1000;

export const assertValidBookingPeriod = (startsAt: Date, endsAt: Date, now: Date) => {
  if (startsAt <= now) {
    throw businessRuleViolation("A booking must start in the future.");
  }

  if (endsAt <= startsAt) {
    throw businessRuleViolation("A booking must end after it starts.");
  }

  const durationInMinutes = (endsAt.getTime() - startsAt.getTime()) / MILLISECONDS_PER_MINUTE;

  if (durationInMinutes < MIN_BOOKING_MINUTES) {
    throw businessRuleViolation(`A booking must last at least ${MIN_BOOKING_MINUTES} minutes.`);
  }

  if (durationInMinutes > MAX_BOOKING_MINUTES) {
    throw businessRuleViolation(`A booking cannot last more than ${MAX_BOOKING_MINUTES / 60} hours.`);
  }
};

export const assertRoomCapacity = (attendees: number, capacity: number) => {
  if (attendees > capacity) {
    throw businessRuleViolation(`This room can host up to ${capacity} people.`);
  }
};

export const assertCancellable = (startsAt: Date, now: Date) => {
  if (startsAt <= now) {
    throw businessRuleViolation("A booking that has already started cannot be cancelled.");
  }
};

export const canManageBooking = (user: AuthUser, booking: { userId: string }) =>
  user.role === Role.ADMIN || booking.userId === user.id;
