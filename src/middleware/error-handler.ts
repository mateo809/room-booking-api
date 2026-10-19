import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { AppError, notFound } from "../lib/errors.js";

const isMalformedJson = (error: unknown) =>
  error instanceof SyntaxError && "type" in error && error.type === "entity.parse.failed";

export const notFoundHandler: RequestHandler = (req) => {
  throw notFound(`Route ${req.method} ${req.path} does not exist.`);
};

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "The request is invalid.",
        details: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
    });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({ error: { code: error.code, message: error.message } });
    return;
  }

  if (isMalformedJson(error)) {
    res.status(400).json({ error: { code: "INVALID_JSON", message: "The request body is not valid JSON." } });
    return;
  }

  req.log.error({ err: error }, "Unhandled error");
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." } });
};
