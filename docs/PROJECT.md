# LibreTV 项目总览

> 最后更新：2026-11-02
> 规则仓库：https://github.com/cuijianpeng/libretv-rules

## 1. 项目组成

| 目录 | 作用 | Git |
|---|---|---|
| `LibreTV/` | 原有 Next.js Web 版（服务端 API + Web 前端） | 原项目 |
| `libretv_app/` | Flutter 客户端，当前只启用 macOS | **尚未建 Git 仓库** |
| `libretv-rules/` | 源目录 + 解析规则 + 签名发布 | ✅ GitHub `cuijianpeng/libretv-rules` |

工作区根目录：

```
/Users/cuijianpeng/Desktop/LibreTV
```

## 2. 目标与非目标

### 目标

- Android / iOS / Android TV 一套 Flutter 代码（Apple TV 暂不做）。
- 先做 macOS 客户端，用来快速验证 media-first 设计系统和播放器。
- 源和解析规则不写死在 App 里，从 Git 仓库动态下发。
- 只下发 **JSON 数据**，不执行远程 JS/JAR。
- 不需要自建服务端；规则包放 GitHub，App 直接拉。
- 开源、非商业。

### 非目标（当前阶段）

- 用户账号、注册、计费。
- 远程 JS/JAR 插件。
- Apple TV / tvOS。
- 自建搜索服务端。
- 弹幕、超分、投屏、SyncPlay、下载（以后可选）。

## 3. 当前状态

### Flutter App

- 平台：macOS
- 设计：media-first 暗色设计系统
- 首页：左侧导航 + Hero + 横向媒体轨道
- 详情：居中 Dialog + 选集
- 播放器：`media_kit` + `media_kit_video`，HLS 演示流
- 规则包：加载、验签、SHA256、内置回退
- 搜索：规则包驱动，多源并发
- 源管理：展示规则包里的源和规则，可在本地启用/停用
- 源启用覆盖存 `shared_preferences`，不修改规则包
- **公开演示源**：搜索 → 详情 → 3 集 → 播放器，全链路可验证
- **直播页**：M3U 频道列表、分组、搜索、播放、收藏频道
- **播放进度**：本地保存，首页「继续观看」，自动连播下一集
- **片单页**：播放历史 + 收藏
- **首页推荐**：豆瓣热门电影/剧集，点击按标题搜索源
- **搜索**：同名跨源聚合，多来源选择
- **设置页**：规则包状态/重载、清空进度、恢复源默认、关于
- **多平台**：macOS 已构建，iOS simulator 已构建，Android 工程已生成但本机缺 SDK
- 首页「继续观看/豆瓣推荐」为真实数据，直播/搜索也是真实链路

### 规则仓库

- GitHub：https://github.com/cuijianpeng/libretv-rules
- 分支：`main`
- 初始 commit：`7b7eb99 init: source catalog and parser rules`
- 8 条规则、6 个点播源（3 个启用）、7 个直播源（5 个启用）
- 启用点播源：`demo-fixture`（公开演示）、`open-movies`（Blender 开放电影）、`nasa-video`（NASA 公开视频库）
- 启用直播源：iptv-org 中国/中文/香港/台湾 4 个索引，外加 `stable-cn` 精选央视/卫视
- `archive-org` 源默认关闭：大陆网络通常无法直连 archive.org
- `stable-cn` 数据在 `fixtures/live/stable-cn.m3u`，是从 iptv-org 中国列表实测筛出的 19 个频道
- 演示源 `demo-fixture` 数据在 `fixtures/demo/cms.json`，`open-movies` 数据在 `fixtures/open-movies/cms.json`
- `manifest.json` 已签名（version 12），tag `v12`
- 演示/公开版权 fixture 与 manifest 走 `ghproxy.net` 镜像访问 raw.githubusercontent 固定 tag
- 本机实测 raw.githubusercontent 大面积超时，故默认改用镜像；jsDelivr（fastly/gcore）可作备用
- 演示 HLS 已从 `test-streams.mux.dev` 换到 Apple `devstreaming-cdn` 公开测试流
- 另外 2 个点播源和 1 个直播源仍是 `example.com` 占位，`enabled: false`

