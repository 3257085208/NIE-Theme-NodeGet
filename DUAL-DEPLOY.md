# 双部署说明

这个包不包含 `dist/` 和 `node_modules/`，结构更接近原始源码包。

## 方式一：独立静态部署

```bash
npm install
npm run build
```

构建完成后，将 `dist/` 部署到 Cloudflare Pages、Vercel、EdgeOne Pages、GitHub Pages 或任意静态网站托管即可。

## 方式二：NodeGet 后台主题导入

```bash
npm install
npm run build
```

构建完成后，后台导入：

```text
dist/nodeget-theme.zip
```

也可以直接使用单独提供的 `*-import.zip`。
