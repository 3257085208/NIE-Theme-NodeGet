# v1.4.24 更新说明

- 首页 VPS 卡片新增 IPv4 Ping / IPv4 TCP Ping / IPv6 Ping / IPv6 TCP Ping 四个显示开关。
- 首页延迟默认仍然只显示 IPv4 TCP Ping，用户可以在后台或环境变量中自行开启其它类型，也可以全部关闭。
- VPS 详情页延迟图表 Tooltip 和折线名称改为显示解析后的线路名称，例如 `福建移动`、`上海电信`，不再直接展示原始目标地址。
- Fork GitHub + Cloudflare Workers / Pages 版本新增首页延迟开关环境变量：`HOME_SHOW_IPV4_PING`、`HOME_SHOW_IPV4_TCPING`、`HOME_SHOW_IPV6_PING`、`HOME_SHOW_IPV6_TCPING`。
- 保留 v1.4.23 的详情页延迟数据查询数量修复。
