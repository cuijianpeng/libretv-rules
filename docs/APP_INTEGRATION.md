# App 与规则包集成

> 规则包协议、验签、加载、引擎映射。

## 1. 数据流

```
App 启动
  │
  ├─ RULEPACK_URL 为空 → 读 assets/rulepack/
  │
  └─ RULEPACK_URL 有值
       ├─ GET manifest.json
       ├─ 去掉 signature，canonical JSON，Ed25519 验签
       ├─ 逐文件 GET + SHA256
       ├─ 解析 sources/*.json 和 rules/*.json
       └─ 任一步失败 → 回退 assets/rulepack/
```

## 2. manifest 格式

```json
{
  "schemaVersion": 1,
  "id": "libretv-rules",
  "version": 1,
  "minAppVersion": "0.1.0",
  "publishedAt": "2026-11-02T07:41:11.531Z",
  "files": [
    { "path": "sources/vod.json", "sha256": "..." },
    { "path": "rules/cms-standard.json", "sha256": "..." }
  ],
  "signature": "base64..."
}
```

- `version` 单调递增。
- `files[].path` 相对 manifest 所在目录。
- `signature` 为空表示未签名（仅开发）。
- App 应检查 `minAppVersion` 和规则 `engine` 是否支持。

## 3. 签名规范

签名对象：

1. 取 manifest；
2. 删除 `signature` 字段；
3. 对象键名递归排序；
4. 数组保持顺序；
5. 无多余空白；
6. 对得到的 UTF-8 字节做 Ed25519 签名；
7. Base64 写回 `signature`。

Node 端：`scripts/signing.mjs` + `scripts/lib.mjs` 的 `canonicalize`。
Dart 端：`lib/data/rulepack/canonical_json.dart`。

两边必须完全一致。已有跨语言测试：

- Node 生成的 manifest + 公钥在 `libretv_app/test/fixtures/`
- Dart `verifyRulePackSignature` 验签通过

## 4. 公钥

App 需要 **32 字节 Ed25519 原始公钥的 Base64**，不是 PEM。

```bash
cd libretv-rules
npm run public-key
```

输出示例（仅格式示意）：

```
wCt3pHJ/aDpOEuQSPOlc0DFC/v+2TXkCEKdJicODJaI=
```

填到：

```bash
--dart-define=RULEPACK_PUBLIC_KEY=<输出>
```

公钥可以公开；私钥只放本地 `keys/private.pem` 或 CI Secret。

## 5. App 配置

`lib/data/rulepack/rulepack_config.dart`：

- `RULEPACK_URL`：远程 manifest 地址，空则只用内置。
- `RULEPACK_PUBLIC_KEY`：原始公钥 Base64，空则跳过验签（仅开发）。
- 超时：10 秒。

运行：

```bash
flutter run -d macos \
  --dart-define=RULEPACK_URL=https://cdn.jsdelivr.net/gh/cuijianpeng/libretv-rules@v2/manifest.json \
  --dart-define=RULEPACK_PUBLIC_KEY=<公钥>
```

## 6. App 文件结构

```
lib/data/rulepack/
├─ models.dart             # Manifest / SourceEntry / ParserRule / LoadedRulePack
├─ canonical_json.dart     # 键排序 + jsonEncode
├─ signature.dart          # Ed25519 验签
├─ rulepack_config.dart    # dart-define
├─ rulepack_loader.dart    # 远程/内置加载 + SHA256 + 回退
└─ rule_engine.dart        # 规则解释器

lib/data/media/
├─ media_item.dart         # UI 用媒体模型
└─ search_models.dart      # SearchItem / VideoDetail
```

内置基线：

```
assets/rulepack/
├─ manifest.json
├─ sources/
└─ rules/
```

## 7. 规则引擎能力

| engine | 搜索 | 详情 | 说明 |
|---|---|---|---|
| `cms-json` | ✅ | ✅ | 标准 Apple CMS，含详情页 HTML 兜底 |
| `http-json` | ✅ | ✅ | JSONPath 子集映射 |
| `html-regex` | — | ✅ | 详情页正则提取 m3u8 |
| `direct` | — | ✅ | 直链 |
| `m3u` | 待直播模块 | 待直播模块 | 频道列表 |
| `xmltv` | 待直播模块 | 待直播模块 | 节目单 |

### URL 模板

`{baseUrl}`、`{keyword}`、`{page}`、`{id}`。

### JSONPath 子集

支持：

- `$.data.list`
- `data.list`
- `$.items[0].id`

不支持过滤器、通配符、递归下降。复杂接口请用 `http-json` 能覆盖的字段，或后续加内置引擎。

### CMS 分集

```
线路1$$$线路2
每线路：第01集$https://...m3u8#第02集$https://...m3u8
```

- 先按 `$$$` 分线路，再按 `#` 分集；
- 优先选择包含 `.m3u8` 的线路；
- 都没有时回退第一条。

## 8. 安全边界

App 端必须保持：

- 只请求 http(s)；
- 不执行远程 JS/JAR；
- 不把规则 URL 自动交给系统浏览器；
- 限制超时和响应大小；
- 不携带用户凭证；
- 规则包签名只证明来源，不证明内容安全；
- 源站可能失效/被劫持，需要允许用户停用。

## 9. 版本与回滚

- `manifest.version` 每次发布 +1；
- GitHub tag 用 `v<version>`；
- App 使用固定 tag，避免分支漂移；
- 加载失败保留上一版/内置基线；
- 以后可加本地缓存目录和 last-known-good。

## 10. 测试

```bash
cd libretv_app
flutter test
```

覆盖：

- CMS 搜索/详情
- 多线路选择
- JSON API 映射
- 内置规则包加载
- Node → Dart 跨语言验签
- Dart 签名/篡改检测
- 首页渲染
