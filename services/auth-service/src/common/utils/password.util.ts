import bcrypt from 'bcrypt';
import { env } from '@config/env';

export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, env.BCRYPT_SALT_ROUNDS);
}

export async function comparePassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

/**
 * Minimum password strength policy, enforced independently of the DTO
 * validator so it stays centralized: 8+ chars, at least one uppercase,
 * one lowercase, one digit, one special character.
 */
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/;

export function isStrongPassword(plainText: string): boolean {
  return STRONG_PASSWORD_REGEX.test(plainText);
}
