# NIE Theme NodeGet

NIE Theme NodeGet 是一个面向 NodeGet 的公开探针前端主题，采用卡片式布局，支持多节点监控、地区筛选、表格视图、地图视图、剩余价值统计，以及 IPv4/IPv6 Ping、TCP Ping 展示。

当前版本：`v1.4.0`  
作者：`MarkNKX`

## 主要特性

- 卡片 / 表格 / 地图三种视图
- 国家与地区筛选、搜索、排序
- CPU、内存、磁盘、网络、运行时长展示
- IPv4 Ping、IPv6 Ping、IPv4 TCP Ping、IPv6 TCP Ping
- 首页卡片默认展示 IPv4 TCP Ping
- 实例详情页按协议类型自动分组展示延迟数据
- 剩余价值、月成本、到期时间统计
- 浅色 / 深色模式
- 背景样式切换
- 支持 NodeGet 主题后台的站点标题、Logo、页脚、刷新间隔配置
- 支持 NodeGet 新版主题远程导入、预览与更新

## v1.4.0 更新说明

### Issues 修复

- 修复 Issue #1：详情页延迟质量列表会隐藏同运营商多个任务的问题。
  - 原因是质量列表曾按运营商过滤，只保留最新一条。
  - 现在质量列表与折线图使用同一份完整任务数据。
  - 同一运营商下的不同线路，例如普通电信与 CN2，会同时显示。

- 修复 Issue #2：剩余价值统计未按币种折算的问题。
  - 新增 CNY 折算逻辑。
  - 支持 USD、EUR、JPY、HKD、TWD、SGD、GBP、AUD、CAD、KRW、RUB、TRY 等常见币种。
  - 优先使用在线汇率接口，接口不可用时使用内置汇率。

### 延迟展示更新

- 支持 IPv4 / IPv6 Ping。
- 支持 IPv4 / IPv6 TCP Ping。
- 任务类型由任务目标自动识别：
  - 目标包含 `v4`：IPv4
  - 目标包含 `v6`：IPv6
  - 目标带端口：TCP Ping
  - 目标不带端口：Ping
- 首页 VPS 卡片默认只显示 IPv4 TCP Ping。
- 没有对应数据的延迟模块不会显示。
- 页面恢复可见、窗口重新聚焦、网络恢复时会重新拉取延迟数据，减少后台标签页恢复后小格子无数据的问题。

### NodeGet 主题规范适配

- 增加 `nodeget-theme.json`。
- 增加 `nodeget-theme-files.json` 构建脚本。
- 增加 `config.json` 构建脚本。
- 增加 `download.html`。
- 增加 `custom.css`、`custom.js`。
- 支持 NodeGet 后台远程导入主题。
- 支持 NodeGet 后台预览主题。
- 支持 NodeGet 后台更新主题。
- 支持 NodeGet 后台用户配置表单。
- 兼容 `backend_url` 与 `websocket` 两种后端地址字段。
- 兼容 `user_preferences`、`theme_config`、顶层配置字段。

### 主题信息更新

- 作者改为 `MarkNKX`。
- 左下角主题标识改为 `Theme by MarkNKX v1.4.0`。
- 版本号统一从 `package.json` 同步到 `nodeget-theme.json`。

## NodeGet 主题分发

推荐使用 Cloudflare Pages 作为主题分发站。

构建设置：

```txt
Build command: npm run build
Build output directory: dist
Root directory: /
```

部署后确认这些地址可以访问：

```txt
https://你的主题分发域名/nodeget-theme.json
https://你的主题分发域名/nodeget-theme-files.json
https://你的主题分发域名/config.json
https://你的主题分发域名/download.html
```

`nodeget-theme-files.json` 必须是字符串数组，并且包含 `index.html`。

远程导入地址：

```txt
https://dash.nodeget.com/#/dashboard/theme-management?add=https://你的主题分发域名
```

## 自用部署

本主题也可以直接作为自己的 NodeGet 探针前端使用。

Cloudflare Pages 构建设置相同：

```txt
Build command: npm run build
Build output directory: dist
Root directory: /
```

在环境变量中设置 `NODEGET_CONFIG`：

```json
{
  "user_preferences": {
    "site_name": "NodeGet Status",
    "site_logo": "",
    "footer": "Powered by NodeGet",
    "refresh_interval_ms": 10000
  },
  "site_tokens": [
    {
      "name": "master-1",
      "backend_url": "wss://your-backend.example.com",
      "token": "YOUR_VISITOR_TOKEN_HERE"
    }
  ]
}
```

建议使用 Visitor Token。

## 旧环境变量兼容

没有设置 `NODEGET_CONFIG` 时，也可以继续使用旧格式：

```txt
SITE_NAME=NodeGet Status
SITE_LOGO=
SITE_FOOTER=Powered by NodeGet
REFRESH_INTERVAL_MS=10000
SITE_1=name="master-1",backend_url="wss://your-backend.example.com",token="YOUR_VISITOR_TOKEN_HERE"
SITE_2=name="master-2",backend_url="wss://your-backend.example.com",token="YOUR_VISITOR_TOKEN_HERE"
```

`SITE_n` 需要从 `SITE_1` 开始连续填写。

## 延迟任务命名规则

主题按任务目标识别线路、协议与 IP 类型。

示例：

```txt
sh-cu-v4.ip.zstaticcdn.com:80
```

格式：

```txt
城市-运营商-v4/v6.ip.域名:端口
```

识别规则：

| 字段 | 含义 |
| --- | --- |
| `v4` | IPv4 |
| `v6` | IPv6 |
| 带端口 | TCP Ping |
| 不带端口 | Ping |
| `ct` | 电信 |
| `cu` | 联通 |
| `cm` | 移动 |

示例：

| 任务目标 | 展示类型 |
| --- | --- |
| `sh-cu-v4.ip.zstaticcdn.com:80` | IPv4 TCP Ping |
| `sh-cu-v6.ip.zstaticcdn.com:80` | IPv6 TCP Ping |
| `sh-cu-v4.ip.zstaticcdn.com` | IPv4 Ping |
| `sh-cu-v6.ip.zstaticcdn.com` | IPv6 Ping |

## 版本管理

版本号遵循语义化版本规则：

| 类型 | 示例 | 使用场景 |
| --- | --- | --- |
| Patch | `1.4.0` -> `1.4.1` | Bug 修复、文案调整、小范围兼容修复 |
| Minor | `1.4.0` -> `1.5.0` | 新功能、新展示模块、兼容新接口 |
| Major | `1.4.0` -> `2.0.0` | 大改版、不兼容旧配置或旧接口 |

发布新版本时只需要修改 `package.json` 里的 `version`。构建时会同步写入 `dist/nodeget-theme.json`。

NodeGet 后台更新主题时会读取分发站上的 `nodeget-theme.json` 和 `nodeget-theme-files.json`。发布新版后，推送代码并等待分发站重新构建，再到 NodeGet 后台点击更新即可。

## 本地开发

```bash
npm install
npm run dev
```

## 类型检查与构建

```bash
npm run typecheck
npm run build
```

构建产物：

```txt
dist/
dist/nodeget-theme.zip
```

## 自定义文件

```txt
public/custom.css
public/custom.js
```

这两个文件会进入最终主题包，便于在 NodeGet 后台继续维护轻量自定义内容。

## License

AGPL-3.0
