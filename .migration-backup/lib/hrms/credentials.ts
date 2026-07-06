import crypto from 'crypto';

const TEMP_PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*';

export const TEMP_PASSWORD_POLICY = {
  length: 14,
  mustContain: ['uppercase', 'lowercase', 'number', 'symbol'],
};

function randomFromAlphabet(alphabet: string) {
  const index = crypto.randomInt(0, alphabet.length);
  return alphabet[index];
}

function ensureCharacterClasses(password: string) {
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  return hasUppercase && hasLowercase && hasNumber && hasSymbol;
}

export function generateTemporaryPassword() {
  let candidate = '';

  do {
    candidate = Array.from({ length: TEMP_PASSWORD_POLICY.length }, () => randomFromAlphabet(TEMP_PASSWORD_ALPHABET)).join('');
  } while (!ensureCharacterClasses(candidate));

  return candidate;
}

export function temporaryPasswordFingerprint(plainTextPassword: string) {
  const pepper = process.env.HRMS_TEMP_PASSWORD_PEPPER || 'leadflow-hrms-temp-password';
  return crypto.createHash('sha256').update(`${pepper}:${plainTextPassword}`).digest('hex');
}
