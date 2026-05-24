# NodeGet StatusShow Theme

NodeGet StatusShow 前端主题版。

## 打包说明

当前压缩包是“两种部署方式合一版”：

- `nodeget-theme-import.zip` / `dist/nodeget-theme.zip`：用于 NodeGet 后台主题导入。
- 项目源码 + `dist/`：用于独立前端部署、Cloudflare Pages / Workers / Vercel 等。


[点击查看预览](https://status.qq.sg)

## 图片预览

![904a8493e343c07d5d84f2fa4732ada4.png](https://img.nkx.moe/file/6KZhPpSB.png)

![c1de760a875ca93c01c8355100b1c36d.png](https://img.nkx.moe/file/aKD8feIV.png)

![14a8ea457f3d4b4150e42fe57bf47990.png](https://img.nkx.moe/file/6gIdyk6Q.png)

![4083964167370ccdb3f9946e7c0600d0.png](https://img.nkx.moe/file/uZdapYTP.png)

## 主要改动

- 首页卡片样式
- CPU / 内存 / 磁盘圆环
- 背景样式切换
- 浅色 / 深色模式
- 地图视图
- 表格视图
- 标签筛选
- 地区筛选
- 搜索和排序
- 移动端显示
- IPv4 / IPv6 Ping 展示
- IPv4 / IPv6 TCP Ping 展示
- 首页卡片默认展示 IPv4 TCP Ping
- 实例详情页延迟数据自动分组
- 剩余价值按币种折算为 CNY
- 支持 NodeGet 主题远程导入、预览和更新
- 支持后台配置站点标题、Logo、页脚和刷新间隔

## 版本更新

### v1.4.23

- 优化首页和详情页横条指标动画。
- 横条格子不再出现半格填充，格子要么完整显示，要么不显示。
- 当数值不足一个完整格子时，会使用更浅颜色显示当前不完整占用。

### v1.4.21

- 新增首页卡片指标样式切换，可在后台选择圆环样式或 10 格横条样式。
- 新增首页延迟指定线路配置，可填写 `上海电信,福建电信,上海移动` 或 `sh-ct,fj-ct,sh-cm` 这类关键词，只展示指定线路。
- 新增首页 IPv4 Ping、IPv4 TCP Ping、IPv6 Ping、IPv6 TCP Ping 四个独立显示开关。
- 保留默认首页只展示 IPv4 TCP Ping，用户可按需开启更多延迟类型。
- Fork GitHub + Cloudflare 部署方式支持通过环境变量配置新增选项。

### v1.4.14

- 优化全站字体栈，优先使用 MiSans / HarmonyOS Sans SC，降低中文与数字的割裂感。
- 首页 VPS 卡片 TCPing 小格子改为按延迟高度变化：≤50ms 为 1/4，高于 300ms 为满高。
- 延迟质量条改为低饱和柔和配色，并减少 font-mono / 超重字重在数据区域的使用。

### v1.4.14

- 修复页面切换到后台一段时间后，首页延迟小格子出现大量灰色空洞的问题。
- 页面重新可见、窗口重新聚焦、网络恢复时，会重新拉取节点动态数据和延迟任务数据。

### v1.4.14

- 修复详情页延迟质量列表隐藏同运营商多个任务的问题。
- 修复剩余价值统计未按币种折算的问题。
- 新增 IPv4 / IPv6 Ping、IPv4 / IPv6 TCP Ping 展示。
- 适配 NodeGet 新主题模式，支持远程导入、后台预览和主题更新。

## 延迟任务命名规则

主题会根据任务目标识别线路、协议和 IP 类型。

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

## 新版主题导入方式

本主题支持最新版部署方式 仅需点击下方按钮
或在后台主题管理从远程导入主题 站点URL填写```https://dash.themes.qq.sg```即可。

<a href="https://dash.nodeget.com/#/dashboard/theme-management?add=https://dash.themes.qq.sg">
  <img src="https://dash.nodeget.com/deploy-button.png" alt="deploy button" width="230px" />
</a>

导入后可以在后台修改站点标题、Logo、页脚文本和刷新间隔。

## 一键部署

### Cloudflare Workers

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/3257085208/NIE-Theme-NodeGet)

### Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/3257085208/NIE-Theme-NodeGet&project-name=NIE-Theme-NodeGet&repository-name=NIE-Theme-NodeGet&env=SITE_NAME,SITE_LOGO,SITE_FOOTER,SITE_1,SITE_2&envDescription=NodeGet%20StatusShow%20Config&envLink=https://nodeget.com/guide/install/status-show)

## 配置方式

### NodeGet 后台配置

通过 NodeGet Dashboard 导入主题后，可以直接在主题管理里修改用户配置。

支持配置项：

| 配置项 | 说明 |
| --- | --- |
| 站点标题 | 显示在导航栏的站点名称 |
| 站点图标 | Logo 图片链接 |
| 页脚文本 | 显示在页面底部的文字 |
| 刷新间隔 | 动态监控数据刷新间隔 |

### 环境变量配置

直接部署为独立前端时，也可以继续使用环境变量配置。

Cloudflare Workers 部署时，请在部署页面的高级设置里添加环境变量，或者部署后到 Worker 的设置里添加。

不要修改 `config.json`。

#### 环境变量

```txt
SITE_NAME=狼牙的探针
SITE_LOGO=https://example.com/logo.png
SITE_FOOTER=Powered by NodeGet
SITE_1=name="master-1",backend_url="wss://m1.example.com",token="abc123"
SITE_2=name="master-2",backend_url="wss://m2.example.com",token="xyz789"
```

说明：

| 变量 | 说明 |
| --- | --- |
| `SITE_NAME` | 站点名称 |
| `SITE_LOGO` | 站点 Logo |
| `SITE_FOOTER` | 页脚文字 |
| `SITE_1` | 第一个主控 |
| `SITE_2` | 第二个主控 |

`SITE_n` 从 `SITE_1` 开始连续填写，中间不要断。

比如有三个主控，就写：

```txt
SITE_1=...
SITE_2=...
SITE_3=...
```

不要只写 `SITE_1` 和 `SITE_3`。

`SITE_n` 的格式：

```txt
name="主控名称",backend_url="wss://你的服务地址",token="Visitor Token"
```

`backend_url` 一般使用 `wss://`。

Token 在 NodeGet Dashboard 里创建，使用 Visitor 权限模板。

参考官方文档：

```txt
https://nodeget.com/guide/install/status-show
```

## 从官方默认前端切换过来

如果之前部署过官方默认 StatusShow 前端，可以这样换：

1. Fork 本仓库
2. 到已经部署的 Worker 里解绑原来的 GitHub 仓库
3. 重新连接你 Fork 后的仓库
4. 检查环境变量是否还在
5. 重新跑一次构建 / 部署

重新连接仓库后建议手动触发一次构建，让环境变量重新初始化。

## 本地开发

```bash
git clone https://github.com/3257085208/NIE-Theme-NodeGet.git
cd NIE-Theme-NodeGet
npm install
npm run dev
```

## 构建

```bash
npm run build
```

构建产物在：

```txt
dist
```

## 手动部署

不想用一键部署的话，也可以自己部署。

### Cloudflare Pages

```txt
Build command: npm run build
Output directory: dist
```

### Cloudflare Workers

```bash
npm install
npm run build
npx wrangler deploy
```

### Vercel

```txt
Build command: npm run build
Output directory: dist
```

## 自定义

常用文件：

```txt
src/styles/global.css
src/components/Background.tsx
src/components/NodeCard.tsx
src/components/Footer.tsx
```

预留文件：

```txt
public/custom.css
public/custom.js
```

## 链接

主题仓库：

```txt
https://github.com/3257085208/NIE-Theme-NodeGet
```

NodeGet：

```txt
https://github.com/NodeSeekDev/NodeGet
```

## License

AGPL-3.0
