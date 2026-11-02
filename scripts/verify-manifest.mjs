import path from 'node:path';
import { readFile } from 'node:fs/promises';

import { exists, readJson, root } from './lib.mjs';
import { verifyManifest } from './signing.mjs';

const manifestPath = path.join(root, 'manifest.json');
if (!(await exists(manifestPath))) {
  console.error('✗ manifest.json 不存在');
  process.exit(1);
}

const manifest = await readJson(manifestPath);
let publicKey = process.env.RULEPACK_PUBLIC_KEY;
if (!publicKey) {
  const file = path.join(root, 'keys/public.pem');
  if (!(await exists(file))) {
    console.error(
      '✗ 缺少公钥：设置 RULEPACK_PUBLIC_KEY，或把公钥放到 keys/public.pem',
    );
    process.exit(1);
  }
  publicKey = await readFile(file, 'utf8');
}

if (!verifyManifest(manifest, publicKey)) {
  console.error('✗ manifest.json 签名无效');
  process.exit(1);
}

console.log(`✓ manifest.json 签名有效（version=${manifest.version}）`);
