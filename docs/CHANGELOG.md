# 变更记录

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
- 源管理页：只读展示源/规则/启用状态
- 首页右上角规则包状态徽章

验证：

- `flutter analyze` 无问题
- `flutter test` 8 个测试通过
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
