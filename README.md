# NIE Theme NodeGet

一个基于 NodeGet StatusShow 改造的公开探针前端主题，支持 NodeGet 规范主题结构、主题分发、实时汇率、IPv4/IPv6 Ping 与 TCP Ping 展示。

## 已适配的 NodeGet 主题规范

构建后 `dist/` 会包含 NodeGet 控制面板主题导入需要的文件：

```txt
nodeget-theme.json
nodeget-theme-files.json
config.json
custom.css
custom.js
download.html
```

同时保留所有静态资源、Vite 构建产物和主题源码逻辑。

## 推荐分发方式

推荐使用 Cloudflare Pages 分发主题。Pages 免费域名、默认 CORS、GitHub 自动构建、IPv4/IPv6 双栈都更适合 NodeGet 主题分发。

导入地址示例：

```txt
https://dash.nodeget.com/#/dashboard/theme-management?add=https://你的主题分发域名
```

直接下载主题包：

```txt
https://你的主题分发域名/download.html
```

## 配置方式

推荐使用 NodeGet 标准的 `NODEGET_CONFIG`：

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
      "name": "master server node 1",
      "backend_url": "wss://your-backend.example.com",
      "token": "YOUR_VISITOR_TOKEN_HERE"
    }
  ]
}
```

本地开发可以复制：

```bash
cp .env.example .env.local
```

然后填写 `.env.local` 里的 `NODEGET_CONFIG`。

也兼容旧环境变量：

```txt
SITE_NAME=NodeGet Status
SITE_LOGO=
SITE_FOOTER=Powered by NodeGet
REFRESH_INTERVAL_MS=10000
SITE_1=name="master-1",backend_url="wss://your-backend.example.com",token="YOUR_VISITOR_TOKEN_HERE"
```

## 延迟任务命名规则

主题会按任务目标字符串识别 IPv4/IPv6 和 Ping/TCP Ping：

```txt
sh-cu-v4.ip.zstaticcdn.com:80
城市-运营商-v4/v6.ip.域名:端口
```

规则：

```txt
v4 = IPv4
v6 = IPv6
有 :端口 = TCP Ping
没有 :端口 = Ping
ct = 电信
cu = 联通
cm = 移动
```

首页 VPS 卡片默认只显示 IPv4 TCP Ping；实例详情页会按 IPv4 Ping、IPv6 Ping、IPv4 TCP Ping、IPv6 TCP Ping 分块展示，没有数据的区块不会显示。

## 开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run typecheck
npm run build
```

构建后：

```txt
dist/                 静态主题分发目录
dist/nodeget-theme.zip  自动生成的主题 zip 包
```

## 自定义

```txt
public/custom.css
public/custom.js
```

这两个文件会进入最终主题包，方便用户在 NodeGet 控制面板导入后继续做轻量自定义。

## License

AGPL-3.0
