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

## 真实推荐 / 片单 / 聚合

### 首页真实推荐

- `DoubanService` 直连豆瓣 `j/search_subjects`
- 热门电影、热门剧集两条 rail
- 点击豆瓣条目按标题跳到搜索页，自动匹配已启用源
- 海报带 Referer 请求头
- 豆瓣失败时回退 mock

### 片单 / 收藏

- `FavoritesStore` + `shared_preferences`
- 详情弹层收藏按钮
- 直播频道收藏按钮
- 「片单」页：继续观看 + 收藏两个 tab
- 历史条目可删除，收藏可取消
- 点击历史继续播放，点击收藏按类型播放/搜索

### 搜索聚合

- 同名 + 同年结果合并为一张卡片
- 多来源显示「N 个来源」
- 点击多来源卡片弹出源选择
- 单来源直接进详情

### 公开版权源 / v5

- 新增 `open-movies`：Blender / W3C 公共版权影片，启用
- 新增 `archive-org` 规则和源：Internet Archive 公共领域影片，默认关闭
- 规则包 `v5` 签名并打 tag
- App 默认远程地址切到 v5

### v6 fixture 可用性修复

- jsDelivr 对新建 tag 的 fixture 偶发 404/超时
- 演示源和公开版权源的 JSON 地址改为 raw.githubusercontent 固定 tag
- 规则包 `v6` 重新签名并打 tag
- App 默认远程地址切到 v6

### v7 公开版权源播放修复

- `media.w3.org` 对 App 的 Chrome UA 返回 Cloudflare 403，`open-movies` 实际无法播放
- 片源换成 `download.blender.org`（Sintel / Big Buck Bunny / Tears of Steel / Elephants Dream）
  和 MDN CC0 短片，全部实测支持 Range 请求
- 静态目录详情按 `vod_id` 匹配，避免多条目 fixture 总返回第一条
- 规则包 `v7` 重新签名并打 tag

### v8–v10 镜像与演示流可用性修复

- 本机实测 `raw.githubusercontent.com` 连续超时（15–25s），`ghproxy.net` 约 0.5s
- demo/open-movies fixture 与 manifest 改走 `ghproxy.net` 镜像，仍固定 tag
- 演示 HLS 从 `test-streams.mux.dev` 换到 Apple `devstreaming-cdn` 公开测试流
- manifest 连续签名 v8 / v9 / v10；App 默认地址跟到 v10
- 实测：公开版权源 5/5 播放地址可连，演示源 3 集可连

### 源订阅 / TVBOX 导入

- `SubscriptionService`：LibreTV-SourceList、TVBOX 配置、接口目录三种格式
- TVBOX：忽略 `type:3` Spider、`searchable:0`、非 M3U 直播
- `LocalSourcesStore`：导入结果存本地，叠加到规则包源
- 设置页：导入订阅 URL、显示本地源数量、清空本地源
- 搜索 / 直播 / 源管理共用本地源
- 单元测试覆盖三种订阅格式

### 搜索分页

- 搜索结果支持「加载更多」
- 按页码请求源，按 sourceId+vodId 去重后追加
- 没有新结果时自动隐藏按钮

### 源测活

- SourceManager 每个源支持「测活」
- VOD：请求 CMS 搜索接口并校验 JSON
- 直播：拉取 M3U 并统计频道数

### v11 更多公开源

- 新增 `nasa` 引擎和 `nasa-video` 源：NASA 公开视频库，可搜索、可播放
  - 搜索 `images-api.nasa.gov/search`，详情 `/asset/{id}` 取文件
  - 优先 `~mobile.mp4`，自动 http→https 并编码空格
  - 详情额外读取 `metadata.json` 补简介
- 新增 `stable-cn` 直播源：从 iptv-org 中国列表实测筛出的 19 个频道
  - CCTV-1/2/3/7/8/9/10/11/12/13/14/15/16/17、CGTN 1/2、湖南/安徽/西藏卫视
  - 数据在 `fixtures/live/stable-cn.m3u`，本机实测首 6 个全部可连
