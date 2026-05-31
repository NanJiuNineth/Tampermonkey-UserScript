# Tampermonkey UserScripts

Tampermonkey 油猴脚本集合。

---

## GitLab Quick MR

> 在 GitLab 页面快速批量创建 Merge Request，支持多种模式，无需手动填写表单。

### 功能

- **单个模式** — 一个源分支 → 一个目标分支
- **一对多模式** — 同一源分支同时合入多个目标分支
- **多对一模式** — 多个源分支统一合入同一目标分支
- **自定义配对** — 每行独立设置任意源/目标分支对
- **分支补全** — 实时从页面 DOM 收集分支名，输入即提示
- **批量汇总页** — 批量模式生成汇总页，支持一键全部打开
- **配置持久化** — 记住上次使用的目标分支、标题、选项
- **悬浮按钮** — 页面右下角常驻入口

### 安装

1. 安装 [Tampermonkey](https://www.tampermonkey.net/)
2. 新建脚本，将 [`gitlab-quick-mr.user.js`](./gitlab-quick-mr.user.js) 的内容粘贴进去保存
3. 或直接拖入 `.user.js` 文件到 Tampermonkey 扩展页面

默认匹配所有站点（`https://*/*`），私有 GitLab 实例无需修改。

### 使用

| 操作 | 说明 |
|------|------|
| `Alt + M` | 唤起 / 关闭面板 |
| `Esc` | 关闭面板 |
| 页面右下角 **MR** 按钮 | 点击唤起面板 |
| 分支输入框 `↑` `↓` `Enter` | 键盘选择补全项 |
| 多分支输入框 `Enter` / `,` | 确认并添加标签 |
| 多分支输入框 `Backspace` | 删除最后一个标签 |

### 选项说明

| 选项 | 说明 |
|------|------|
| Squash commits | 开启 squash，合并时压缩提交 |
| 合并后删除源分支 | 自动勾选 `force_remove_source_branch` |
| Draft MR | 标题自动加 `Draft:` 前缀 |
| MR 标题 | 留空时从源分支名自动生成（去掉前缀、转 Title Case） |
