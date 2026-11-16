# 安装与升级

## GitHub Release 安装

插件仓库公开，Admin 后端私有。直接使用 Release：

1. 从公开 Release 下载 tgz；
2. `plugin_manager install_bundle` 指向 tgz；
3. 启用并刷新页面。

- 设置 → **Yejia MCP**
- 输入框下方 → **MCP 数据源**

## 本地目录安装

```text
plugin_manager install_bundle
target: /Users/cc/code/dsh-shopeeplatform/dsh-yejia-mcp-hub
enabled: true
```

## 从旧单公司插件迁移

1. 移除/禁用 `dsh-shopeemcp-yj`、`dsh-shopeemcp-amb`；
2. 安装 `dsh-yejia-mcp-hub`；
3. 打开 设置 → Yejia MCP，选择公司；
4. 重新登录平台账号；
5. 在 MCP 数据源菜单打开平台。

内部 credential key 保留 `dsh-shopeemcp/*` 与 `SHOPEE_MCP_*`，从旧插件迁移时已登录凭证不会丢。

## 升级

```text
plugin_manager install_bundle
target: /path/to/dsh-yejia-mcp-hub
enabled: true
```

替换已安装包后需要刷新页面；Host 端动态注册的 MCP 会按新配置重建。
