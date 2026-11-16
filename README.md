# Yejia MCP Hub

Yejia 出品的多平台 MCP 平台中心。一个插件接入多个平台，MCP 地址和平台列表由各公司独立的 `ShopeeMcp.Admin` 签名下发，插件不再写死 MCP 连接。

## 功能

- 首次选择公司：`YJ` / `AMB`；
- 从公司独立 Admin 拉取平台配置，ES256 公钥验签；
- 通过 DSH `mcpManager.register` 动态挂载每个平台；
- 设置 → **Yejia MCP**：平台账号登录、个人资料、可见店铺、刷新配置、切换公司；
- 输入框下方 **MCP 数据源**：按会话开启/关闭平台；
- 关闭的平台工具对当前 Agent 隐藏，打开后恢复；
- 普通用户仍登录各平台的 ShopeePlatform 账号，管理员账号相互独立。

## 安装

本插件为 **私有发布**，不进入公开市场。通过私有 GitHub 仓库或 tgz 安装：

```text
plugin_manager install_bundle
target: /path/to/dsh-yejia-mcp-hub
enabled: true
```

安装前建议禁用/移除旧的单公司插件（`dsh-shopeemcp-yj`、`dsh-shopeemcp-amb`），避免同名 MCP Server 冲突。

私有发布与许可证见 [PRIVATE_RELEASE.md](PRIVATE_RELEASE.md) 和 [LICENSE](LICENSE)。

## 首次使用

1. 打开 设置 → **Yejia MCP**；
2. 选择公司（YJ/AMB）；
3. 在平台卡片登录对应的 ShopeePlatform 账号；
4. 打开输入框下方的 **MCP 数据源**；
5. 打开要用的平台开关。

切换公司会先卸载当前公司的 MCP，再加载新公司的平台。公司切换是插件级设置；会话开关是每会话独立的。

## MCP Admin

- 统一后台：`https://mcp-admin.huiyinsoft.com`

一个 Admin 管理 YJ/AMB 两家公司；插件按 `?company=yj|amb` 拉取，并用对应公司的公钥验签。管理员在后台配置公司、平台名称、API 地址、MCP 地址、serverName 和启用状态；插件只读取公开签名配置，不读取业务库。

## 限制与注意

- 插件包内不含任何管理员密码、平台 Token 或签名私钥；只含公开的 Admin 地址、公钥和公司映射；
- 当前公司映射写死在 `companies.js`，新增公司需要发新版本；
- 当前只支持每次选一个公司；如需同一 Profile 同时接多个公司，需要后续扩展；
- 只使用统一 Admin 域名解析；插件不写死源站 IP；
- 关闭插件或关闭会话开关后，对应 MCP 工具不再对模型可见；
- 需要网络可达 Admin、各平台 API 和 MCP 服务。

## 版本

见 [docs/CHANGELOG.md](docs/CHANGELOG.md)。
