# keys

Ed25519 签名密钥。

## 生成

```bash
openssl genpkey -algorithm ed25519 -out keys/private.pem
openssl pkey -in keys/private.pem -pubout -out keys/public.pem
```

- `keys/private.pem` **不要提交**，已在 `.gitignore` 中忽略；
- `keys/public.pem` 可以提交，App 会内置同一把公钥；
- CI 签名时把私钥放进 GitHub Secret `RULEPACK_PRIVATE_KEY`。

## 轮换

公钥内置在 App 里，私钥泄露后只能通过发新版 App 更换公钥。
因此私钥建议离线保存，CI 只读取 Secret。

## 签名规范

签名对象是 **去掉 `signature` 字段后的 manifest**，按键名递归排序、
数组保持顺序、无空白，再做 Ed25519 签名，结果 Base64 放入 `signature`。

App 端必须使用完全相同的规范化方式，否则验签会失败。
