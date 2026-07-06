export function isNonEmptyString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function validateRequired(body: Record<string, unknown>, fields: string[]) {
  const missing = fields.filter((f) => !isNonEmptyString(body[f]));
  return { valid: missing.length === 0, missing };
}
