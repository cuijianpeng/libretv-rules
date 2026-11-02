# LibreTV Rules

LibreTV 的**源目录 + 解析规则**仓库。

App 不再把源和解析逻辑写死，而是从这个仓库拉取一个**签名的 JSON 规则包**：

- 新增/下架采集站：改 `sources/*.json`
- 新增/修正解析规则：改 `rules/*.json`
- 发布：生成 `manifest.json` → 签名 → 打 tag
- App：拉 `manifest.json` → 验签 → 校验 hash → 使用

**只允许 JSON，不允许远程 JS/JAR。** 这是保证 App Store 合规和客户端安全的前提。

## 文档

- [总计划](docs/MASTER_PLAN.md)：分阶段目标、验收、执行顺序
- [项目总览](docs/PROJECT.md)：目标、当前状态、架构、决策、限制、路线
- [操作手册](docs/OPERATIONS.md)：环境、命令、发布、Git、排错
- [App 集成](docs/APP_INTEGRATION.md)：manifest、验签、加载器、规则引擎
- [设计系统与播放器](docs/DESIGN_AND_PLAYER.md)：media-first、media_kit、Kazumi 参考
- [变更记录](docs/CHANGELOG.md)：这次做了什么

## 目录

```
libretv-rules/
├─ sources/
│  ├─ vod.json          # 点播源目录
│  └─ live.json         # 直播源目录
├─ rules/
│  ├─ cms-standard.json # 标准 Apple CMS
│  ├─ http-json.json    # 通用 JSON 接口
│  ├─ html-regex.json   # 详情页正则
│  ├─ archive-org.json  # Internet Archive 公共领域影片
│  ├─ m3u.json          # M3U 直播列表
│  ├─ xmltv.json        # XMLTV 节目单
│  └─ direct.json       # 直链播放
├─ schemas/             # JSON Schema，编辑器校验用
├─ fixtures/            # 规则测试样例
├─ scripts/             # 校验、生成 manifest、签名
├─ keys/                # 公钥提交，私钥不提交
└─ manifest.json         # 发布清单（生成）
```

## 快速开始

```bash
npm run validate     # 校验所有 JSON、引用、hash
npm run build        # 重新生成 manifest.json（version +1）
npm run sign         # 用私钥签名 manifest.json
```

Node 20+，无第三方依赖。

## 加一个点播源

编辑 `sources/vod.json`：

```json
{
  "id": "my-cms",
  "name": "我的采集站",
  "type": "cms",
  "url": "https://example.com/api.php/provide/vod",
  "detail": "https://example.com",
  "rule": "cms-standard",
  "enabled": true,
  "tags": ["电影", "剧集"],
  "note": "可选备注"
}
```

规则：

- `id` 必须唯一，只能小写字母、数字、连字符；
- `url` 必须是 `http(s)`；
- `rule` 必须存在于 `rules/`；
- `enabled: false` 表示默认不启用，App 仍可展示但不自动勾选；
- 不要提交任何账号、Cookie、Token 或私有鉴权信息。

## 加一个直播源

编辑 `sources/live.json`：

```json
{
  "id": "my-live",
  "name": "我的直播源",
  "url": "https://example.com/list.m3u",
  "epg": "https://example.com/epg.xml",
  "rule": "m3u",
  "enabled": true,
  "tags": ["IPTV"]
}
```

`epg` 可选，没有就只显示频道列表。

## 加一个解析规则

在 `rules/` 新建 JSON，核心字段：

```json
{
  "id": "my-rule",
  "name": "我的接口",
  "version": 1,
  "engine": "http-json",
  "capabilities": ["search", "detail"],
  "request": {
    "search": {
      "url": "{baseUrl}?wd={keyword}&page={page}",
      "method": "GET"
    },
    "detail": {
      "url": "{baseUrl}?id={id}",
      "method": "GET"
    }
  },
  "extract": {
    "search": {
      "list": "$.data.list",
      "id": "$.id",
      "name": "$.title",
      "pic": "$.cover"
    },
    "detail": {
      "episodes": "$.data.play_url",
      "episodeFormat": "cms"
    }
  }
}
```

