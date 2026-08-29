import { unstable_rethrow } from "next/navigation";
import { AppError, isDuplicateKeyError, newReferenceId, toPublicError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export type ActionState = {
  error?: string;
  message?: string;
  referenceId?: string;
  inviteToken?: string | null;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
};

export async function runAction(fn: () => Promise<void | ActionState>): Promise<ActionState> {
  const referenceId = newReferenceId();
  try {
    const result = await fn();
    return result ?? {};
  } catch (error) {
    unstable_rethrow(error);
    if (isDuplicateKeyError(error)) {
      return { error: "That record already exists. Use a different unique value.", referenceId };
    }
    const publicError = toPublicError(error, referenceId);
    logger.error("action.failed", {
      referenceId,
      name: error instanceof Error ? error.name : "unknown",
      message: error instanceof AppError ? error.message : "hidden",
    });
    return publicError;
  }
}

export function oids(formData: FormData, name: string) {
  return formData
    .getAll(name)
    .map((value) => String(value).trim())
    .filter((value) => /^[a-f\d]{24}$/i.test(value));
}

export function formValues(formData: FormData, keys: string[]) {
  return Object.fromEntries(keys.map((key) => [key, String(formData.get(key) ?? "")]));
}
