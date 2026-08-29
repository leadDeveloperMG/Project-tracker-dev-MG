import { genericError } from "@/lib/copy";

export class AppError extends Error {
  readonly expose: boolean;
  readonly status: number;
  readonly fieldErrors?: Record<string, string>;

  constructor(
    publicMessage: string,
    options?: { status?: number; fieldErrors?: Record<string, string>; expose?: boolean; cause?: unknown },
  ) {
    super(publicMessage, { cause: options?.cause });
    this.name = "AppError";
    this.expose = options?.expose ?? true;
    this.status = options?.status ?? 400;
    this.fieldErrors = options?.fieldErrors;
  }
}

export function newReferenceId() {
  return `TRK-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
}

export function toPublicError(error: unknown, referenceId: string) {
  if (error instanceof AppError && error.expose) {
    return {
      error: error.message,
      referenceId,
      fieldErrors: error.fieldErrors,
    };
  }
  return { error: `${genericError} Reference ${referenceId}.`, referenceId };
}

export function isDuplicateKeyError(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: number }).code === 11000);
}