### 内置引擎

| engine | 用途 | 能力 |
|---|---|---|
| `cms-json` | 标准 Apple CMS `ac=videolist` | search / detail |
| `http-json` | 通用 JSON 接口 + JSONPath 映射 | search / detail |
| `html-regex` | 从详情页 HTML 提取 m3u8 | detail |
| `archive-org` | Internet Archive 公共领域影片 | search / detail |
| `m3u` | M3U/M3U8 直播列表 | live |
| `xmltv` | XMLTV 节目单 | epg |
| `direct` | 直链播放 | play |

> 当前 Flutter 客户端已实现 `cms-json`、`http-json`、`html-regex`、`archive-org`、
> `direct` 的搜索/详情；`m3u`、`xmltv` 等直播模块接入后再启用。

### 允许的占位符

- `{baseUrl}`：源配置里的 `url`
- `{keyword}`：搜索关键词，URL 编码后使用
- `{page}`：页码，从 1 开始
- `{id}`：影片 ID

### 分集格式

`episodeFormat: "cms"` 表示：

```
线路1$$$线路2
每线路：第01集$https://...m3u8#第02集$https://...m3u8
```

App 会优先选择包含 `.m3u8` 的线路；都没有时回退第一条。

### 能力声明

`capabilities` 决定 App 显示哪些入口：

- `search`：出现在搜索结果
- `detail`：可打开详情/选集
- `play`：能直接播放
- `live`：直播频道
- `epg`：节目单

不支持的能力不要声明，App 会自动隐藏对应按钮。

## 发布与版本

1. 修改源/规则；
2. `npm run validate`；
3. `npm run build`（manifest version +1，更新 hash）；
4. `npm run sign`（Ed25519 签名）；
5. commit + tag：

```bash
git add .
git commit -m "rules: add my-cms"
git tag v12
git push origin main --tags
```

App 通过 jsDelivr 固定 tag 拉取，避免分支漂移：

```
https://cdn.jsdelivr.net/gh/<org>/libretv-rules@v12/manifest.json
```

`manifest.json` 里的文件路径都是相对路径，App 以 manifest 所在目录为基准拼接。

### App 端公钥

App 需要的是 **32 字节 Ed25519 原始公钥的 Base64**，不是 PEM：

```bash
npm run public-key
```

把输出填到 App 的 `--dart-define=RULEPACK_PUBLIC_KEY=...`。
公钥可以公开；私钥只放本地或 CI Secret。

## manifest 格式

```json
{
  "schemaVersion": 1,
  "id": "libretv-rules",
  "version": 12,
  "minAppVersion": "0.1.0",
  "publishedAt": "2026-11-02T10:00:00.000Z",
  "files": [
    { "path": "sources/vod.json", "sha256": "..." },
    { "path": "rules/cms-standard.json", "sha256": "..." }
  ],
  "signature": "base64..."
}
```

## App 端校验流程

1. 拉取 `manifest.json`；
2. 去掉 `signature`，按键名递归排序，做 Ed25519 验签；
3. 逐个文件校验 `sha256`；
4. 检查 `minAppVersion` 和每个规则的 `engine` 是否受当前 App 支持；
5. 全部通过才切换，否则继续使用内置基线包；
6. 保留上一版，失败自动回滚。

**签名只证明「包来自你」，不证明规则内容安全。** App 端仍然要限制：

- 只允许 `http(s)`；
- 不把规则中的 URL 自动交给浏览器打开；
- 限制响应大小和超时；
- 不携带任何用户凭证。

## 安全与合规

- 只存**源地址和解析规则**，不存视频文件、不存账号密码；
- 不要提交需要登录才能访问的私有接口；
- 不要提交版权内容；
- 规则是纯数据，不执行远程代码；
- 发现恶意源请在 Issue 中标注，维护者可以置 `enabled: false`。

## License

与 LibreTV 主项目保持一致：AGPL-3.0-or-later。
