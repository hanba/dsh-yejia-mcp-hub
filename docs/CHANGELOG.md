# Changelog

## 0.2.2

- 安全加固：按公司校验 Admin 下发的 `apiBaseUrl`/`mcpUrl` 域名白名单，防止 Token/密码被指向任意域名；
- 拒绝非 HTTPS 或白名单外平台的签名配置。

## 0.2.1

- 改为私有发布（Proprietary / All rights reserved）；
- 增加 LICENSE 和 PRIVATE_RELEASE.md；
- 不进入 dshmarket / 不提交公开 PR。

## 0.2.0

- 配置面合并：YJ/AMB 统一从 `mcp-admin.huiyinsoft.com` 拉取；
- 按 `?company=` 过滤，两家公司使用各自签名密钥；
- 移除 AMB 独立 Admin 地址。

## 0.1.5

- 安全整改：移除 Admin 源站 IP 兜底，改为纯域名解析；
- 移除插件包中的源站 IP 信息；
- 为公开分发做安全准备。

## 0.1.4

- 品牌更名为 **Yejia MCP Hub**（包名 `dsh-yejia-mcp-hub`）；
- 补齐市场 README、安装说明、变更记录；
- 详情页改用 README 回退，移除纯文字 detail 声明；
- 内部 credential key 保持 `dsh-shopeemcp/*`，兼容已登录状态。

## 0.1.3

- 包名/目录改为 `dsh-yejia-mcp-hub`；显示名 Yejia MCP Hub；
- 保持 YJ/AMB 双公司动态 MCP。

## 0.1.2

- 设置页增加“切换公司”；
- 修复 `/shopee/platform` 前缀路由；
- 双公司 P2 验证完成。

## 0.1.1

- 修复平台路由前缀；
- 支持 YJ 动态注册和会话开关。

## 0.1.0

- 统一插件首个版本：公司选择、Admin 验签、mcpManager 动态注册、平台登录、会话开关。
