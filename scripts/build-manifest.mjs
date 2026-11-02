import path from 'node:path';

import {
  canonicalJson,
  exists,
  fileSha256,
  listJsonFiles,
  readJson,
  rel,
  root,
  writeJson,
} from './lib.mjs';
import { signManifest } from './signing.mjs';

function argValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

const manifestPath = path.join(root, 'manifest.json');
const oldManifest = (await exists(manifestPath))
  ? await readJson(manifestPath)
  : null;

const versionArg = argValue('--version');
const version = versionArg
  ? Number.parseInt(versionArg, 10)
  : (oldManifest?.version ?? 0) + 1;

if (!Number.isInteger(version) || version < 1) {
  console.error('✗ --version 必须是正整数');
  process.exit(1);
}

const files = [
  ...(await listJsonFiles('sources')),
  ...(await listJsonFiles('rules')),
];

const entries = [];
for (const file of files) {
  entries.push({
    path: rel(file),
    sha256: await fileSha256(file),
  });
}

entries.sort((a, b) => a.path.localeCompare(b.path));

const manifest = {
  schemaVersion: 1,
  id: oldManifest?.id ?? 'libretv-rules',
  version,
  minAppVersion: oldManifest?.minAppVersion ?? '0.1.0',
  publishedAt: new Date().toISOString(),
  files: entries,
  signature: '',
};

if (process.argv.includes('--sign')) {
  const privateKey =
    process.env.RULEPACK_PRIVATE_KEY ??
    (await exists(path.join(root, 'keys/private.pem'))
      ? await readJsonText(path.join(root, 'keys/private.pem'))
      : null);
  if (!privateKey) {
    console.error(
      '✗ 缺少签名私钥：设置 RULEPACK_PRIVATE_KEY，或把私钥放到 keys/private.pem',
    );
    process.exit(1);
  }
  manifest.signature = signManifest(manifest, privateKey);
}

await writeJson(manifestPath, manifest);

console.log(`✓ manifest.json 已生成：version=${version}`);
console.log(`  files: ${entries.length}`);
if (manifest.signature) {
  console.log('  signature: 已签名');
  console.log(
    `  fingerprint: ${canonicalJson(manifest.files).slice(0, 12)}…`,
  );
} else {
  console.log('  signature: 未签名（发布前运行 npm run sign）');
}

async function readJsonText(file) {
  const { readFile } = await import('node:fs/promises');
  return readFile(file, 'utf8');
}
