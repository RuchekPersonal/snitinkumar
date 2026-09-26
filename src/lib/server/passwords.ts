import "server-only";
import { hash, verify } from "@node-rs/argon2";

// Staff passwords are stored only as one-way Argon2id hashes (library defaults follow the
// OWASP recommendation: 19 MiB memory, 2 iterations). Hashes cannot be turned back into
// passwords; login works by hashing the attempt and comparing.

export const MIN_PASSWORD_LENGTH = 10;

export function hashPassword(password: string): Promise<string> {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  return hash(password);
}

export async function verifyPassword(storedHash: string, attempt: string): Promise<boolean> {
  try {
    return await verify(storedHash, attempt);
  } catch {
    return false;
  }
}
