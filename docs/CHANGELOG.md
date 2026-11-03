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


### 下载管理

- 设置页新增「下载管理」
- 记录下载标题、路径、大小
- 在 Finder 中显示、删除文件
- 下载完成后自动写入记录


### UI 修正

- 直播分组改为下拉选择，避免横向 chip 被裁切
- 首页搜索框去掉 460px 限制，占满剩余空间
- 搜索页搜索框与「搜索」按钮统一 46px 高度


### 亮/暗主题 + 缓存管理

- `AppColors` 改为可切换调色板
- 设置页新增「亮色主题」开关，选择持久化
- 浅色主题使用独立的背景/面板/文字/描边色
- 设置页新增图片缓存管理：显示缓存数量、一键清理
- 清理同时清空 Flutter 图片缓存


### 主题 / 缓存 / 字幕 / 加密 HLS / 自动换源

- 亮/暗主题：设置页开关，颜色 token 可切换
- 图片缓存管理：显示数量、一键清理
- 外挂字幕：播放器选择 SRT / VTT / ASS / SSA 文件
- 加密 HLS 下载：AES-128 CBC + PKCS7 解密
- 播放失败：重试一次后自动切换下一个同名来源


### 控件高度统一

- 首页搜索框、规则徽章、图标按钮、头像统一 40px
- 搜索页输入框与搜索按钮统一 46px
- 搜索按钮关闭焦点缩放，避免聚焦时看起来更高

### v14 停用示例/演示源

- JSON 不支持注释，用 `enabled: false` 等价保留但不启用
- `demo-fixture` 从启用改为停用
- `example-cms`、`example-http-json`、`example-live` 保持停用并补充说明
- 默认启用源从 12 个减到 11 个
- manifest `v14` 签名并打 tag


### 搜索页隐藏未启用源

- 搜索页只展示 `enabled: true` 的源
- 未启用源改由源管理控制，不再出现在搜索页
- v14 里 demo/example 源实际是 `enabled: false`，并未删除


### 亮色主题检查 / 导航修正

- 亮色调色板提高对比度：accent #2563EB、faint #5B6472、danger #B91C1C
- Hero 在亮色主题下改用固定深色遮罩 + 白色文字，避免低对比
- 左侧「搜索」改为直接打开搜索页
- 移除无功能的右上角用户头像


### 亮色主题按钮文字

- 主色按钮文字颜色改为主题感知：暗色黑字、亮色白字
- Hero「立即播放」、搜索按钮、详情播放、直播播放统一处理
- 海报角标/评分文字固定白色，避免亮色主题下深色文字压在深色遮罩上


### 播放器设置 / 源测速 / EPG 匹配

- 播放器「播放设置」：画面比例、音轨选择、内嵌字幕选择、外挂字幕入口
- 搜索结果按源延迟排序，源 chip 显示 `xxxms`
- EPG 支持 tvg-id 归一化与 display-name 回退匹配
- 下载遇到 SAMPLE-AES/DRM 时给出明确不支持提示


### 亮色主题补丁

- Hero 无封面时的占位背景固定为深色，避免白字压在浅色底上
- 窗口启动背景跟随当前主题，减少亮色主题启动黑闪

### 源去重

- 新增统一去重：URL 归一化后比较，忽略末尾斜杠、主机大小写、默认端口和参数顺序
- 搜索页、直播页、源管理页都使用同一套去重逻辑
- 订阅导入时去重，历史本地源在启动加载时自动清理并落盘
- 本地实测点播源从 38 条清理到 31 条

### 结果清晰度与连接速度

- 搜索卡片显示清晰度角标（4K / 1080P / 720P / HD / SD），来源为采集站备注
- 搜索卡片显示该结果本次搜索的最快响应耗时，例如 `230ms`
- 多来源时显示来源数量，源选择弹层逐个显示清晰度和耗时
- 源管理测活结果附带耗时
- 无清晰度备注时不显示角标，详情弹层仍会探测真实播放列表分辨率

### 缺陷修复

- 详情弹层点任意一集都播放第 1 集，已改为携带真实集数索引
- 换源后回到第 1 集，已改为保留当前集数
- 首页/片单进入的播放页没有换源入口，已补跨源换源会话

