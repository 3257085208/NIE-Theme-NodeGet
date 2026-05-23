# NIE Theme NodeGet

一个面向 NodeGet 的轻量探针前端主题，采用卡片式布局，重点优化节点状态展示、延迟质量展示和移动端观感。

- 当前版本：`v1.4.1`
- 作者：`MarkNKX`
- 许可证：`AGPL-3.0`

## 预览

本主题适合用于公开探针页、个人节点状态页和多地区 VPS 监控展示。

## 主要特性

- 卡片、表格、地图三种视图
- 国家与地区筛选
- 节点搜索与排序
- CPU、内存、磁盘、网络、运行时长展示
- 首页 VPS 卡片展示三网 IPv4 TCPing
- 实例详情页支持 IPv4 / IPv6 Ping 与 TCPing
- 剩余价值、月成本、到期时间统计
- 支持浅色 / 深色模式
- 支持自定义站点标题、Logo、页脚与刷新间隔
- 兼容 NodeGet 新版主题导入、预览与更新流程

## 延迟任务识别规则

主题会根据延迟任务的目标地址自动识别 IPv4、IPv6、Ping 和 TCPing。

示例：

```txt
sh-cu-v4.ip.zstaticcdn.com:80
```

格式：

```txt
城市-运营商-v4/v6.ip.域名:端口
```

识别规则：

| 标记 | 含义 |
| --- | --- |
| `v4` | IPv4 |
| `v6` | IPv6 |
| 带端口 | TCPing |
| 不带端口 | Ping |
| `ct` | 电信 |
| `cu` | 联通 |
| `cm` | 移动 |

示例：

| 任务目标 | 展示类型 |
| --- | --- |
| `sh-cu-v4.ip.zstaticcdn.com:80` | IPv4 TCPing |
| `sh-cu-v6.ip.zstaticcdn.com:80` | IPv6 TCPing |
| `sh-cu-v4.ip.zstaticcdn.com` | IPv4 Ping |
| `sh-cu-v6.ip.zstaticcdn.com` | IPv6 Ping |

没有对应数据的延迟模块会自动隐藏，避免页面出现空白区块。

## 安装方式

在 NodeGet 后台进入主题管理，选择远程导入主题，并填写主题分发地址即可。

导入时建议选择 `监控 + ping` 权限预设，以便正常显示 Ping 与 TCPing 数据。

## 更新记录

### v1.4.1

- 修复浏览器标签页后台停留一段时间后，首页 TCPing 小格子出现灰色空洞的问题。
- 页面恢复可见、窗口重新聚焦或网络恢复时，会自动刷新节点状态与延迟数据。
- 提高多节点场景下延迟数据恢复速度。

### v1.4.0

- 修复详情页延迟质量列表会隐藏同运营商多个任务的问题。
- 修复剩余价值统计未按币种折算的问题。
- 新增 IPv4 / IPv6 Ping 与 TCPing 展示。
- 首页 VPS 卡片默认展示 IPv4 TCPing。
- 兼容 NodeGet 新版主题导入、预览与更新流程。
- 支持后台修改站点标题、Logo、页脚与刷新间隔。
- 左下角主题标识显示当前版本号。

## 本地开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## License

AGPL-3.0
