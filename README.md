# 离线简历编辑器 · 导出后仍可编辑

单文件、离线可用、**导出的 Word 里文字和图片都还能改**的简历工具。

## 在线使用

**👉 https://refengxx.github.io/resume-editor/**

打开就能用，不用装任何东西。也可以下载 [`dist/index.html`](dist/index.html) 离线使用（断网也能跑）。

## 为什么做这个

现成的免费简历站（包括一些高星开源项目）导出走的是 `html2canvas` 截图 → PDF 的路线。
结果是：**导出后排版固化，图片和文字都改不了**，想微调一句话只能整份重做。

本项目把「可编辑」当作第一目标：

- 导出格式是真正的 **`.docx`**，不是 PDF、更不是图片
- 文字是**真文本节点**（31 个 `<w:t>`），Word 里双击就能改
- 照片是**真图片对象**（`word/media/*.png`），Word 里右键「更改图片」直接换
- 小节标题下的横线是**段落边框**（`w:pBdr`）而不是图片，所以改标题文字时线会跟着走，**不会错位**

## 特性

| 特性 | 说明 |
|---|---|
| **单文件离线** | 双击 `dist/index.html` 即用。无网络、无安装、无 CDN 依赖 |
| **实时预览** | 左侧编辑，右侧 A4 实时渲染，所见即所得 |
| **字号可调** | 全局缩放滑块（80%–130%）+ 正文/姓名/头衔/联系方式/小节标题 分项 pt 微调，预览与导出同时生效 |
| **字重可调** | 姓名 / 小节标题 可选 400–800。⚠️ Word 的字重只有「粗 / 不粗」两档：≥600 导出为粗体 |
| **版面可调** | 页边距（上下左右 mm）+ 小节标题上下间距（pt） |
| **模块自由排序** | 按住小节标题栏**拖动**调整顺序，也可用 ↑↓ 按钮 |
| **模板系统** | **10 套内置模板**；支持**导入/导出模板 JSON**，别人做的模板可直接拿来用 |
| **导出可编辑 Word** | `.docx`，文字可改、图片可换、排版不乱 |
| **打印成 PDF** | 浏览器打印面板选「另存为 PDF」，投递用 |
| **数据自持** | 简历数据存本地 `localStorage`，可导出/导入 JSON 备份、换设备继续改 |
| **隐私** | 照片与内容全部本地处理，**不上传任何服务器** |

## 快速开始

1. 下载 [`dist/index.html`](dist/index.html)
2. 双击用浏览器打开
3. 左边填，右边看，点「导出 Word (.docx)」

不需要装任何东西。

## 模板格式

模板是一份 JSON，**同一份配置同时驱动网页预览和 Word 导出**——这是"导入模板"能真正生效的前提。

```json
{
  "id": "classic-blue",
  "name": "经典蓝",
  "page":    { "mTop": 18, "mBottom": 18, "mLeft": 20, "mRight": 20 },
  "font":    { "family": "Microsoft YaHei", "base": 10, "lineSpacing": 1.55 },
  "color":   { "primary": "#1F3A5F", "text": "#333333", "muted": "#666666", "line": "#1F3A5F" },
  "weight":  { "name": 700, "sectionTitle": 700 },
  "header":  { "nameSize": 22, "titleSize": 11, "contactSize": 9, "photoWidth": 26 },
  "section": { "titleSize": 12, "underline": true, "spaceBefore": 10, "spaceAfter": 4 },
  "bullet":  { "marker": "•", "indent": 5 }
}
```

| 字段 | 含义 | 单位 |
|---|---|---|
| `page.m*` | 上下左右页边距 | mm |
| `font.family` | 字体名（需系统已安装） | — |
| `font.base` | 正文字号 | pt |
| `font.lineSpacing` | 行距倍数（1.55 ≈ 常态，1.38 更紧凑） | 倍数 |
| `color.*` | 主色 / 正文 / 次要 / 分隔线 | hex |
| `weight.name` / `weight.sectionTitle` | 姓名 / 小节标题字重（400–800） | 数值 |
| `header.nameSize` 等 | 姓名 / 头衔 / 联系方式字号 | pt |
| `header.photoWidth` | 照片宽度 | mm |
| `section.underline` | 小节标题是否加下划线 | 布尔 |
| `section.spaceBefore/After` | 小节标题上/下间距 | pt |
| `bullet.marker` | 项目符号字符 | — |
| `bullet.indent` | 项目符号悬挂缩进 | mm |

**导入模板**：工具栏「导入模板」选 JSON 文件即可。也可以放一个数组一次导入多套。
缺字段会自动用默认值兜底，所以你可以只写想改的那几项：

```json
{ "id": "my-red", "name": "我的红黑", "color": { "primary": "#B22222", "line": "#B22222" } }
```

**导出模板**：调好一套后点「导出模板」，把 JSON 发给别人，对方导入就能用。

## 从源码构建

单文件是把源码和三方库内联出来的，需要 Node（取 `docx` 库）与 Python 3。

```bash
# 1) 取 docx 的浏览器版
npm pack docx
tar -xzf docx-*.tgz
cp package/dist/index.iife.js vendor/docx.iife.js

# 2) 打包成单文件
python build.py     # -> dist/index.html
```

## 项目结构

```
├── src/
│   ├── index.html        页面骨架（含内联占位符）
│   ├── style.css         界面与 A4 纸张样式（含 @media print）
│   ├── templates.js      内置模板 + 缺省值兜底
│   ├── docx-builder.js   DOCX 生成器（纯函数，可在 Node 里单测）
│   └── app.js            编辑器 / 预览 / 导入导出 / 事件
├── vendor/
│   └── docx.iife.js      docx.js 9.12.0 浏览器版（MIT）
├── test/
│   └── node-docx-test.js Node 侧预验证脚本
├── build.py              内联打包
└── dist/
    └── index.html        最终单文件（1.3 MB）
```

### 为什么 DOCX 生成器单独成文件

`docx-builder.js` 是不碰 DOM 的纯函数，因此可以在 **Node 里用同一份代码提前测通** docx.js 的 API 参数，
不必等到浏览器里才发现参数写错。改完生成逻辑先跑 `test/node-docx-test.js` 是最快的反馈回路。

## 已知限制

- **只做单页简历**：内容超出会自然流到第二页，但不做分页控制
- **模板是"样式参数"级别**：能改字体/配色/间距/照片宽度，但不支持自由拖拽布局
- **照片存 localStorage**：超过 3 MB 可能保存失败，会提示你先压缩
- **字体需系统已安装**：模板里写的字体名，导出机型上也要有

## 许可证

[MIT](LICENSE) — 可自由使用、修改、分发，包括商用。
