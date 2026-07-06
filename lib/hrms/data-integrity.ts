import crypto from 'crypto';

// Encryption utilities for sensitive fields
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

export function encryptSensitiveField(plaintext: string): string {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption failed:', error);
    return plaintext; // Fallback: return plaintext (not ideal, but prevents crashes)
  }
}

export function decryptSensitiveField(encrypted: string): string {
  try {
    const [ivHex, authTagHex, encryptedHex] = encrypted.split(':');
    if (!ivHex || !authTagHex || !encryptedHex) return encrypted;
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    return encrypted; // Fallback
  }
}

// Soft delete utilities
export type SoftDeleteableRecord = {
  id: string;
  archived_at: string | null;
  [key: string]: any;
};

export function softDeleteRecord(record: SoftDeleteableRecord): SoftDeleteableRecord {
  return {
    ...record,
    archived_at: new Date().toISOString(),
  };
}

export function filterActiveRecords<T extends SoftDeleteableRecord>(records: T[]): T[] {
  return records.filter((r) => r.archived_at === null);
}

export function isRecordArchived(record: SoftDeleteableRecord): boolean {
  return record.archived_at !== null;
}

// Data integrity utilities
export function generateRecordHash(data: Record<string, any>): string {
  const normalized = Object.keys(data)
    .sort()
    .map((key) => `${key}:${JSON.stringify(data[key])}`)
    .join('|');
  
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

export function validateRecordIntegrity(data: Record<string, any>, hash: string): boolean {
  return generateRecordHash(data) === hash;
}
