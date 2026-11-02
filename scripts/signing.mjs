import crypto from 'node:crypto';

import { canonicalJson } from './lib.mjs';

/**
 * 签名对象是「去掉 signature 字段后的 manifest，按键名递归排序」。
 * App 端必须使用同样的规范化方式，否则验签失败。
 */
export function signManifest(manifest, privateKeyPem) {
  const { signature: _ignored, ...unsigned } = manifest;
  const data = Buffer.from(canonicalJson(unsigned), 'utf8');
  const privateKey = crypto.createPrivateKey(privateKeyPem);
  return crypto.sign(null, data, privateKey).toString('base64');
}

export function verifyManifest(manifest, publicKeyPem) {
  if (typeof manifest.signature !== 'string' || !manifest.signature) {
    return false;
  }
  const { signature, ...unsigned } = manifest;
  const data = Buffer.from(canonicalJson(unsigned), 'utf8');
  const publicKey = crypto.createPublicKey(publicKeyPem);
  return crypto.verify(
    null,
    data,
    publicKey,
    Buffer.from(signature, 'base64'),
  );
}
