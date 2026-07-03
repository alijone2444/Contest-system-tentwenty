import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const Errors = {
  unauthorized: (msg = "Authentication required. Please log in.") =>
    new ApiError(401, "UNAUTHORIZED", msg),
  forbidden: (msg = "You do not have permission to perform this action.") =>
    new ApiError(403, "FORBIDDEN", msg),
  notFound: (msg = "Resource not found.") => new ApiError(404, "NOT_FOUND", msg),
  badRequest: (msg = "Invalid request.") => new ApiError(400, "BAD_REQUEST", msg),
  conflict: (msg = "Conflict.") => new ApiError(409, "CONFLICT", msg),
  tooMany: (msg = "Too many requests. Please slow down.") =>
    new ApiError(429, "RATE_LIMITED", msg),
};

export function ok(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function fail(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { success: false, error: { code: error.code, message: error.message } },
      { status: error.status }
    );
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input.",
          details: error.issues.map((i) => ({
            field: i.path.join("."),
            message: i.message,
          })),
        },
      },
      { status: 400 }
    );
  }
  if (error instanceof SyntaxError) {
    return NextResponse.json(
      { success: false, error: { code: "BAD_JSON", message: "Request body must be valid JSON." } },
      { status: 400 }
    );
  }
  console.error("Unhandled API error:", error);
  return NextResponse.json(
    { success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong." } },
    { status: 500 }
  );
}

/** Wraps a route handler with unified error handling. */
export function handler<T extends unknown[]>(
  fn: (...args: T) => Promise<Response>
): (...args: T) => Promise<Response> {
  return async (...args: T) => {
    try {
      return await fn(...args);
    } catch (e) {
      return fail(e);
    }
  };
}
