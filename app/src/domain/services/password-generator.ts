import { randomInt } from 'node:crypto';

const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
const SPECIAL = '!@#$%^&*()_+-=';
const ALL_CHARS = LOWERCASE + UPPERCASE + DIGITS + SPECIAL;
const PASSWORD_LENGTH = 12;

function pick(charset: string): string {
  return charset[randomInt(charset.length)];
}

function shuffle(chars: string[]): string[] {
  const result = [...chars];

  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

export class PasswordGenerator {
  /**
   * Gera uma senha inicial forte (spec §9.2): mínimo de 12 caracteres,
   * garantindo ao menos um caractere de cada categoria exigida pelo
   * PASSWORD_REGEX do domínio, com randomização criptograficamente segura.
   */
  static generate(): string {
    const guaranteed = [pick(LOWERCASE), pick(UPPERCASE), pick(DIGITS), pick(SPECIAL)];
    const remainingLength = PASSWORD_LENGTH - guaranteed.length;
    const remaining = Array.from({ length: remainingLength }, () => pick(ALL_CHARS));

    return shuffle([...guaranteed, ...remaining]).join('');
  }
}
