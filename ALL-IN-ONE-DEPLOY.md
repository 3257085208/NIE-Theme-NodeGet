# NIE Theme NodeGet v1.4.7 Rounded - All-in-One Deploy Package

这个压缩包保留两种部署方式，不是单独的导入包，也不是单独的源码包。

## 方式一：NodeGet 后台主题导入

用于 NodeGet 后台导入时，请使用下面这个文件：

```txt
nodeget-theme-import.zip
```

它和下面这个文件内容一致：

```txt
dist/nodeget-theme.zip
```

导入后可在 NodeGet 后台配置站点标题、Logo、页脚、刷新间隔等。

## 方式二：独立前端部署 / Cloudflare Pages / Workers / Vercel

如果要作为独立前端部署，可以使用整个项目源码。

常用命令：

```bash
npm install
npm run typecheck
npm run build
```

构建后的静态文件在：

```txt
dist/
```

可以把 `dist/` 作为静态站点目录部署。

## 本版已修改内容

- 全站字体栈优化：优先 MiSans / HarmonyOS Sans SC / 阿里巴巴普惠体 / 苹方，降低中文、英文、数字割裂感。
- 数字显示改用 `tabular-nums`，减少不必要的 `font-mono`。
- 首页 VPS 卡片 TCPing 小格子改为按延迟高度变化：
  - ≤ 50ms：1/4 高度
  - 50–150ms：2/4 高度
  - 150–300ms：3/4 高度
  - > 300ms / 丢包：满高度
- 延迟质量条颜色改为低饱和柔和配色。
- 部分过重字重从 `font-black / font-extrabold` 调整为更舒服的 `font-bold / font-semibold`。

## 目录说明

```txt
nodeget-theme-import.zip     # NodeGet 后台导入用
src/                         # 源码
public/                      # 公共资源
dist/                        # 已构建静态文件
dist/nodeget-theme.zip       # NodeGet 后台导入包
package.json                 # 项目配置
README.md                    # 原项目说明
```
