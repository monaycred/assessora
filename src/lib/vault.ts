import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
function key() {
  const value = process.env.VAULT_ENCRYPTION_KEY;
  if (!value) throw new Error('Cofre não configurado');
  return Buffer.from(value, 'base64').subarray(0, 32);
}
export function encryptSecret(secret: string) {
  const iv=randomBytes(12); const cipher=createCipheriv('aes-256-gcm',key(),iv);
  const encrypted=Buffer.concat([cipher.update(secret,'utf8'),cipher.final()]);
  return [iv.toString('base64'),cipher.getAuthTag().toString('base64'),encrypted.toString('base64')].join('.');
}
export function decryptSecret(payload: string) {
  const [iv,tag,data]=payload.split('.'); const decipher=createDecipheriv('aes-256-gcm',key(),Buffer.from(iv,'base64'));
  decipher.setAuthTag(Buffer.from(tag,'base64'));
  return Buffer.concat([decipher.update(Buffer.from(data,'base64')),decipher.final()]).toString('utf8');
}
