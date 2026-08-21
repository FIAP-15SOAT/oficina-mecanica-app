function checkDigit(digits: number[], startWeight: number): number {
  const sum = digits.reduce((acc, digit, index) => acc + digit * (startWeight - index), 0);
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

/** Deterministically derives a checksum-valid CPF from a numeric seed (e.g. Date.now()). */
export function generateValidCpf(seed: number): string {
  let base = (Math.abs(Math.trunc(seed)) % 900_000_000) + 100_000_000;
  let digitsStr = base.toString().padStart(9, '0');

  if (/^(\d)\1{8}$/.test(digitsStr)) {
    // Subtract, not add: base can be as high as 999_999_999 (all nines),
    // and adding 1 there would overflow to a 10-digit number.
    base -= 1;
    digitsStr = base.toString().padStart(9, '0');
  }

  const digits = digitsStr.split('').map(Number);
  const d1 = checkDigit(digits, 10);
  const d2 = checkDigit([...digits, d1], 11);

  return [...digits, d1, d2].join('');
}

let sequence = 0;

/** Returns a fresh, checksum-valid, collision-safe CPF on every call across the whole test run. */
export function nextValidCpf(): string {
  sequence += 1;
  return generateValidCpf(Date.now() + sequence);
}
