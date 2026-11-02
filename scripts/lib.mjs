import { createHash } from 'node:crypto';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

export async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

export async function writeJson(file, value) {
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export async function fileSha256(file) {
  const data = await readFile(file);
  return createHash('sha256').update(data).digest('hex');
}

export function rel(file) {
  return path.relative(root, file).split(path.sep).join('/');
}

export async function listJsonFiles(dir) {
  const absolute = path.join(root, dir);
  let entries;
  try {
    entries = await readdir(absolute, { withFileTypes: true });
  } catch {
    return [];
  }
  const files = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    files.push(path.join(absolute, entry.name));
  }
  files.sort();
  return files;
}

export async function exists(file) {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

/**
 * 递归按键名排序，保证签名端和验证端得到完全一致的字节序列。
 * 数组保持原顺序，null/基本类型原样返回。
 */
export function canonicalize(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value && typeof value === 'object') {
    const sorted = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = canonicalize(value[key]);
    }
    return sorted;
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

export function fail(message) {
  console.error(`✗ ${message}`);
  process.exitCode = 1;
}

export function ok(message) {
  console.log(`✓ ${message}`);
}
