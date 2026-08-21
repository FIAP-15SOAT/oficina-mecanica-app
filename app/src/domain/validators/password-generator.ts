import { randomInt } from 'node:crypto';

const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
const SPECIAL = '!@#$%&*';
const ALL = LOWER + UPPER + DIGITS + SPECIAL;

function pick(charset: string): string {
  return charset[randomInt(charset.length)];
}

function shuffle(chars: string[]): string[] {
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars;
}

/** Gera uma senha que satisfaz PASSWORD_REGEX (>=8 chars, com minúscula, maiúscula, dígito e caractere especial). */
export function generateSecurePassword(length = 12): string {
  const required = [pick(LOWER), pick(UPPER), pick(DIGITS), pick(SPECIAL)];
  const rest = Array.from({ length: length - required.length }, () => pick(ALL));

  return shuffle([...required, ...rest]).join('');
}
