import { z } from "zod";
import { BookingStatus } from "../../generated/prisma/client.js";
import { dateTimeSchema } from "../../lib/date-range.js";
import { paginationSchema } from "../../lib/pagination.js";

export const createBookingSchema = z.object({
  roomId: z.uuid(),
  title: z.string().trim().min(1).max(120),
  attendees: z.int().min(1).max(500),
  startsAt: dateTimeSchema,
  endsAt: dateTimeSchema,
});

export const bookingParamsSchema = z.object({
  bookingId: z.uuid(),
});

export const listMyBookingsQuerySchema = paginationSchema.extend({
  scope: z.enum(["upcoming", "past", "all"]).default("upcoming"),
  status: z.enum(BookingStatus).optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type ListMyBookingsQuery = z.infer<typeof listMyBookingsQuerySchema>;
