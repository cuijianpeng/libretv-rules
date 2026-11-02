# 变更记录

## 2026-11-02（源与规则补充）

### 直播源

`sources/live.json` 升到 version 2，新增并启用：

- `iptv-org-zho` 中文频道（约 226 个）
- `iptv-org-hk` 香港频道（约 17 个）
- `iptv-org-tw` 台湾频道（约 33 个）
- `iptv-org-movies` 电影频道（约 773 个，默认关闭）

`iptv-org-cn` 保留启用，实测约 155 个频道。所有地址均验证返回 200。

### 点播源

- 新增 `open-movies`（启用）：`fixtures/open-movies/cms.json`，Blender 开放电影
  与 W3C 测试片段，直连 `media.w3.org` 的 MP4，CC BY 授权。
- 新增 `archive-org`（默认关闭）：搜索 archive.org 公共领域影片。
  实测本机无法直连 archive.org，需代理，因此默认不启用。

### 新引擎

- `rules/archive-org.json` + App `RuleEngine` 新增 `archive-org`：
  - `advancedsearch.php` 搜索，`metadata/{id}` 取文件列表；
  - 按扩展名筛视频，同组多清晰度保留最佳，多文件按集输出；
  - `request.*.timeoutSeconds` 支持按规则覆盖超时；
  - 测试：`test/rule_engine_test.dart` 新增 3 个用例。

### 其他

- `demo-fixture` 地址从 `@main` 改为固定 `@v4`，避免分支漂移。
- `schemas/rule.schema.json`、`scripts/validate.mjs` 加入 `archive-org`。
- `manifest.json` version 5 并签名；App 内置基线同步。
- 实测：`archive.org`、`commons.wikimedia.org` 本机连接超时；
  `media.w3.org`、`download.blender.org`、`iptv-org.github.io` 可直连。
- iptv-org 已不再托管公共 EPG 地址，`xmltv` 规则仍无可用源。

## 2026-11-02

### 项目分析

- 分析了 `/Users/cuijianpeng/Desktop/LibreTV/LibreTV` Next.js 版：
  - 聚合搜索、CMS 解析、详情、代理、SSRF、鉴权、直播、豆瓣/Bangumi 推荐。
  - 约 144 个 TS/TSX 文件，`src/lib` 约 1.4 万行，37 个测试文件。
- 结论：Web 版需要 Node 服务端；原生 App 可以不需要远程服务端。

### 技术选型

- 放弃 Apple TV。
- 选择 Flutter（Android/iOS/Android TV 一套代码）。
- macOS 作为第一个验证端。
- 不做远程 JS/JAR，只下发 JSON 规则。
- 源和规则独立 Git 仓库，规则包签名后由 App 拉取。

### Flutter App

创建：`/Users/cuijianpeng/Desktop/LibreTV/libretv_app`

完成：

- macOS 工程
- media-first 设计系统
  - tokens / theme / FocusableSurface / PosterCard / MediaRail / HeroBillboard / DetailDialog / SideRail
- 首页：左侧导航 + Hero + 继续观看/热门/剧集/直播轨道（mock 数据）
- 播放器：
  - media_kit + media_kit_video
  - 播放/暂停、进度、缓冲、音量、倍速、选集、全屏、自动隐藏
  - 快捷键：空格、←/→、↑/↓、M、F、Esc
  - 演示流：`test-streams.mux.dev`
- 规则包加载：
  - manifest / SHA256 / Ed25519
  - 内置基线 `assets/rulepack/`
  - 远程失败回退
- 规则引擎：
  - `cms-json`
  - `http-json`
  - `html-regex`
  - `direct`
- 搜索页：多源并发、源选择、结果网格、详情、选集、播放
- 源管理页：展示源/规则，可在本地启用/停用
- 源启用覆盖存 `shared_preferences`，支持恢复默认
- 首页右上角规则包状态徽章

验证：

- `flutter analyze` 无问题
- `flutter test` 9 个测试通过
- `flutter build macos --debug` 成功
- App 启动正常

### 规则仓库

创建：`/Users/cuijianpeng/Desktop/LibreTV/libretv-rules`
GitHub：https://github.com/cuijianpeng/libretv-rules

内容：

- `sources/vod.json`：3 个点播源
  - `demo-fixture`：公开演示源，启用
  - 2 个 `example.com` 占位源，禁用
