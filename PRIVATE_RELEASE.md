# 发布说明

插件仓库公开，Admin 后端是独立的 **私有仓库**。本插件不进入 dshmarket / awesome-dsh-plugin 公开市场，不提交 PR。

## 发布方式

1. GitHub **公开插件仓库** `dsh-yejia-mcp-hub`；
2. 推送 tag，例如 `v0.2.1`；
3. 在 GitHub Release 挂载：

```text
dsh-yejia-mcp-hub-0.2.1.tgz
```

4. 任何人都可以从公开 Release 下载；Admin 仓库仍然私有。

## 安装

直接使用公开 Release 的 tgz：

```text
plugin_manager install_bundle
target: /path/dsh-yejia-mcp-hub-0.2.2.tgz
enabled: true
```

也可以从 GitHub Release 下载后指向 tgz。

```text
plugin_manager install_bundle
target: /path/dsh-yejia-mcp-hub-0.2.1.tgz
enabled: true
```

GitHub 私有 Release 的下载 URL 需要仓库权限，不能匿名 curl；推荐 clone 后按目录安装。

## 谁能看到

- 插件源码和 Release 公开；
- Admin 源码/生产配置在私有仓库，不在这里；
- 不在 dshmarket 搜索、不在公开索引；
- 不要提交到 awesome-dsh-plugin。

## 更新

1. 改 `package.json` version；
2. 更新 `docs/CHANGELOG.md`；
3. 打新 tag、上传新 tgz；
4. 各机器重新 `install_bundle`。

公司选择/会话开关/平台 Token 不受影响。
