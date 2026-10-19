export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const unauthorized = (message = "Authentication is required.") =>
  new AppError(401, "UNAUTHORIZED", message);

export const forbidden = (message = "You are not allowed to perform this action.") =>
  new AppError(403, "FORBIDDEN", message);

export const notFound = (message: string) => new AppError(404, "NOT_FOUND", message);

export const conflict = (message: string) => new AppError(409, "CONFLICT", message);

export const businessRuleViolation = (message: string) =>
  new AppError(422, "BUSINESS_RULE_VIOLATION", message);
