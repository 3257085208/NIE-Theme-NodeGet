# NodeGet StatusShow Theme

NodeGet StatusShow 前端主题版。

## 预览

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
- 左下角主题链接
- 右下角 NodeGet 链接

## 一键部署

### Cloudflare Workers

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/3257085208/NIE-Theme-NodeGet)

### Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/3257085208/NIE-Theme-NodeGet&project-name=NIE-Theme-NodeGet&repository-name=NIE-Theme-NodeGet&env=SITE_NAME,SITE_LOGO,SITE_FOOTER,SITE_1,SITE_2&envDescription=NodeGet%20StatusShow%20Config&envLink=https://nodeget.com/guide/install/status-show)

## 配置方式

本版本使用环境变量配置。

Cloudflare Workers 部署时，请在部署页面的高级设置里添加环境变量，或者部署后到 Worker 的设置里添加。

不要修改 `config.json`。

### 环境变量

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

Cloudflare Workers：

```bash
npm install
npm run build
npx wrangler deploy
```

Vercel：

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