## 4. 架构

```
┌────────────────────────────────────────────┐
│ Flutter App（macOS / 后续 Android/iOS/TV）  │
│  ├─ design/        media-first 设计系统     │
│  ├─ player/        media_kit 播放器         │
│  ├─ features/      首页/搜索/源管理         │
│  └─ data/          rulepack 加载 + 规则引擎 │
└───────────────┬────────────────────────────┘
                │ 拉取 manifest + JSON
                ▼
┌────────────────────────────────────────────┐
│ libretv-rules（GitHub / jsDelivr）          │
│  ├─ manifest.json  版本 + hash + 签名       │
│  ├─ sources/       点播源 / 直播源          │
│  └─ rules/         纯 JSON 解析规则         │
└───────────────┬────────────────────────────┘
                │ 直接请求
                ▼
        采集站 / JSON API / M3U / XMLTV
```

## 5. 关键技术选型

| 层 | 选择 | 原因 |
|---|---|---|
| 客户端 | Flutter | 一套代码覆盖 Android/iOS/Android TV，TV 焦点系统成熟 |
| 首端 | macOS | 构建快、调试快，适合先验证设计 |
| 播放 | media_kit + libmpv | 格式支持广，和 Kazumi 同源 |
| 状态 | 原生 StatefulWidget + ValueNotifier | 当前规模够用，暂不引入 MobX |
| 规则 | JSON + 内置引擎 | 商店合规、安全、可动态更新 |
| 签名 | Ed25519 + canonical JSON | 防篡改，App 内置公钥 |
| 分发 | GitHub + jsDelivr | 零服务端、固定 tag 可缓存 |
| 设计 | 自研 media-first | M3 只作为基础，不直接套组件 |

## 6. 关键决策

1. **不做 Apple TV**：减少 tvOS 审核和 AVPlayer 限制。
2. **不做远程 JS/JAR**：App Store 合规 + 安全。
3. **源和规则独立仓库**：改规则不用发版。
4. **Mac 优先**：先验证视觉和播放器，再做移动端和 TV。
5. **首页先用 mock**：搜索/规则链路先打通，推荐数据后接。
6. **不整体搬运 Kazumi 播放器**：它和 MobX/Modular/Hive/弹幕/超分耦合太深，只参考交互并复用 media_kit。
7. **window_manager 固定 0.5.1**：0.6.0 改成了 nativeapi 新 API。
8. **规则包只允许 JSON**：复杂源需要发版加内置引擎，或以后加可选服务端。

## 7. 已知限制

- `libretv_app` 还没建 GitHub 仓库，只在本机。
- Android SDK 未安装，Android 构建未验证。
- `m3u` / `xmltv` 已实现解析和直播页，但收藏频道、EPG 多源匹配还没做。
- 源启用状态可以本地覆盖，但还不能添加/删除源（增删仍在 Git 仓库）。
- 首页真实推荐已接豆瓣，热门/剧集不再是 mock；搜索/直播是真实链路。
- 没有下载、弹幕、超分、投屏。
- iOS 已能构建 simulator，但未做真机签名和上架。
- `archive-org` 源依赖 archive.org，大陆网络通常无法直连，需要代理。
- 内容聚合类 App 上架仍有版权风险，去掉远程代码只降低技术/审核风险，不消除内容风险。

## 8. 下一步优先级

1. 补真实采集站（`open-movies` 只是公开版权目录，不是完整片库）。
2. 直播收藏频道、EPG 多源匹配。
3. 安装 Android SDK，验证 `flutter build apk` 和 Android TV。
4. TV 10-foot UI 深度适配（焦点顺序、遥控器按键）。
5. 设置页、搜索源健康度、首页真实推荐。
6. 把 `libretv_app` 推到 GitHub。
7. 播放失败自动换源、下载、弹幕、超分（最后再做）。

## 9. 下次继续时先看

- `docs/OPERATIONS.md`：命令、签名、Git、排错
- `docs/APP_INTEGRATION.md`：规则包协议和 App 加载流程
- `docs/DESIGN_AND_PLAYER.md`：设计系统和播放器
- `docs/CHANGELOG.md`：这次做了什么
