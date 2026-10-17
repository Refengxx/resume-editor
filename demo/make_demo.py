"""验证核心命题：生成的简历 DOCX，导出后文字和图片都还能在 Word 里继续改。

关键设计：
- 文字用真正的段落/run（<w:t>），不是图片 —— Word 里双击就能改
- 照片用 inline shape 嵌入（word/media/），不是背景/装饰 —— Word 里右键"更改图片"
- 排版靠段落样式与制表，不靠硬编码空格 —— 改了字不会错位
"""
import os
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
from PIL import Image, ImageDraw

BASE = r"D:\dsh\简历工具\demo"
os.makedirs(BASE, exist_ok=True)
OUT = os.path.join(BASE, "demo-resume.docx")
IMGP = os.path.join(BASE, "avatar.png")

# ---------- 1) 生成一张占位证件照 ----------
im = Image.new("RGB", (300, 400), (228, 234, 242))
d = ImageDraw.Draw(im)
d.ellipse((105, 70, 195, 165), fill=(146, 168, 200))
d.rounded_rectangle((85, 180, 215, 345), 24, fill=(146, 168, 200))
d.rectangle((0, 0, 299, 399), outline=(190, 200, 215), width=3)
im.save(IMGP, "PNG")

doc = Document()

# ---------- 2) 页面与默认字体 ----------
s = doc.sections[0]
s.page_width, s.page_height = Cm(21), Cm(29.7)
s.left_margin = s.right_margin = Cm(2.0)
s.top_margin = s.bottom_margin = Cm(1.8)

normal = doc.styles["Normal"]
normal.font.name = "Microsoft YaHei"
normal.font.size = Pt(10)
normal.element.rPr.rFonts.set(qn("w:eastAsia"), "Microsoft YaHei")
normal.paragraph_format.space_after = Pt(2)
normal.paragraph_format.line_spacing = 1.15


def set_cn(run, name="Microsoft YaHei"):
    run.font.name = name
    run._element.rPr.rFonts.set(qn("w:eastAsia"), name)


def section_title(text):
    """小节标题：左边一条色块 + 粗体文字，用段落样式而非图片"""
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after = Pt(4)
    r = p.add_run(text)
    r.bold = True
    r.font.size = Pt(12)
    r.font.color.rgb = RGBColor(0x1F, 0x3A, 0x5F)
    set_cn(r)
    # 下边线
    pPr = p._p.get_or_add_pPr()
    borders = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), "6")
    bottom.set(qn("w:color"), "1F3A5F")
    bottom.set(qn("w:space"), "2")
    borders.append(bottom)
    pPr.append(borders)
    return p


def bullet(text, bold_prefix=None):
    p = doc.add_paragraph(style="List Bullet")
    p.paragraph_format.space_after = Pt(2)
    if bold_prefix:
        r1 = p.add_run(bold_prefix)
        r1.bold = True
        set_cn(r1)
    r2 = p.add_run(text)
    set_cn(r2)
    return p


# ---------- 3) 顶部两栏：左文字 / 右头像（图片可替换） ----------
tbl = doc.add_table(rows=1, cols=2)
tbl.autofit = False
tbl.columns[0].width = Cm(13.5)
tbl.columns[1].width = Cm(3.0)
left, right = tbl.rows[0].cells
left.width = Cm(13.5)
right.width = Cm(3.0)

lp = left.paragraphs[0]
r = lp.add_run("张 三")
r.bold = True
r.font.size = Pt(22)
set_cn(r)

p2 = left.add_paragraph()
r = p2.add_run("后端开发工程师  ·  3 年经验")
r.font.size = Pt(11)
r.font.color.rgb = RGBColor(0x44, 0x44, 0x44)
set_cn(r)

p3 = left.add_paragraph()
r = p3.add_run("138-0000-0000    zhangsan@example.com    github.com/zhangsan")
r.font.size = Pt(9)
r.font.color.rgb = RGBColor(0x66, 0x66, 0x66)
set_cn(r)

# 头像：inline shape，Word 里可直接"更改图片"
rp = right.paragraphs[0]
rp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
rp.add_run().add_picture(IMGP, width=Cm(2.6))

# ---------- 4) 正文小节 ----------
section_title("个人简介")
p = doc.add_paragraph()
set_cn(p.add_run(
    "3 年 Java / Go 后端开发经验，主导过日均 200 万请求的订单系统重构，"
    "熟悉高并发与分布式事务。擅长用数据定位性能瓶颈。"))

section_title("工作经历")
p = doc.add_paragraph()
r = p.add_run("某某科技有限公司    ·    后端开发工程师    ·    2023.06 - 至今")
r.bold = True
set_cn(r)
bullet("主导订单服务重构，接口 P99 从 820ms 降到 130ms。")
bullet("设计并落地分库分表方案，支撑单表 1.2 亿行数据增长。", "数据层改造：")
bullet("搭建全链路压测环境，提前发现 7 处容量瓶颈。")

p = doc.add_paragraph()
r = p.add_run("某某信息技术公司    ·    后端开发（实习）    ·    2022.07 - 2023.05")
r.bold = True
set_cn(r)
bullet("参与消息推送服务开发，日推送量 3000 万。")

section_title("教育经历")
p = doc.add_paragraph()
r = p.add_run("某某大学    ·    计算机科学与技术    ·    本科    ·    2018.09 - 2022.06")
set_cn(r)

section_title("专业技能")
bullet("Java / Go / Python，熟悉 JVM 调优与 GC 分析。", "语言：")
bullet("MySQL / Redis / Kafka / Elasticsearch。", "存储与中间件：")
bullet("Spring Cloud / gRPC / Docker / K8s。", "框架与运维：")

doc.save(OUT)
print("SAVED", OUT)
print("BYTES", os.path.getsize(OUT))
