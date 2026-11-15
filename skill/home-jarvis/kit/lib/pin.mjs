// The Jarvis PIN: stored only as a salted scrypt hash in me/pin.json. Five wrong tries = 15 minutes with no PIN unlocks.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const file = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'me', 'pin.json');
let fails = 0, blockedUntil = 0;

export const hasPin = () => fs.existsSync(file);
export function validPin(pin) { return /^\d{4,8}$/.test(String(pin || '')) && !/^(\d)\1+$/.test(pin) && !['1234', '12345', '123456', '0000', '4321'].includes(pin); }
export function setPin(pin) {
  if (!validPin(pin)) throw new Error('Use 4 to 8 digits, not all the same and not 1234.');
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(pin), salt, 32).toString('hex');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ salt, hash, set: new Date().toISOString() }));
}
export function checkPin(pin) {
  if (Date.now() < blockedUntil) return { ok: false, blocked: Math.ceil((blockedUntil - Date.now()) / 60000) };
  let rec; try { rec = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return { ok: false, nopin: true }; }
  const got = crypto.scryptSync(String(pin || ''), rec.salt, 32);
  const ok = crypto.timingSafeEqual(got, Buffer.from(rec.hash, 'hex'));
  if (ok) { fails = 0; return { ok: true }; }
  if (++fails >= 5) { blockedUntil = Date.now() + 15 * 60000; fails = 0; return { ok: false, blocked: 15 }; }
  return { ok: false, left: 5 - fails };
}
export function _reset() { fails = 0; blockedUntil = 0; } // tests