### P1 播放器

- 多段跳过：片头 / 中段 / 片尾，可逐条删除，本剧总开关
- 跳过撤销、进度条区间着色
- 自动连播、广告切片过滤、自动跳过片段三个开关
- 剧集倒序、复制播放地址
- 移动端长按 3 倍速
- 画质缓存：详情探测与播放实测回填搜索结果
- 旧版片头/片尾标记自动迁移

### P1 搜索与设置

- 最近搜索记录（最多 10 条、可清空）
- 搜索边搜边出，不再等最慢的源
- 备注归一化：全34集 / 更新至34集 / 已完结
- 主题支持深色 / 亮色 / 跟随系统
- 配置导入导出：源、订阅、收藏、进度、跳过标记、偏好
- 成人内容标记与过滤
- 设置页清理跳过标记、快捷键说明

### P1 补齐

- 片段本地缓存：HLS 分片写入本地磁盘，播放代理优先命中
- 下一集预取：播放当前集时预取下一集前 8 个分片
- 播放停滞自愈：连续 9 秒位置不推进时自动从当前位置恢复，单集最多 2 次
- 首页推荐：豆瓣电影/剧集 10 个标签、Bangumi 每日放送、6 个影视热榜
- 首页推荐源可在设置中切换和关闭
- 独立观看历史面板：搜索、相对时间、集数/进度、删除撤销、清空确认
- 下载队列：最多 2 个并发，支持排队、暂停、继续、取消、错误重试
- 下载任务持久化，完成文件仍进入下载管理
- 设置页显示视频片段缓存用量并可清理

### 源管理与直播聚合

- 源管理支持手动添加/编辑/删除点播源与直播源
- 源列表支持搜索、按启用状态/本地源筛选
- 支持批量测活、停止测活，单源显示耗时
- 数据源订阅实体：导入、手动同步、启用/停用、删除、自动刷新周期
- 订阅源带订阅归属，同步时整体替换；连续失败 3 次暂停自动刷新
- 启动时检查到期订阅，最多刷新 3 个
- 直播页聚合全部已启用直播源
- 直播频道支持全部/收藏/最近、分组、搜索归一化、按名称/分组/最近排序
- 直播批量测活、仅显示可用、H.265 编码提示
- 上一台/下一台、回到上一个频道、复制直播地址
- EPG 增加当前节目进度、后续节目列表、每分钟刷新

### 换源比较面板

- 播放页新增「换源比较」入口，失败页也可直接打开
- 跨源搜索同名资源，逐个测详情接口耗时
- 并发探测每个候选源的画质
- 面板显示源名、画质、集数、耗时、失败原因
- 按当前源优先、其余按耗时排序
- 选中后保留当前集数切换
- 首页/片单/观看历史进入的播放页同样支持

### 发布基线

- App 版本升到 1.1.0+2
- macOS / iOS / Android 图标替换为 LibreTV 图标
- macOS Release 构建通过，Universal（x86_64 + arm64）
- 生成 `LibreTV-1.1.0-macos.dmg`，含 Applications 快捷方式
- 增加 `libretv_app/RELEASE.md` 发布说明
- 源管理新增导出 LibreTV-SourceList JSON

### 首页推荐调整

- 移除 Bangumi / 影视热榜入口，首页只保留豆瓣
- 首页推荐按标签平铺成独立区块：
  - 豆瓣·电影·热门 / 最新 / 经典 / 豆瓣高分 / 冷门佳片 / 华语 / 欧美 / 韩国 / 日本 / 动画
  - 豆瓣·剧集·热门 / 美剧 / 英剧 / 韩剧 / 日剧 / 国产剧 / 港剧 / 日本动画 / 综艺 / 纪录片
- 去掉首页数据源、类型、标签的三层选择逻辑
- 「显示推荐」开关移到设置 → 内容过滤
- 移除未使用的 Bangumi / 热榜服务
- App 版本升到 1.1.2+4，重建 macOS Release / DMG

### 验证更新

- `flutter test` 71 个测试通过
- `flutter build macos --debug` 成功
- `flutter build ios --simulator --debug` 成功
