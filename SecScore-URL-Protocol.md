# SecScore URL 协议说明

## 1. 概述

SecScore 提供自定义 URL 协议，用于从浏览器、命令行或其他应用中直接调用软件功能。

- 协议名（scheme）：`secscore`
- URL 基本格式：

  ```text
  secscore://<command>[/<subcommand>]
  ```

- 大小写约定：
  - 协议名、命令部分大小写不敏感（`SecScore://settings` 与 `secscore://SETTINGS` 等效）
  - 建议实际使用中统一采用小写

- 行为约定：
  - 若 SecScore **未运行**：启动应用，并根据 URL 执行对应操作
  - 若 SecScore **已运行**：不会启动第二个实例，而是把 URL 转发给现有实例执行

---

## 2. 页面导航类 URL

用于打开主窗口并跳转到指定功能页面。

### 2.1 首页

- URL：

  ```text
  secscore://
  secscore://home
  ```

- 行为：
  - 打开主窗口，跳转到 `/`（首页）

### 2.2 学生管理

- URL：

  ```text
  secscore://students
  ```

- 行为：
  - 打开主窗口，跳转到 `/students`

### 2.3 积分管理

- URL：

  ```text
  secscore://score
  ```

- 行为：
  - 打开主窗口，跳转到 `/score`

### 2.4 排行榜

- URL：

  ```text
  secscore://leaderboard
  ```

- 行为：
  - 打开主窗口，跳转到 `/leaderboard`

### 2.5 结算历史

- URL：

  ```text
  secscore://settlements
  ```

- 行为：
  - 打开主窗口，跳转到 `/settlements`

### 2.6 理由管理

- URL：

  ```text
  secscore://reasons
  ```

- 行为：
  - 打开主窗口，跳转到 `/reasons`

### 2.7 系统设置

- URL：

  ```text
  secscore://settings
  ```

- 行为：
  - 打开主窗口，跳转到 `/settings`

---

## 3. 悬浮侧边栏控制类 URL

用于控制右侧的全局悬浮侧边栏（`global-sidebar` 窗口）。

### 3.1 显示悬浮侧边栏

- URL：

  ```text
  secscore://sidebar/show
  ```

- 行为：
  - 若悬浮侧边栏已存在：`show()` + `focus()`
  - 若不存在：创建 `global-sidebar` 窗口并显示

### 3.2 隐藏悬浮侧边栏

- URL：

  ```text
  secscore://sidebar/hide
  ```

- 行为：
  - 若悬浮侧边栏存在：调用 `hide()`
  - 若不存在：不做任何操作

### 3.3 切换显隐（toggle）

- URL：

  ```text
  secscore://sidebar/toggle
  secscore://sidebar
  ```

- 行为：
  - 若悬浮侧边栏存在：
    - 当前可见 → 隐藏
    - 当前不可见 → 显示并 `focus()`
  - 若不存在：创建并显示 `global-sidebar` 窗口

---

## 4. 使用示例（Windows）

### 4.1 通过“运行”对话框（Win + R）

在“运行”窗口中输入：

```text
secscore://settings
secscore://sidebar/toggle
```

点击“确定”后，SecScore 会执行对应操作。

### 4.2 通过浏览器地址栏

在浏览器（如 Edge）地址栏中输入：

```text
secscore://score
```

浏览器会唤起 SecScore 应用并跳转到“积分管理”。

### 4.3 通过命令行

在命令行中执行：

```bash
start "" "secscore://leaderboard"
```

会唤起 SecScore 并打开“排行榜”。

---

## 5. 安装与注册说明（打包版本）

> 下述内容针对打包后的安装版本，开发模式（`pnpm dev`）下可能不会自动注册协议。

- 协议注册配置位于 `electron-builder.yml`：
  - `scheme`: `secscore`
  - `name`: `SecScore URL Protocol`
- 在安装完成后，操作系统会把所有 `secscore://` URL 交给 SecScore 处理。

---

## 6. 错误与兼容性说明

- 所有 URL 都为本地调用，不通过网络传输。
- 当前 URL 协议只包含页面级操作与悬浮侧边栏控制，不带参数（例如学生 ID）。
- 对于未识别的命令，例如：

  ```text
  secscore://unknown
  ```

  主进程会忽略该 URL，不会抛出错误弹窗。

---

## 7. 后续扩展建议

如果需要更复杂的 URL 功能，可以在保持现有兼容性的前提下扩展，例如：

- 按学生 ID 打开积分记录：

  ```text
  secscore://score/12345
  ```

- 带筛选条件的排行榜视图：

  ```text
  secscore://leaderboard/today
  ```

此类扩展只需在主进程的 URL 解析函数中增加相应分支逻辑即可。