- `sources/live.json`：1 个占位直播源（disabled）
- `fixtures/demo/cms.json`：演示搜索/详情数据，播放指向公开测试 HLS
- `rules/`：6 条规则
  - cms-standard
  - http-json
  - html-regex
  - m3u
  - xmltv
  - direct
- `schemas/`：JSON Schema
- `fixtures/`：CMS 搜索/详情样例
- `scripts/`：validate / build-manifest / sign / verify / public-key
- `manifest.json`：version 2，未签名
- `.github/workflows/validate.yml`
- `keys/README.md`

Git：

- 分支 `main`
- 最新 commit：`520300a feat: add public demo fixture source`
- 29 → 30+ 个文件
- remote：`git@github.com:cuijianpeng/libretv-rules.git`
- SSH 公钥已添加，push 成功

### 演示源验证

`libretv_app/tool/check_demo.dart` 直接走真实网络：

```bash
cd libretv_app
dart run tool/check_demo.dart
```

输出：

```
search: 1
- LibreTV 演示影片 (1)
detail: LibreTV 演示影片
episodes: 3
...
```

App 搜索页默认选中演示源，可完成搜索 → 详情 → 选集 → 播放。

### 文档

新增本目录：

- `PROJECT.md`
- `OPERATIONS.md`
- `APP_INTEGRATION.md`
- `DESIGN_AND_PLAYER.md`
- `CHANGELOG.md`

## 下次继续

1. 填真实源，`enabled: true`
2. `npm run validate && npm run build`
3. 生成密钥、`npm run sign`、tag `v2`
4. App 配 `RULEPACK_URL` + `RULEPACK_PUBLIC_KEY`
5. 源启用状态本地持久化
6. 直播 M3U / XMLTV
7. Android / iOS / Android TV

## 后续增量（同日）

### 规则包签名

- 生成 Ed25519 密钥：`keys/private.pem` / `keys/public.pem`
- `manifest.json` version 3 签名并打 tag `v3`
- App 默认远程地址切换到签名 tag
- 新增 `tool/check_rulepack.dart`：远程验签 + 文件 hash + sources/rules 解析
- 验证输出：`signature: valid`、`version: 3`、`rule pack OK`

### 直播 / IPTV

- `lib/data/live/live_models.dart`
- `m3u_parser.dart`：解析频道、分组、台标、去重
- `xmltv_parser.dart`：解析 XMLTV、时区、当前/下一节目
- `live_engine.dart`：拉取、gzip EPG、10 分钟缓存
- `features/live/live_page.dart`：频道列表、分组、搜索、右侧详情、播放
- `PlayerPage` 增加 `live` 模式：隐藏进度/倍速/选集，显示直播徽章
- 规则包新增 `iptv-org-cn` 公开测试源
- `manifest.json` version 4 签名并打 tag `v4`
- `tool/check_live.dart` 验证：150 个频道

### 多平台

- `flutter create --platforms=android,ios`
- Android：
  - INTERNET 权限
  - `usesCleartextTraffic`
  - leanback uses-feature
  - LEANBACK_LAUNCHER
  - TV banner vector
- iOS：
  - 显示名 LibreTV
  - ATS `NSAllowsArbitraryLoads`
  - simulator 构建通过
- 移动端底部导航
- 首页 TopBar 紧凑模式、MediaRail 小卡片
- Android SDK 未安装，APK 未验证

### 播放进度

- `PlaybackProgressStore` + `shared_preferences`
- 每 5 秒/退出时保存
- 播放器启动时 seek 到上次位置
- 首页「继续观看」接本地进度
- 播放完成自动下一集

### 设置页 / 搜索提示

- 设置页：规则包状态/版本/重载、清空播放进度、恢复源默认、关于
- 搜索页：失败/超时源计数提示
- 移动端底部导航「设置」进入设置页

### 验证

- `flutter analyze` 无问题
- `flutter test` 13 个测试通过
- `flutter build macos --debug` 成功
- `flutter build ios --simulator --debug` 成功

### 提交

规则仓库：

- `8dc141c release: sign rule pack v3`
- `18ff2de release: add iptv-org test source, sign v4`

App 本地仓库：

- `c6bdbc8 feat: persist source enable overrides`
- 本轮后续提交见 `git log`