- 省级卫视当前大面积超时/地区限制，未纳入精选列表
- manifest `v12` 签名并打 tag

### 画质探测

- `QualityProbeService` 解析 m3u8 master playlist 的 `RESOLUTION`
- 详情弹层显示最高画质，如 `1080P`
- 非 master playlist 自动隐藏

### v13 补全公开直播列表

- 新增 iptv-org 国家列表：澳门、新加坡、马来西亚、日本，默认启用
- 新增 iptv-org 分类列表：新闻、体育、少儿、纪录、音乐、全量索引，默认关闭
- 新增 `stable-cn-extended`：23 个省级/地方卫视，未做可用性过滤，默认关闭
- 公共 EPG 实测不可用：
  - `live.fanmingming.com/e.xml`、`epg.112114.xyz/pp.xml` 均 40s 超时
  - `epg.pw` 可下载但单文件 40–80 万字节、耗时 60s+，频道 ID 与 iptv-org 的 `tvg-id` 不匹配
- manifest `v13` 签名并打 tag


### 首页 / 图片 / 直播播放修复

- 首页去掉 mock 回退：豆瓣失败时显示重试卡片，不再展示「群星之后」等测试片单
- Hero 改为豆瓣第一条真实数据；继续观看为空时不显示假进度
- 新增 `SmartImage`：http 拉取字节 + Referer/UA + 内存缓存，修复豆瓣海报不显示
- 豆瓣图床对并发敏感：限制 2 并发、失败 403/418 退避重试，避免整页封面被拒
- 静态 fixture 源（demo/open-movies）按关键词过滤，避免搜任何词都返回演示数据
- 搜索无结果时提示当前只有演示/公开源，引导去设置导入真实采集站
- 直播播放不再传 `start`，修复 mpv `--force-seekable=yes` 报错
- 播放错误提示中文化，保留重试按钮


### 源健康度 / 播放自动重试

- `SourceHealthStore`：连续失败 3 次冷却 30 分钟，6 次 24 小时，9 次 7 天
- 成功一次自动清除失败记录
- 搜索页跳过冷却中的源，标签显示「冷却中」
- 源管理可手动「恢复」冷却源
- 播放器错误自动重试一次，仍失败保留手动重试


### 片头 / 片尾跳过

- 播放器新增「片头/片尾跳过」设置
- 可标记片头结束、片尾开始
- 自动跳过开启后，进入片头区间会跳到片头结束，到片尾会切下一集/暂停
- 标记按片名持久化，同一部剧各集共用


### 下载本集

- 播放器新增下载按钮（直播隐藏）
- 直链 MP4：流式写入 `~/Downloads/LibreTV`
- HLS：自动选择最高码率，下载未加密分片并合并为 `.ts`/`.mp4`
- 加密 HLS（AES-128）与直播流明确提示暂不支持
- 下载中显示进度和分片信息


### HLS 广告过滤

- App 内本机 HLS 代理，点播 m3u8 自动走代理
- 过滤 `#EXT-X-CUE-OUT` / `#EXT-X-CUE-IN` 广告区间
- 过滤 URL 中带 ad/ads/preroll/midroll 等标记的分片
- 重写分片、AES key、EXT-X-MAP、master 子播放列表
- Range 透传，拖动进度仍然可用
- iOS 增加 NSAllowsLocalNetworking


### 播放失败换源

- 同名跨源结果会带上其它来源列表
- 播放器错误浮层新增「换源」
- 点击后依次尝试其它来源，解析成功直接替换播放器
- 没有更多来源时提示，不影响「重试」

### 验证更新

- `flutter test` 37 个测试通过
- `flutter build macos --debug` 成功
- `flutter build ios --simulator --debug` 成功
