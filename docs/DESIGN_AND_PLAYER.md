# 设计系统与播放器

> media-first 设计系统、播放器实现、Kazumi 参考说明。

## 1. 为什么自研 media-first

M3 是通用设计语言，影视 App 的核心是海报、剧照、视频和焦点浏览。
直接套 M3 会有两个问题：

- 视觉像通用工具 App，没有流媒体品牌感；
- TV 端组件不是为遥控器焦点设计的。

所以采用：

```
M3 只作为底层能力（无障碍、基础控件、主题机制）
        +
自研 media-first token + 核心组件
```

## 2. 设计原则

1. 暗色为主，用 surface 层次而不是阴影。
2. 海报即 UI，减少按钮和边框。
3. 封面 2:3，Hero/剧照 16:9。
4. TV 焦点必须夸张：放大 + 描边 + 光晕。
5. 导航极简：桌面/TV 左侧 rail，手机底部 tab。
6. 播放器控制条半透明浮层，自动隐藏。
7. 动效短、稳，低端盒子不卡。

## 3. Token

`lib/design/tokens.dart`：

- `AppColors`：bg / surface / surfaceHigh / text / textMuted / accent / danger / success
- `AppSpacing`：4 / 8 / 12 / 16 / 24 / 32 / 48
- `AppRadius`：8 / 12 / 16 / 20 / pill
- `AppMotion`：140ms / 220ms / 320ms
- `TvTokens`：focusScale、focusBorderWidth、overscan、cardRadius、posterWidth、heroHeight

`TvTokens.desktop` 和 `TvTokens.tv` 两套；TV 以后用 `buildAppTheme(isTv: true)` 注入。

## 4. 组件

```
lib/design/widgets/
├─ focusable_surface.dart     # 焦点/鼠标/回车激活统一封装
├─ poster_card.dart           # 2:3 海报卡 + 角标 + 评分
├─ media_rail.dart            # 横向媒体轨道
├─ hero_billboard.dart        # 首页大图 + 渐变 + 操作
├─ media_detail_dialog.dart   # 详情弹层 + 选集
└─ side_rail.dart             # 桌面/TV 左侧导航
```

规则：

- 所有可交互元素必须包 `FocusableSurface` 或有等价焦点处理；
- 不要直接在页面里写颜色/间距，用 token；
- TV 字号放大、阴影减少、焦点态加强。

## 5. 手机 / TV 差异

| | 手机 | TV |
|---|---|---|
| 输入 | 触摸/手势 | 遥控器 D-pad |
| 字号 | 14–18 | 20–28 |
| 导航 | 底部 tab | 左侧 rail |
| 列表 | 纵向 | 横向 rail + 分组 |
| 弹窗 | BottomSheet | 居中 Dialog |
| 留白 | 16 | 48 overscan |
| 焦点 | 可选 | 必须明显 |

## 6. 播放器实现

当前：

- `media_kit` + `media_kit_video`（libmpv）
- `Player` + `VideoController`
- 自定义控制层：
  - 播放/暂停
  - 进度条（点击/拖动）
  - 缓冲
  - 音量/静音
  - 倍速
  - 选集侧栏
  - 全屏（`window_manager`）
  - 自动隐藏
  - 快捷键：空格、←/→、↑/↓、M、F、Esc

文件：

```
lib/player/player_page.dart
lib/player/player_progress_bar.dart
```

## 7. 为什么参考 Kazumi

`/Users/cuijianpeng/Desktop/tv/tvbox` 实际是 **Kazumi 2.4.2**：

- Flutter 3.47.8
- 播放器基于 `media_kit` 的定制 fork
- 功能非常完整：硬解、缓冲策略、弹幕、超分、投屏、SyncPlay、下载

参考了它的：

- `PlayerItemSurface`：Video 表面
- `PlayerTransportBar`：控制条布局
- `PlayerProgressBar`：进度条
- `PlayerKeyboardShortcuts`：快捷键分发
- `PlayerPlaybackController`：Player 初始化/缓冲策略

**没有整体复制**，因为：

- 依赖 MobX、Modular、Hive、audio_service；
- 弹幕/超分/投屏/SyncPlay 耦合很深；
- 全搬会把新项目拖得很重。

Kazumi 是 GPL-3.0，LibreTV 是 AGPL-3.0-or-later。当前只参考架构和交互，没有复制源码；如果以后移植具体代码，需要保留版权声明并遵守 AGPL。

## 8. 播放器后续

优先级：

1. 播放进度记忆（本地 SQLite/MMKV）
2. 自动连播
3. 缓冲策略（media_kit PlayerConfiguration）
4. 硬件解码选项
5. 手势（移动端）
6. 播放失败自动换源
7. 字幕
8. 弹幕 / 超分 / 投屏（可选）

## 9. 平台注意

- macOS/iOS 用 AVPlayer 系或 libmpv；当前 media_kit 在 macOS 已验证可构建。
- iOS 上 FLV 不受 AVPlayer 支持；如果走 media_kit 可以支持更多格式，但要评估包体和审核。
- Android TV 低端盒子：减少阴影/模糊、列表虚拟化、避免大图同时加载。
- Apple TV 暂不做。

## 10. 设计验证顺序

1. 首页（已完成）
2. 详情（已完成弹层）
3. 播放器（已完成基础版）
4. 搜索（已完成）
5. 源管理（已完成只读版）
6. 直播页（待）
7. 设置页（待）
8. 移动端布局（待）
9. TV 布局（待）
