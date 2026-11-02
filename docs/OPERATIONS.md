# 操作手册

> 环境、运行、发布、Git、排错。

## 1. 环境

已验证：

| 工具 | 版本 |
|---|---|
| Flutter | 3.47.8 stable |
| Dart | 3.13.7 |
| Xcode | 27.2 |
| macOS | 27.0.1 |
| CocoaPods | 1.17.0 |
| Node | 22.22.0 |
| npm | 10.9.4 |

Flutter 路径：`/opt/homebrew/share/flutter/bin/flutter`

## 2. 运行 Flutter App

```bash
cd /Users/cuijianpeng/Desktop/LibreTV/libretv_app
flutter pub get
flutter run -d macos
```

构建：

```bash
flutter build macos --debug
open build/macos/Build/Products/Debug/LibreTV.app
```

检查：

```bash
flutter analyze
flutter test
```

当前测试：8 个，全部通过。

## 3. 运行规则仓库脚本

```bash
cd /Users/cuijianpeng/Desktop/LibreTV/libretv-rules

npm run validate      # 校验 JSON、引用、manifest hash
npm run build         # manifest version +1，重算 hash
npm run sign          # 用私钥签名 manifest
npm run verify        # 用公钥验签
npm run public-key    # 输出 App 需要的 32 字节原始公钥 Base64
```

Node 20+，无第三方依赖。

## 4. 加一个源

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
  "note": "可选"
}
```

规则：

- `id` 唯一，小写字母/数字/连字符。
- `url` 必须 http(s)。
- `rule` 必须存在于 `rules/`。
- `enabled: false` 时 App 会显示但不默认选中。

直播源编辑 `sources/live.json`：

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

## 5. 演示源

仓库内置一个公开测试源 `demo-fixture`：

- 源地址：`https://cdn.jsdelivr.net/gh/cuijianpeng/libretv-rules@main/fixtures/demo/cms.json`
- 数据：`fixtures/demo/cms.json`
- 播放：`test-streams.mux.dev` 公开 HLS
- 用途：验证搜索 → 详情 → 选集 → 播放，不涉及第三方内容

手动验证：

```bash
cd /Users/cuijianpeng/Desktop/LibreTV/libretv_app
dart run tool/check_demo.dart
```

预期输出：

```
search: 1
- LibreTV 演示影片 (1)
detail: LibreTV 演示影片
episodes: 3
...
```

App 里打开搜索页，默认会选中「LibreTV 演示源（公开测试）」，输入任意关键词即可。

## 5.1 加一个规则

在 `rules/` 新建 JSON。最小示例：

```json
{
  "id": "my-rule",
  "name": "我的接口",
  "version": 1,
  "engine": "http-json",
  "capabilities": ["search", "detail"],
  "request": {
    "search": { "url": "{baseUrl}?wd={keyword}&page={page}", "method": "GET" },
    "detail": { "url": "{baseUrl}?id={id}", "method": "GET" }
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

引擎：`cms-json`、`http-json`、`html-regex`、`m3u`、`xmltv`、`direct`。

## 6. 发布规则包

### 首次生成密钥

```bash
cd /Users/cuijianpeng/Desktop/LibreTV/libretv-rules
openssl genpkey -algorithm ed25519 -out keys/private.pem
openssl pkey -in keys/private.pem -pubout -out keys/public.pem
```

- `keys/private.pem` 不提交。
- `keys/public.pem` 提交。
- 公钥丢失可以重新生成；私钥泄露只能发新版 App 更换内置公钥。

### 每次发布

```bash
npm run validate
npm run build          # version +1
npm run sign           # 需要 keys/private.pem 或 RULEPACK_PRIVATE_KEY
npm run public-key     # 复制输出，给 App 的 --dart-define

git add .
git commit -m "rules: update sources"
git tag v2
git push origin main --tags
```

App 固定 tag 拉取：

```
https://ghproxy.net/https://raw.githubusercontent.com/cuijianpeng/libretv-rules/v13/manifest.json
```

jsDelivr（`fastly.jsdelivr.net` / `gcore.jsdelivr.net`）可作备用镜像；
fixture 源固定 tag，避免 CDN 新 tag 缓存问题。

### 更新 App 内置基线

```bash
cd /Users/cuijianpeng/Desktop/LibreTV/libretv_app
cp ../libretv-rules/manifest.json assets/rulepack/manifest.json
cp ../libretv-rules/sources/*.json assets/rulepack/sources/
cp ../libretv-rules/rules/*.json assets/rulepack/rules/
```

改了内置基线后需要重新 `flutter build macos`。

## 7. App 接远程规则包

```bash
flutter run -d macos \
  --dart-define=RULEPACK_URL=https://cdn.jsdelivr.net/gh/cuijianpeng/libretv-rules@v2/manifest.json \
  --dart-define=RULEPACK_PUBLIC_KEY=<npm run public-key 的输出>
```

不配 `RULEPACK_URL` 时只用内置 `assets/rulepack/`。

## 8. Git

规则仓库：

```bash
cd /Users/cuijianpeng/Desktop/LibreTV/libretv-rules
git status
git log --oneline -5
git push
```

remote 已设置为 SSH：

```
git@github.com:cuijianpeng/libretv-rules.git
```

GitHub 账号：`cuijianpeng`
提交邮箱：`cuijianpeng@users.noreply.github.com`

SSH 公钥：`~/.ssh/id_ed25519.pub`
已添加到 GitHub，`ssh -T git@github.com` 返回：

```
Hi cuijianpeng! You've successfully authenticated...
```

如果换电脑，需要重新生成/添加 SSH key：

```bash
ssh-keygen -t ed25519 -C "your@email"
cat ~/.ssh/id_ed25519.pub
# 添加到 https://github.com/settings/keys
```

## 9. 排错

| 现象 | 原因 | 解决 |
|---|---|---|
| `windowManager` / `WindowOptions` 未定义 | `window_manager` 0.6.0 换了 nativeapi API | 固定 `window_manager: 0.5.1` |
| macOS 请求网络失败 | App Sandbox 缺网络权限 | `*.entitlements` 加 `com.apple.security.network.client` |
| 搜索没有结果 | 源未启用或占位源是 example.com | 改 `sources/vod.json`，`enabled: true` |
| 改了源但 App 没变化 | 内置 assets 没更新，或远程 tag 没变 | 重新复制 assets / 重新 `build` + 打 tag |
| manifest hash 不匹配 | 改 JSON 后没重新 `npm run build` | 运行 build 后重新复制/提交 |
| 验签失败 | 公钥不是 32 字节原始 Base64，或 canonical JSON 不一致 | 用 `npm run public-key`；不要改 canonicalize 规则 |
| `gh` 不存在 | 本机没装 GitHub CLI | 用 SSH 即可，不需要 gh |
| `git push` 提示 Username | HTTPS 没凭据 | 用 SSH remote，或配 PAT |
| 播放器黑屏 | 演示流不可达/编码不支持 | 换 HLS 流；检查网络 |
| 首页还是 mock | 首页推荐尚未接规则包 | 搜索页才是真实源链路 |

## 10. 常用路径

```
libretv_app/lib/design/                 设计系统
libretv_app/lib/player/                 播放器
libretv_app/lib/features/home/          首页
libretv_app/lib/features/search/        搜索页
libretv_app/lib/features/sources/       源管理页
libretv_app/lib/data/rulepack/          规则包加载 + 规则引擎
libretv_app/assets/rulepack/            内置规则基线
libretv-rules/sources/                  源目录
libretv-rules/rules/                    解析规则
libretv-rules/scripts/                  校验/打包/签名
```
