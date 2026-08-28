import { unstable_rethrow } from "next/navigation";

export type ActionState = {
  error?: string;
  message?: string;
  inviteToken?: string | null;
};

export async function runAction(fn: () => Promise<void | ActionState>): Promise<ActionState> {
  try {
    const result = await fn();
    return result ?? {};
  } catch (error) {
    unstable_rethrow(error);
    return { error: error instanceof Error ? error.message : "Something went wrong" };
  }
}

export function oids(formData: FormData, name: string) {
  return formData
    .getAll(name)
    .map((value) => String(value).trim())
    .filter((value) => /^[a-f\d]{24}$/i.test(value));
}
