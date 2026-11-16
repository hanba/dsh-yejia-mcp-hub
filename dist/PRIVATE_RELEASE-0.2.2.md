# Yejia MCP Hub v0.2.2（私有发布）

- 包：`dsh-yejia-mcp-hub-0.2.2.tgz`
- SHA-256：`115259967998184314d363d98092a3785ac87e2898b85f07ec958ae76fb02f67`
- 许可证：Proprietary / All rights reserved
- 分发：私有 GitHub 仓库 Release；不进入 dshmarket / 不提交公开 PR

## 发布步骤

```bash
git push -u origin main
git push origin v0.2.2
```

在 GitHub 私有仓库创建 Release `v0.2.2`，上传 `dist/dsh-yejia-mcp-hub-0.2.2.tgz`。

## 安装

有仓库权限的机器：

```bash
git clone git@github.com:hanba/dsh-yejia-mcp-hub.git /path/dsh-yejia-mcp-hub
```

```text
plugin_manager install_bundle
target: /path/dsh-yejia-mcp-hub
enabled: true
```

或下载 release 资产后指向 `.tgz`。

## 访问范围

只有被邀请进私有仓库的人可见；分享时邀请 GitHub 用户，或给可访问的 tgz。
