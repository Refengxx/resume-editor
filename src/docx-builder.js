/* DOCX 生成器（纯函数，不碰 DOM）
   同一份 resume + template 数据，生成"文字是真文本、照片是真图片"的 .docx。
   Node 里可直接 require 做测试；浏览器里挂到 window.ResumeDocx。 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ResumeDocx = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PT2TW = 20;   // 1pt = 20 twips（间距）
  const MM2TW = 56.6929; // 1mm ≈ 56.6929 twips
  const MM2PX = 96 / 25.4; // 图片尺寸按 96dpi 像素

  function hex(c) { return String(c || '#000000').replace('#', '').toUpperCase(); }

  function build(opts) {
    const D = opts.docxLib;
    if (!D) throw new Error('缺少 docx 库');
    const R = opts.resume || {};
    const T = opts.template || {};
    const photo = opts.photo || null;

    const {
      Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell,
      AlignmentType, BorderStyle, WidthType, VerticalAlign, TabStopType,
    } = D;

    const fam = T.font.family;
    const base = T.font.base;
    const C = T.color;

    function run(text, o) {
      o = o || {};
      return new TextRun({
        text: String(text == null ? '' : text),
        bold: !!o.bold,
        size: Math.round((o.size == null ? base : o.size) * 2),
        color: hex(o.color == null ? C.text : o.color),
        font: { ascii: fam, eastAsia: fam, hAnsi: fam, cs: fam },
      });
    }

    const contentTw = Math.round(MM2TW * (210 - T.page.mLeft - T.page.mRight));

    const children = [];

    /* ---------- 头部：左信息 / 右照片 ---------- */
    const b = R.basic || {};
    const leftParas = [];
    leftParas.push(new Paragraph({
      spacing: { after: 60 },
      children: [run(b.name || '', { bold: true, size: T.header.nameSize, color: C.primary })],
    }));
    if (b.title) {
      leftParas.push(new Paragraph({
        spacing: { after: 50 },
        children: [run(b.title, { size: T.header.titleSize, color: C.text })],
      }));
    }
    const contacts = [b.phone, b.email, b.links].filter(function (x) { return x && String(x).trim(); });
    if (contacts.length) {
      leftParas.push(new Paragraph({
        spacing: { after: 0 },
        children: [run(contacts.join('    '), { size: T.header.contactSize, color: C.muted })],
      }));
    }

    const noBorder = {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    };

    const rightParas = [new Paragraph({ alignment: AlignmentType.RIGHT, children: [] })];
    if (photo && photo.bytes) {
      const wPx = Math.max(1, Math.round(T.header.photoWidth * MM2PX));
      const aspect = photo.aspect && photo.aspect > 0 ? photo.aspect : 0.75; // w/h
      const hPx = Math.max(1, Math.round(wPx / aspect));
      rightParas[0] = new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new ImageRun({
          type: photo.type || 'png',
          data: photo.bytes,
          transformation: { width: wPx, height: hPx },
        })],
      });
    }

    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: noBorder,
      rows: [new TableRow({
        children: [
          new TableCell({ width: { size: 72, type: WidthType.PERCENTAGE }, borders: noBorder, children: leftParas }),
          new TableCell({ width: { size: 28, type: WidthType.PERCENTAGE }, borders: noBorder, verticalAlign: VerticalAlign.TOP, children: rightParas }),
        ],
      })],
    }));

    /* ---------- 各小节 ---------- */
    (R.sections || []).forEach(function (sec) {
      if (!sec || !sec.title) return;

      children.push(new Paragraph({
        spacing: { before: Math.round(T.section.spaceBefore * PT2TW), after: Math.round(T.section.spaceAfter * PT2TW) },
        border: T.section.underline ? {
          bottom: { style: BorderStyle.SINGLE, size: 6, color: hex(C.line), space: 2 },
        } : undefined,
        children: [run(sec.title, { bold: true, size: T.section.titleSize, color: C.primary })],
      }));

      if (sec.type === 'text') {
        if (sec.content && sec.content.trim()) {
          String(sec.content).split(/\n/).forEach(function (line) {
            children.push(new Paragraph({ spacing: { after: 40 }, children: [run(line)] }));
          });
        }
        return;
      }

      if (sec.type === 'list') {
        (sec.items || []).forEach(function (it) {
          if (!it) return;
          if (!(it.label && it.label.trim()) && !(it.value && it.value.trim())) return;
          const kids = [];
          if (it.label && it.label.trim()) kids.push(run(it.label + '：', { bold: true }));
          if (it.value && it.value.trim()) kids.push(run(it.value));
          children.push(new Paragraph({ spacing: { after: 40 }, children: kids }));
        });
        return;
      }

      // timeline / simple
      (sec.items || []).forEach(function (it) {
        if (!it) return;
        const row = [];
        if (it.org && it.org.trim()) row.push(run(it.org, { bold: true }));
        if (it.role && it.role.trim()) row.push(run('    ' + it.role));
        if (it.period && it.period.trim()) {
          row.push(run('\t'));
          row.push(run(it.period, { size: base * 0.95, color: C.muted }));
        }
        if (row.length) {
          children.push(new Paragraph({
            spacing: { before: 60, after: 40 },
            tabStops: [{ type: TabStopType.RIGHT, position: contentTw }],
            children: row,
          }));
        }
        (it.bullets || []).forEach(function (bt) {
          if (!bt || !String(bt).trim()) return;
          children.push(new Paragraph({
            spacing: { after: 30 },
            indent: { left: Math.round(T.bullet.indent * MM2TW), hanging: Math.round(T.bullet.indent * MM2TW) },
            children: [
              run(T.bullet.marker + '  ', { color: C.primary }),
              run(bt),
            ],
          }));
        });
      });
    });

    const doc = new Document({
      creator: 'Resume Editor',
      title: (R.basic && R.basic.name) || 'Resume',
      styles: {
        default: {
          document: {
            run: {
              font: { ascii: fam, eastAsia: fam, hAnsi: fam, cs: fam },
              size: Math.round(base * 2),
              color: hex(C.text),
            },
            paragraph: { spacing: { line: 300 } },
          },
        },
      },
      sections: [{
        properties: {
          page: {
            size: { width: Math.round(MM2TW * 210), height: Math.round(MM2TW * 297) },
            margin: {
              top: Math.round(MM2TW * T.page.mTop),
              bottom: Math.round(MM2TW * T.page.mBottom),
              left: Math.round(MM2TW * T.page.mLeft),
              right: Math.round(MM2TW * T.page.mRight),
            },
          },
        },
        children: children,
      }],
    });

    return { doc: doc, packer: Packer };
  }

  async function toBlob(opts) {
    const r = build(opts);
    return await r.packer.toBlob(r.doc);
  }

  async function toBuffer(opts) {
    const r = build(opts);
    return await r.packer.toBuffer(r.doc);
  }

  return { build: build, toBlob: toBlob, toBuffer: toBuffer };
});
