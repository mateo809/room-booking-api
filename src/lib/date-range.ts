import { z } from "zod";

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export const dateTimeSchema = z.iso.datetime({ offset: true }).transform((value) => new Date(value));

export const dateRangeSchema = (maxDays: number) =>
  z
    .object({
      from: dateTimeSchema,
      to: dateTimeSchema,
    })
    .refine((range) => range.from < range.to, {
      message: "The end of the range must be after its start.",
      path: ["to"],
    })
    .refine((range) => range.to.getTime() - range.from.getTime() <= maxDays * MILLISECONDS_PER_DAY, {
      message: `The range cannot exceed ${maxDays} days.`,
      path: ["to"],
    });
