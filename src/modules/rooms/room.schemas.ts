import { z } from "zod";
import { dateRangeSchema, dateTimeSchema } from "../../lib/date-range.js";
import { paginationSchema } from "../../lib/pagination.js";

const roomFields = z.object({
  name: z.string().trim().min(1).max(100),
  capacity: z.int().min(1).max(500),
  floor: z.int().min(-5).max(100),
  equipment: z
    .array(z.string().trim().toLowerCase().min(1).max(50))
    .max(20)
    .transform((items) => [...new Set(items)]),
});

export const createRoomSchema = roomFields.extend({
  equipment: roomFields.shape.equipment.default([]),
});

export const updateRoomSchema = roomFields
  .partial()
  .extend({ isActive: z.boolean().optional() })
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one field must be provided.",
  });

export const roomParamsSchema = z.object({
  roomId: z.uuid(),
});

export const listRoomsQuerySchema = paginationSchema
  .extend({
    minCapacity: z.coerce.number().int().min(1).optional(),
    equipment: z.string().trim().toLowerCase().min(1).optional(),
    availableFrom: dateTimeSchema.optional(),
    availableTo: dateTimeSchema.optional(),
  })
  .refine((query) => (query.availableFrom === undefined) === (query.availableTo === undefined), {
    message: "availableFrom and availableTo must be provided together.",
    path: ["availableTo"],
  })
  .refine((query) => !query.availableFrom || !query.availableTo || query.availableFrom < query.availableTo, {
    message: "availableTo must be after availableFrom.",
    path: ["availableTo"],
  });

export const roomScheduleQuerySchema = dateRangeSchema(31);

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
export type ListRoomsQuery = z.infer<typeof listRoomsQuerySchema>;
export type RoomScheduleQuery = z.infer<typeof roomScheduleQuerySchema>;
