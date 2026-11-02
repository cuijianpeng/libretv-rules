# Fixtures

用于规则验证的样例响应，不包含真实片源。

- `cms-standard/search.json`：标准 Apple CMS 搜索响应
- `cms-standard/detail.json`：标准 Apple CMS 详情响应

后续接入 App 的规则测试时，可以直接读取这些文件作为输入，
断言解析结果。新增规则时建议同时补一组 fixture。
