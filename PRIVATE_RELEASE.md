# 私有发布说明

本插件是 **Yejia 私有软件**，不进入 dshmarket / awesome-dsh-plugin 公开市场，不提交 PR。

## 发布方式

1. GitHub **私有仓库**（仓库名建议 `dsh-yejia-mcp-hub`）；
2. 推送 tag，例如 `v0.2.1`；
3. 在 GitHub Release 挂载：

```text
dsh-yejia-mcp-hub-0.2.1.tgz
```

4. 只邀请需要使用的人加入仓库（Read 权限）。

## 安装

有仓库权限的机器：

```bash
git clone git@github.com:你的组织/dsh-yejia-mcp-hub.git /path/dsh-yejia-mcp-hub
```

然后：

```text
plugin_manager install_bundle
target: /path/dsh-yejia-mcp-hub
enabled: true
```

或者下载 release 资产后：

```text
plugin_manager install_bundle
target: /path/dsh-yejia-mcp-hub-0.2.1.tgz
enabled: true
```

GitHub 私有 Release 的下载 URL 需要仓库权限，不能匿名 curl；推荐 clone 后按目录安装。

## 谁能看到

- 只有被邀请进私有仓库的人能看到代码和 Release；
- 不在 dshmarket 搜索、不在公开索引；
- 不要提交到 awesome-dsh-plugin；
- 分享时给对方仓库邀请或可访问的 tgz，不是公开链接。

## 更新

1. 改 `package.json` version；
2. 更新 `docs/CHANGELOG.md`；
3. 打新 tag、上传新 tgz；
4. 各机器重新 `install_bundle`。

公司选择/会话开关/平台 Token 不受影响。
