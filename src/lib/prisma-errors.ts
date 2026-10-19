import { z } from "zod";
import { Prisma } from "../generated/prisma/client.js";

const EXCLUSION_VIOLATION_SQL_STATE = "23P01";

const driverAdapterErrorSchema = z.object({
  driverAdapterError: z.object({
    cause: z.object({
      originalCode: z.string(),
      originalMessage: z.string(),
    }),
  }),
});

const hasPrismaCode = (error: unknown, code: string) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;

export const isUniqueConstraintViolation = (error: unknown) => hasPrismaCode(error, "P2002");

export const isRecordNotFound = (error: unknown) => hasPrismaCode(error, "P2025");

export const isExclusionConstraintViolation = (error: unknown, constraintName: string) => {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  const parsed = driverAdapterErrorSchema.safeParse(error.meta);

  return (
    parsed.success &&
    parsed.data.driverAdapterError.cause.originalCode === EXCLUSION_VIOLATION_SQL_STATE &&
    parsed.data.driverAdapterError.cause.originalMessage.includes(constraintName)
  );
};
