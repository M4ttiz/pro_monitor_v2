import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEYLEN = 64;

export const hashPassword = (password: string): string => {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEYLEN).toString("hex");
  return `${salt}:${hash}`;
};

export const verifyPassword = (password: string, storedValue: string): boolean => {
  if (!storedValue.includes(":")) {
    // Backward compatibility for old plain-text seeded users.
    return storedValue === password;
  }

  const [salt, storedHash] = storedValue.split(":");
  if (!salt || !storedHash) {
    return false;
  }

  const computed = scryptSync(password, salt, KEYLEN);
  const original = Buffer.from(storedHash, "hex");
  if (computed.length !== original.length) {
    return false;
  }

  return timingSafeEqual(computed, original);
};
