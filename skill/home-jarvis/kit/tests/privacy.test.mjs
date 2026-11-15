// Nothing about the person this was first built for may ship: no names, places, businesses, devices or accounts.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const BAD = /ozone park|saikat|falguni|mahi\b|sadia|aodhara|mahmood|sakib|saikat|santa fe|hyundai|bambu|\bx2d\b|xtool|studio ?os|visual ?(studio|ink|marketing|inked|weddings)|visualstudioslens|canon|nafees|elevenlabs|robinhood|twilio|\bblink\b|furqan|gyro king|howard beach|la fitness|\bSir\b/i;
function* files(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (['node_modules', 'me', '.git', 'vendor'].includes(e.name)) continue; const p = path.join(d, e.name); if (e.isDirectory()) yield* files(p); else if (/\.(m?js|html|md|json|ps1|cmd|css)$/.test(e.name) && !/privacy\.test/.test(e.name)) yield p; } }
test('no personal details of anyone in the shipped files', () => {
  const hits = [];
  for (const f of files(root)) { const t = fs.readFileSync(f, 'utf8').replace(/sakibmahmood39-byte\/home-jarvis-windows/g, ''); const m = BAD.exec(t); if (m) hits.push(`${path.relative(root, f)}: ${m[0]}`); }
  assert.deepEqual(hits, []);
});
