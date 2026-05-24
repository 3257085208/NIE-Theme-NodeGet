# Fork GitHub + Cloudflare Workers / Pages 配置说明

这个版本用于 Fork GitHub 后部署到 Cloudflare Workers / Pages，不包含 `dist/` 和 `node_modules/`。

## 基本环境变量

```txt
SITE_NAME=我的探针
SITE_LOGO=https://example.com/logo.png
SITE_FOOTER=Powered by NodeGet
SITE_1=name="master-1",backend_url="wss://m1.example.com",token="your-visitor-token"
```

多个主控请继续添加：

```txt
SITE_2=name="master-2",backend_url="wss://m2.example.com",token="your-visitor-token"
SITE_3=name="master-3",backend_url="wss://m3.example.com",token="your-visitor-token"
```

## 新增主题配置环境变量

```txt
# 背景外观
BACKGROUND_PALETTE=cloud
BACKGROUND_PATTERN=grid
BACKGROUND_DENSITY=22
BACKGROUND_OPACITY=10

# 首页 VPS 卡片资源样式：circle 或 bar
HOME_CARD_METRIC_STYLE=circle

# VPS 详情页资源样式：circle 或 bar
DETAIL_RESOURCE_METRIC_STYLE=circle

# 首页延迟指定线路，留空显示全部
HOME_TCPING_INCLUDE=上海电信,福建电信,上海移动

# VPS 详情页延迟显示开关
DETAIL_SHOW_IPV4_PING=true
DETAIL_SHOW_IPV4_TCPING=true
DETAIL_SHOW_IPV6_PING=true
DETAIL_SHOW_IPV6_TCPING=true
```

## 可选值说明

### `HOME_CARD_METRIC_STYLE`

```txt
circle = 首页 CPU / 内存 / 磁盘圆环
bar    = 首页 CPU / 内存 / 磁盘 / 负载 18 格横条
```

### `DETAIL_RESOURCE_METRIC_STYLE`

```txt
circle = 详情页 CPU / 内存 / 硬盘 / Swap 圆环
bar    = 详情页 CPU / 内存 / 硬盘 / Swap 18 格横条
```

### `HOME_TCPING_INCLUDE`

可以写中文线路名：

```txt
上海电信,福建电信,上海移动
```

也可以写目标关键词：

```txt
sh-ct,fj-ct,sh-cm
```

如果目标是普通 IP，例如 `1.1.1.1:80`，可以写：

```txt
1.1.1.1
```

或者：

```txt
1.1.1.1:80
```

## 构建命令

```bash
npm install
npm run build
```

Cloudflare Pages / Workers 的输出目录为：

```txt
dist
```
