import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  exists,
  fileSha256,
  listJsonFiles,
  ok,
  readJson,
  rel,
  root,
} from './lib.mjs';

const ALLOWED_ENGINES = new Set([
  'cms-json',
  'http-json',
  'html-regex',
  'archive-org',
  'nasa',
  'm3u',
  'xmltv',
  'direct',
]);

const ALLOWED_CAPABILITIES = new Set([
  'search',
  'detail',
  'play',
  'live',
  'epg',
]);

const requireSignature = process.argv.includes('--require-signature');
const errors = [];
const warnings = [];

function error(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function assert(condition, message) {
  if (!condition) error(message);
}

function isHttpUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

async function loadCatalog(file, kind) {
  const absolute = path.join(root, file);
  if (!(await exists(absolute))) {
    error(`${file} 不存在`);
    return null;
  }
  let data;
  try {
    data = await readJson(absolute);
  } catch (err) {
    error(`${file} 不是合法 JSON：${err.message}`);
    return null;
  }
  assert(Number.isInteger(data.version) && data.version >= 1, `${file} 缺少合法 version`);
  assert(Array.isArray(data.sources), `${file} 缺少 sources 数组`);
  if (!Array.isArray(data.sources)) return data;

  const ids = new Set();
  for (const [index, source] of data.sources.entries()) {
    const where = `${file} sources[${index}]`;
    for (const field of ['id', 'name', 'url', 'rule']) {
      assert(
        typeof source[field] === 'string' && source[field].trim(),
        `${where} 缺少 ${field}`,
      );
    }
    assert(
      /^[a-z0-9][a-z0-9-]*$/.test(source.id ?? ''),
      `${where} 的 id 只能包含小写字母、数字和连字符`,
    );
    if (ids.has(source.id)) error(`${where} 的 id 重复：${source.id}`);
    ids.add(source.id);
    assert(isHttpUrl(source.url), `${where} 的 url 必须是 http(s)`);
    assert(typeof source.enabled === 'boolean', `${where} 的 enabled 必须是布尔值`);
    if (kind === 'live' && source.epg != null) {
      assert(isHttpUrl(source.epg), `${where} 的 epg 必须是 http(s)`);
    }
  }
  return data;
}

async function loadRules() {
  const files = await listJsonFiles('rules');
  if (files.length === 0) {
    error('rules/ 下没有任何规则');
    return new Map();
  }
  const rules = new Map();
  for (const file of files) {
    let rule;
    try {
      rule = await readJson(file);
    } catch (err) {
      error(`${rel(file)} 不是合法 JSON：${err.message}`);
      continue;
    }
    const where = rel(file);
    for (const field of ['id', 'name', 'engine']) {
      assert(typeof rule[field] === 'string' && rule[field].trim(), `${where} 缺少 ${field}`);
    }
    assert(
      /^[a-z0-9][a-z0-9-]*$/.test(rule.id ?? ''),
      `${where} 的 id 只能包含小写字母、数字和连字符`,
    );
    assert(Number.isInteger(rule.version) && rule.version >= 1, `${where} 缺少合法 version`);
    assert(ALLOWED_ENGINES.has(rule.engine), `${where} 的 engine 不支持：${rule.engine}`);
    assert(Array.isArray(rule.capabilities) && rule.capabilities.length > 0, `${where} 缺少 capabilities`);
    if (Array.isArray(rule.capabilities)) {
      for (const capability of rule.capabilities) {
        assert(
          ALLOWED_CAPABILITIES.has(capability),
          `${where} 的 capability 不支持：${capability}`,
        );
      }
    }
    if (rules.has(rule.id)) error(`${where} 的规则 id 重复：${rule.id}`);
    rules.set(rule.id, rule);
  }
  return rules;
}

async function validateManifest() {
  const file = path.join(root, 'manifest.json');
  if (!(await exists(file))) {
    warn('manifest.json 不存在，跳过 manifest 校验（发布前请运行 npm run build）');
    return;
  }
  let manifest;
  try {
    manifest = await readJson(file);
  } catch (err) {
    error(`manifest.json 不是合法 JSON：${err.message}`);
    return;
  }

  for (const field of ['schemaVersion', 'id', 'version', 'minAppVersion', 'publishedAt']) {
    assert(manifest[field] != null, `manifest.json 缺少 ${field}`);
  }
  assert(Number.isInteger(manifest.version) && manifest.version >= 1, 'manifest.json 的 version 非法');
  assert(Array.isArray(manifest.files), 'manifest.json 的 files 必须是数组');
  assert(typeof manifest.signature === 'string', 'manifest.json 的 signature 必须是字符串');

  if (Array.isArray(manifest.files)) {
    const paths = new Set();
    for (const [index, entry] of manifest.files.entries()) {
      const where = `manifest.json files[${index}]`;
      assert(typeof entry.path === 'string' && entry.path.trim(), `${where} 缺少 path`);
      assert(/^[a-f0-9]{64}$/.test(entry.sha256 ?? ''), `${where} 的 sha256 非法`);
      if (paths.has(entry.path)) error(`${where} 的 path 重复：${entry.path}`);
      paths.add(entry.path);
      if (entry.path.includes('..') || path.isAbsolute(entry.path)) {
        error(`${where} 的 path 不允许越界：${entry.path}`);
        continue;
      }
      const absolute = path.join(root, entry.path);
      if (!(await exists(absolute))) {
        error(`${where} 指向的文件不存在：${entry.path}`);
        continue;
      }
      const actual = await fileSha256(absolute);
      if (actual !== entry.sha256) {
        error(`${entry.path} 的 sha256 不匹配（manifest: ${entry.sha256}, actual: ${actual}）`);
      }
    }
  }

  if (!manifest.signature) {
    if (requireSignature) {
      error('manifest.json 没有签名，但当前要求签名（--require-signature）');
    } else {
      warn('manifest.json 尚未签名；正式发布时请运行 npm run sign');
    }
    return;
  }

  const publicKeyPath = path.join(root, 'keys/public.pem');
  const publicKey = process.env.RULEPACK_PUBLIC_KEY ??
    ((await exists(publicKeyPath)) ? await readFile(publicKeyPath, 'utf8') : null);
  if (!publicKey) {
    warn('manifest.json 有签名，但没有公钥（RULEPACK_PUBLIC_KEY 或 keys/public.pem），跳过验签');
    return;
  }
  try {
    const { verifyManifest } = await import('./signing.mjs');
    const valid = verifyManifest(manifest, publicKey);
    if (!valid) error('manifest.json 签名校验失败');
    else ok('manifest.json 签名有效');
  } catch (err) {
    error(`验签失败：${err.message}`);
  }
}

async function main() {
  console.log('LibreTV rule pack validation\n');

  const rules = await loadRules();
  const vod = await loadCatalog('sources/vod.json', 'vod');
  const live = await loadCatalog('sources/live.json', 'live');

  for (const [label, catalog] of [
    ['sources/vod.json', vod],
    ['sources/live.json', live],
  ]) {
    if (!catalog || !Array.isArray(catalog.sources)) continue;
    for (const source of catalog.sources) {
      if (source.rule && !rules.has(source.rule)) {
        error(`${label} 的源 ${source.id} 引用了不存在的规则：${source.rule}`);
      }
    }
  }

  // fixtures 至少保证是合法 JSON
  for (const file of await listJsonFiles('fixtures')) {
    try {
      await readJson(file);
    } catch (err) {
      error(`${rel(file)} 不是合法 JSON：${err.message}`);
    }
  }

  await validateManifest();

  for (const message of warnings) console.warn(`! ${message}`);
  for (const message of errors) console.error(`✗ ${message}`);

  if (errors.length > 0) {
    console.error(`\n${errors.length} 个错误`);
    process.exitCode = 1;
    return;
  }

  ok(`规则 ${rules.size} 条，点播源 ${vod?.sources?.length ?? 0} 个，直播源 ${live?.sources?.length ?? 0} 个`);
  if (warnings.length === 0) ok('校验通过');
}

await main();
