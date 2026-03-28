export function asNonEmptyString(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function asEnum<T extends readonly string[]>(value: unknown, choices: T): T[number] | null {
  if (typeof value !== 'string') return null;
  return choices.includes(value) ? value : null;
}

export function asFiniteNumber(value: unknown) {
  if (typeof value !== 'number') return null;
  return Number.isFinite(value) ? value : null;
}

export function asNullableNumber(value: unknown) {
  if (value === null || typeof value === 'undefined') return null;
  return asFiniteNumber(value);
}
