# v1.4.23 更新说明

本次版本基于当前公开版 v1.4.14 继续优化，重点增加后台可配置项，并优化首页卡片和 VPS 详情页的资源展示方式。

## 新增功能

### 后台外观设置

现在主题颜色和背景图案可以在 NodeGet 后台配置，不需要访客在前端页面手动切换。

可配置内容包括：

- 背景配色
- 背景图案
- 背景纹理密度
- 背景纹理强度

前端原来的背景/颜色切换入口已移除，站点显示风格由站长统一控制。

### 首页 VPS 卡片指标样式切换

首页 VPS 卡片现在支持两种资源展示方式：

- 圆环样式：CPU / 内存 / 磁盘
- 横条样式：CPU / 内存 / 磁盘 / 负载

横条样式为 18 个小格子，并带有数值变化动画。

### VPS 详情页资源指标样式切换

VPS 详情页也支持两种资源展示方式：

- 圆环样式：CPU / 内存 / 硬盘 / Swap
- 横条样式：CPU / 内存 / 硬盘 / Swap

横条样式同样使用 18 个小格子，并支持动画变化。

### 首页延迟指定线路

可以在后台指定首页 VPS 卡片里显示哪些延迟线路。

例如：

```txt
上海电信,福建电信,上海移动
```

也可以填写目标关键词：

```txt
sh-ct,fj-ct,sh-cm
```

留空则显示全部线路。

### VPS 详情页延迟显示开关

VPS 详情页现在可以分别控制是否显示：

- IPv4 Ping
- IPv4 TCP Ping
- IPv6 Ping
- IPv6 TCP Ping

适合只想展示部分延迟数据的站点。

### Fork GitHub + Cloudflare Workers 环境变量支持

使用 Fork GitHub + Cloudflare Workers / Pages 部署时，也可以通过环境变量配置这些新增功能。

新增环境变量包括：

```txt
BACKGROUND_PALETTE
BACKGROUND_PATTERN
BACKGROUND_DENSITY
BACKGROUND_OPACITY
HOME_CARD_METRIC_STYLE
DETAIL_RESOURCE_METRIC_STYLE
HOME_TCPING_INCLUDE
DETAIL_SHOW_IPV4_PING
DETAIL_SHOW_IPV4_TCPING
DETAIL_SHOW_IPV6_PING
DETAIL_SHOW_IPV6_TCPING
```

## 优化内容

### 优化横条格子显示方式

横条格子不再显示半格填充。

现在每个格子只有三种状态：

- 完整亮起
- 浅色亮起，用于表示不足一个完整格子的占用
- 不亮

例如 18 格下，55% 会显示为 9 个完整格子 + 第 10 个浅色格子。

### 优化横条动画

CPU、内存、硬盘、Swap、负载发生变化时，横条会平滑增加或减少，观感更接近圆环动画。

## 修复与调整

- 移除前端背景/颜色切换入口，统一改为后台配置。
- 后台配置项增加分类标题，配置更清晰。
- 保留公开版已有的首页全部 TCP Ping 展示、手机端最后一格灰色修复、线路名称识别等功能。
