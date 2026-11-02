import path from 'node:path';

import { exists, readJson, root, writeJson } from './lib.mjs';
import { signManifest } from './signing.mjs';

const manifestPath = path.join(root, 'manifest.json');
if (!(await exists(manifestPath))) {
  console.error('✗ manifest.json 不存在，先运行 npm run build');
  process.exit(1);
}

const manifest = await readJson(manifestPath);

let privateKey = process.env.RULEPACK_PRIVATE_KEY;
if (!privateKey) {
  const file = path.join(root, 'keys/private.pem');
  if (!(await exists(file))) {
    console.error(
      '✗ 缺少签名私钥：设置 RULEPACK_PRIVATE_KEY，或把私钥放到 keys/private.pem',
    );
    process.exit(1);
  }
  const { readFile } = await import('node:fs/promises');
  privateKey = await readFile(file, 'utf8');
}

manifest.signature = signManifest(manifest, privateKey);
await writeJson(manifestPath, manifest);
console.log(`✓ manifest.json 已签名（version=${manifest.version}）`);
