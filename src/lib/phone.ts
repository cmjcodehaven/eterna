export function onlyDigits(value: string): string {
  if (!value) return "";
  return value.replace(/\D/g, "");
}

export function normalizePhoneBR(value: string): string {
  return onlyDigits(value);
}

export function isValidPhoneBR(value: string): boolean {
  const digits = normalizePhoneBR(value);
  return digits.length === 10 || digits.length === 11;
}

export function formatPhoneBR(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}
