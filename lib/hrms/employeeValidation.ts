export type EmployeePayload = Record<string, any>;

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const AADHAAR_REGEX = /^[0-9]{12}$/;
const PF_REGEX = /^[A-Z0-9\/-]{6,30}$/i;

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function validateEmployeePayload(payload: EmployeePayload) {
  const errors: string[] = [];

  if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(payload.email))) {
    errors.push('Invalid email format');
  }

  if (payload.pan) {
    payload.pan = String(payload.pan).toUpperCase().trim();
    if (!PAN_REGEX.test(payload.pan)) errors.push('Invalid PAN format');
  }

  if (payload.aadhaar) {
    payload.aadhaar = String(payload.aadhaar).replace(/\D/g, '');
    if (!AADHAAR_REGEX.test(payload.aadhaar)) errors.push('Invalid Aadhaar format (12 digits required)');
  }

  if (payload.pf_number) {
    payload.pf_number = String(payload.pf_number).toUpperCase().trim();
    if (!PF_REGEX.test(payload.pf_number)) errors.push('Invalid PF number format');
  }

  const dateFields = ['date_of_birth', 'joining_date', 'date_of_joining'];
  for (const field of dateFields) {
    if (payload[field] && !isIsoDate(String(payload[field]))) {
      errors.push(`Invalid date format for ${field}. Use YYYY-MM-DD`);
    }
  }

  return { valid: errors.length === 0, errors, normalized: payload };
}
