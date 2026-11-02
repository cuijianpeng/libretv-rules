import crypto from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { root } from './lib.mjs';

const file = path.join(root, 'keys/public.pem');
let pem;
try {
  pem = await readFile(file, 'utf8');
} catch {
  console.error('✗ keys/public.pem 不存在，先生成密钥');
  process.exit(1);
}

// Ed25519 SPKI DER 的最后 32 字节就是原始公钥。
const der = crypto.createPublicKey(pem).export({
  type: 'spki',
  format: 'der',
});
const raw = der.subarray(der.length - 32);
console.log(raw.toString('base64'));
