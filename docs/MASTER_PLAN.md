# 总计划

> 目标：把当前 Mac 验证壳推进到「可日常使用、可扩展、可发布」的多端客户端。
> 执行原则：不再逐项确认，按阶段连续推进；每完成一项更新状态和文档。

## 阶段 0：发布基线

- [x] 规则仓库 + 签名脚本 + 校验
- [x] Flutter macOS 客户端
- [x] 规则包加载、验签、内置回退
- [x] `cms-json` / `http-json` / `html-regex` / `direct` 引擎
- [x] 搜索页 + 源管理 + 源启用持久化
- [x] 生成正式 Ed25519 密钥
- [x] 规则包签名、tag、推送
- [x] App 默认使用远程签名规则包
- [ ] App 加入 GitHub（等远程仓库）

验收：

- `npm run validate` 通过且 manifest 有签名
- App 启动显示「规则包 vN」
- 断网/验签失败自动回退内置基线
- `flutter analyze` / `flutter test` / `flutter build macos` 通过

## 阶段 1：直播 / IPTV

- [x] M3U 解析器
- [x] XMLTV / EPG 解析器
- [x] LiveEngine：拉取、解析、缓存
- [x] 直播页：频道列表、分组、搜索
- [x] 直播播放器复用
- [x] 公开测试源 iptv-org
- [x] 单元测试
- [x] 收藏频道
- [ ] EPG 多源匹配优化

验收：

- 直播页能加载 iptv-org 频道
- 分组切换、搜索、点击播放
- EPG 能显示当前/下一节目（有 EPG 时）
- 失败源不影响其它源

## 阶段 2：多平台

- [x] Android platform
- [x] iOS platform
- [x] Android TV（leanback manifest / banner）
- [x] 平台权限与网络安全配置
- [x] 移动端布局（底部导航）
- [ ] TV 布局（左侧 rail + 10-foot UI 深度适配）
- [x] 构建验证（macOS / iOS simulator）
- [ ] Android 构建（本机缺 Android SDK）

验收：

- `flutter build macos` / `flutter build apk`（有 SDK 时）通过
- Android TV 可用遥控器完成搜索/播放
- iOS 构建通过（有 Xcode 环境）

## 阶段 3：日常使用能力

- [x] 播放进度持久化
- [x] 继续观看首页
- [x] 自动连播下一集
- [x] 片头/片尾标记与自动跳过
- [x] 广告分片过滤（HLS 代理）
- [x] 下载本集（MP4 / 未加密 HLS）
- [ ] 播放失败自动换源
- [x] 搜索失败源计数
- [x] 源测活（VOD / M3U）
- [x] 画质探测（m3u8 master playlist）
- [x] 搜索源健康度持久化
- [x] 设置页：规则包、进度、数据源、关于
- [ ] 主题切换 / 缓存管理
- [x] 收藏 / 观看历史
- [x] 首页真实数据（豆瓣推荐）
- [x] 同名跨源聚合 / 源选择
- [x] 搜索分页 / 加载更多
- [x] 源订阅 / TVBOX / 接口目录导入

验收：

- 退出重开能续播
- 首页出现继续观看
- 坏源不会拖垮搜索
- 设置项可持久化

## 阶段 4：发布

- [ ] 规则包正式签名发布
- [ ] App 版本号 / 图标 / 启动图
- [ ] macOS release 构建
- [ ] Android release 构建
- [ ] iOS 归档
- [ ] GitHub App 仓库
- [ ] 发布说明 / 安装说明

## 已知风险

- 内容聚合类 App 上架仍有版权风险。
- iOS 上 FLV 需要转 HLS 或放弃。
- 公开源列表可用性和合法性不可控，默认只用公开测试源。
- 规则包私钥丢失/泄露需要发新版 App 更换公钥。

## 执行顺序

```
阶段 0 → 阶段 1 → 阶段 2 → 阶段 3 → 阶段 4
```

每个阶段完成后更新本文件、`CHANGELOG.md` 和 `PROJECT.md`。
