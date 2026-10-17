#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""把 src/ 下的源码与 vendor/ 的三方库内联成一个可离线使用的单文件 HTML。

为什么要内联：
  1. 用户平时不开代理，不能依赖任何国外 CDN；
  2. 单文件便于直接分享给别人 —— 发一个 .html 就能用。
"""
import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "src")
VENDOR = os.path.join(ROOT, "vendor")
DIST = os.path.join(ROOT, "dist")


def read(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def guard(js):
    """避免内联脚本里出现 </script> 提前闭合标签。"""
    return js.replace("</script", "<\\/script")


def main():
    html = read(os.path.join(SRC, "index.html"))
    css = read(os.path.join(SRC, "style.css"))
    templates = read(os.path.join(SRC, "templates.js"))
    builder = read(os.path.join(SRC, "docx-builder.js"))
    app = read(os.path.join(SRC, "app.js"))

    vendor_path = os.path.join(VENDOR, "docx.iife.js")
    if not os.path.exists(vendor_path):
        print("缺少 vendor/docx.iife.js，先运行：npm pack docx 并解出 dist/index.iife.js", file=sys.stderr)
        return 1
    vendor = read(vendor_path)

    parts = [
        ("/*__CSS__*/", css),
        ("/*__TEMPLATES__*/", guard(templates)),
        ("/*__DOCX_BUILDER__*/", guard(builder)),
        ("/*__VENDOR__*/", guard(vendor)),
        ("/*__APP__*/", guard(app)),
    ]
    for marker, content in parts:
        if marker not in html:
            print("占位符缺失：%s" % marker, file=sys.stderr)
            return 1
        html = html.replace(marker, content)

    os.makedirs(DIST, exist_ok=True)
    out = os.path.join(DIST, "index.html")
    with open(out, "w", encoding="utf-8", newline="\n") as f:
        f.write(html)

    size = os.path.getsize(out)
    print("生成: %s" % out)
    print("大小: %.2f MB" % (size / 1024 / 1024))
    leftover = [m for m, _ in parts if m in html]
    print("残留占位符: %s" % (leftover or "无"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
