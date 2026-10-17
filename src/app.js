/* 简历编辑器 · UI 逻辑（单文件离线版） */
(function () {
  'use strict';

  var LS_RESUME = 'resume-editor/v1/resume';
  var LS_TPLS = 'resume-editor/v1/templates';

  var DEMO = {
    meta: { template: 'classic-blue' },
    basic: {
      name: '张 三',
      title: '后端开发工程师  ·  3 年经验',
      phone: '138-0000-0000',
      email: 'zhangsan@example.com',
      links: 'github.com/zhangsan',
      photo: ''
    },
    sections: [
      { type: 'text', title: '个人简介',
        content: '3 年 Java / Go 后端开发经验，主导过日均 200 万请求的订单系统重构，熟悉高并发与分布式事务。\n擅长用数据定位性能瓶颈。' },
      { type: 'timeline', title: '工作经历', items: [
        { org: '某某科技有限公司', role: '后端开发工程师', period: '2023.06 - 至今',
          bullets: ['主导订单服务重构，接口 P99 从 820ms 降到 130ms。',
                    '设计并落地分库分表方案，支撑单表 1.2 亿行数据增长。',
                    '搭建全链路压测环境，提前发现 7 处容量瓶颈。'] },
        { org: '某某信息技术公司', role: '后端开发（实习）', period: '2022.07 - 2023.05',
          bullets: ['参与消息推送服务开发，日推送量 3000 万。'] }
      ] },
      { type: 'simple', title: '教育经历', items: [
        { org: '某某大学', role: '计算机科学与技术 · 本科', period: '2018.09 - 2022.06' }
      ] },
      { type: 'list', title: '专业技能', items: [
        { label: '语言', value: 'Java / Go / Python，熟悉 JVM 调优与 GC 分析' },
        { label: '存储与中间件', value: 'MySQL / Redis / Kafka / Elasticsearch' },
        { label: '框架与运维', value: 'Spring Cloud / gRPC / Docker / K8s' }
      ] }
    ]
  };

  var state = { resume: null };
  var importedTpls = [];
  var saveTimer = null;

  /* ---------------- 工具 ---------------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function setPath(obj, path, val) {
    var parts = path.split('.'), cur = obj, i, k;
    for (i = 0; i < parts.length - 1; i++) {
      k = parts[i];
      if (cur[k] == null) cur[k] = /^\d+$/.test(parts[i + 1]) ? [] : {};
      cur = cur[k];
    }
    cur[parts[parts.length - 1]] = val;
  }
  function num(v, d) { var n = parseFloat(v); return isNaN(n) ? d : n; }

  /* ---------------- 模板 ---------------- */
  function allTemplates() { return BUILTIN_TEMPLATES.concat(importedTpls); }
  function currentTemplate() {
    var id = state.resume.meta && state.resume.meta.template;
    var list = allTemplates(), i;
    for (i = 0; i < list.length; i++) if (list[i].id === id) return normalizeTemplate(list[i]);
    return normalizeTemplate(BUILTIN_TEMPLATES[0]);
  }

  /* 模板 + 用户字号覆盖 → 实际生效的模板。
     优先用用户填的绝对 pt，再乘全局缩放；两项可叠加。 */
  function r1(v) { return Math.round(v * 10) / 10; }

  function effectiveTemplate() {
    var T = currentTemplate();
    var f = (state.resume.meta && state.resume.meta.font) || {};
    var s = num(f.scale, 100) / 100;
    function pick(ov, tv) { var v = num(ov, 0); return r1((v > 0 ? v : tv) * s); }
    T.font.base = pick(f.base, T.font.base);
    T.header.nameSize = pick(f.name, T.header.nameSize);
    T.header.titleSize = pick(f.title, T.header.titleSize);
    T.header.contactSize = pick(f.contact, T.header.contactSize);
    T.section.titleSize = pick(f.sectionTitle, T.section.titleSize);
    return T;
  }

  /* ---------------- 存储 ---------------- */
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try {
        localStorage.setItem(LS_RESUME, JSON.stringify(state.resume));
        localStorage.setItem(LS_TPLS, JSON.stringify(importedTpls));
      } catch (e) {
        console.warn('保存失败（可能是照片太大）', e);
      }
    }, 300);
  }

  function load() {
    try {
      var r = localStorage.getItem(LS_RESUME);
      var t = localStorage.getItem(LS_TPLS);
      if (t) importedTpls = JSON.parse(t) || [];
      if (r) { state.resume = JSON.parse(r); return true; }
    } catch (e) { console.warn(e); }
    return false;
  }

  /* ---------------- 编辑面板 ---------------- */
  function field(path, label, val, ph) {
    return '<div class="field"><label>' + esc(label) + '</label>' +
      '<input data-path="' + path + '" value="' + esc(val) + '" placeholder="' + esc(ph || '') + '"></div>';
  }
  function area(path, label, val, ph, rows) {
    return '<div class="field"><label>' + esc(label) + '</label>' +
      '<textarea data-path="' + path + '" rows="' + (rows || 2) + '" placeholder="' + esc(ph || '') + '">' +
      esc(val) + '</textarea></div>';
  }

  function renderEditor() {
    var R = state.resume, b = R.basic, h = '';

    /* 基本信息 */
    h += '<div class="group"><div class="ghead"><strong>基本信息</strong></div>';
    h += '<div class="grid2">' + field('basic.name', '姓名', b.name, '张三') +
         field('basic.title', '求职意向 / 头衔', b.title, '后端开发工程师') + '</div>';
    h += '<div class="grid2">' + field('basic.phone', '电话', b.phone, '138-0000-0000') +
         field('basic.email', '邮箱', b.email, 'you@example.com') + '</div>';
    h += field('basic.links', '链接', b.links, 'github.com/you  |  个人博客') +
         '<div class="hint">多个链接用两个以上空格或竖线分隔。</div>';

    h += '<div class="field"><label>照片（导出 Word 后仍可右键"更改图片"替换）</label>' +
         '<div style="display:flex;gap:8px;align-items:center">' +
         '<label class="btn" for="photoInput">选择图片</label>' +
         '<input id="photoInput" type="file" accept="image/png,image/jpeg,image/gif,image/bmp" hidden>' +
         (b.photo ? '<button type="button" data-act="del-photo" class="danger">移除照片</button>' : '') +
         '</div>' +
         (b.photo ? '<div style="margin-top:6px"><img src="' + b.photo + '" style="height:56px;border:1px solid #dde;border-radius:4px"></div>' : '') +
         '</div>';
    h += '</div>';

    /* 字号控制 */
    var F = (R.meta && R.meta.font) || {};
    var T0 = currentTemplate();
    var sc = num(F.scale, 100);
    h += '<div class="group"><div class="ghead"><strong>字号</strong><div class="ops">' +
         '<button type="button" data-act="font-reset">恢复模板字号</button></div></div>';
    h += '<div class="field"><label>全局缩放 <b data-live-scale style="color:#2f6fed">' + sc + '%</b>' +
         '　→ 正文实际 ' + r1(T0.font.base * sc / 100) + ' pt</label>' +
         '<input type="range" data-path="meta.font.scale" min="80" max="130" step="5" value="' + sc + '"></div>';
    h += '<div class="grid2">' +
         field('meta.font.base', '正文 (pt，留空=模板)', F.base || '', T0.font.base) +
         field('meta.font.sectionTitle', '小节标题 (pt)', F.sectionTitle || '', T0.section.titleSize) +
         '</div>';
    h += '<div class="grid2">' +
         field('meta.font.name', '姓名 (pt)', F.name || '', T0.header.nameSize) +
         field('meta.font.title', '头衔 (pt)', F.title || '', T0.header.titleSize) +
         '</div>';
    h += field('meta.font.contact', '联系方式 (pt)', F.contact || '', T0.header.contactSize);
    h += '<div class="hint">缩放会乘在所有字号上；左边填具体 pt 则覆盖模板值，两者叠加生效。</div></div>';

    /* 各小节 */
    R.sections.forEach(function (sec, si) {
      h += '<div class="group"><div class="ghead"><strong>' +
           esc(sec.title || '未命名小节') + '</strong><div class="ops">' +
           '<button type="button" data-act="sec-up" data-sec="' + si + '" title="上移">↑</button>' +
           '<button type="button" data-act="sec-down" data-sec="' + si + '" title="下移">↓</button>' +
           '<button type="button" data-act="del-sec" data-sec="' + si + '" class="danger">删除</button>' +
           '</div></div>';

      h += field('sections.' + si + '.title', '小节标题', sec.title, '工作经历');

      if (sec.type === 'text') {
        h += area('sections.' + si + '.content', '内容（可多行）', sec.content, '', 4);
      } else if (sec.type === 'list') {
        (sec.items || []).forEach(function (it, ii) {
          h += '<div class="item-card"><div class="ih"><span>条目 ' + (ii + 1) + '</span>' +
               '<button type="button" data-act="del-item" data-sec="' + si + '" data-idx="' + ii + '" class="danger">×</button></div>' +
               '<div class="grid2">' +
               field('sections.' + si + '.items.' + ii + '.label', '名称', it.label, '语言') +
               field('sections.' + si + '.items.' + ii + '.value', '内容', it.value, 'Java / Go') +
               '</div></div>';
        });
        h += '<button type="button" data-act="add-item" data-sec="' + si + '">+ 加一条</button>';
      } else {
        (sec.items || []).forEach(function (it, ii) {
          h += '<div class="item-card"><div class="ih"><span>第 ' + (ii + 1) + ' 段</span>' +
               '<span>' +
               '<button type="button" data-act="item-up" data-sec="' + si + '" data-idx="' + ii + '">↑</button> ' +
               '<button type="button" data-act="item-down" data-sec="' + si + '" data-idx="' + ii + '">↓</button> ' +
               '<button type="button" data-act="del-item" data-sec="' + si + '" data-idx="' + ii + '" class="danger">×</button>' +
               '</span></div>';
          h += '<div class="grid2">' +
               field('sections.' + si + '.items.' + ii + '.org', '单位 / 学校', it.org, '某某公司') +
               field('sections.' + si + '.items.' + ii + '.role', '职位 / 专业', it.role, '后端开发工程师') +
               '</div>';
          h += field('sections.' + si + '.items.' + ii + '.period', '时间', it.period, '2023.06 - 至今');
          (it.bullets || []).forEach(function (bl, bi) {
            h += '<div style="display:flex;gap:6px;align-items:flex-start;margin-bottom:6px">' +
                 '<textarea data-path="sections.' + si + '.items.' + ii + '.bullets.' + bi + '" rows="2" ' +
                 'style="flex:1;font-family:inherit;font-size:13px;padding:7px 9px;border:1px solid #d8dee6;border-radius:5px" ' +
                 'placeholder="一条成果（建议带数字）">' + esc(bl) + '</textarea>' +
                 '<button type="button" data-act="del-bullet" data-sec="' + si + '" data-idx="' + ii + '" data-bidx="' + bi + '" class="danger">×</button>' +
                 '</div>';
          });
          h += '<button type="button" data-act="add-bullet" data-sec="' + si + '" data-idx="' + ii + '">+ 加一条描述</button>';
          h += '</div>';
        });
        h += '<button type="button" data-act="add-item" data-sec="' + si + '">+ 加一段</button>';
      }
      h += '</div>';
    });

    h += '<div class="group"><div class="ghead"><strong>添加小节</strong></div>' +
         '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
         '<button type="button" data-act="add-sec" data-type="text">+ 段落型</button>' +
         '<button type="button" data-act="add-sec" data-type="timeline">+ 经历型</button>' +
         '<button type="button" data-act="add-sec" data-type="list">+ 列表型</button>' +
         '</div><div class="hint">段落型＝自我评价；经历型＝工作/项目；列表型＝技能。</div></div>';

    $('#editor').innerHTML = h;
  }

  /* ---------------- 预览 ---------------- */
  var VAR_MAP = [
    ['--t-primary', function (T) { return T.color.primary; }],
    ['--t-text', function (T) { return T.color.text; }],
    ['--t-muted', function (T) { return T.color.muted; }],
    ['--t-line', function (T) { return T.color.line; }],
    ['--t-base', function (T) { return T.font.base; }],
    ['--t-name', function (T) { return T.header.nameSize; }],
    ['--t-title', function (T) { return T.header.titleSize; }],
    ['--t-contact', function (T) { return T.header.contactSize; }],
    ['--t-photo', function (T) { return T.header.photoWidth; }],
    ['--t-sec-title', function (T) { return T.section.titleSize; }],
    ['--t-sec-before', function (T) { return T.section.spaceBefore; }],
    ['--t-sec-after', function (T) { return T.section.spaceAfter; }],
    ['--t-bullet-indent', function (T) { return T.bullet.indent; }],
    ['--t-line-height', function (T) { return T.font.lineSpacing || 1.55; }]
  ];

  function applyTemplate(T) {
    var page = $('#page');
    VAR_MAP.forEach(function (p) { page.style.setProperty(p[0], p[1](T)); });
    page.style.setProperty('--t-font', '"' + T.font.family + '", "Microsoft YaHei", sans-serif');
  }

  function buildPreview(R, T) {
    var b = R.basic || {}, h = '';
    var contacts = [b.phone, b.email, b.links].filter(function (x) { return x && String(x).trim(); });

    h += '<div class="p-header"><div class="ph-left">';
    if (b.name) h += '<div class="p-name">' + esc(b.name) + '</div>';
    if (b.title) h += '<div class="p-title">' + esc(b.title) + '</div>';
    if (contacts.length) h += '<div class="p-contact">' + esc(contacts.join('    ')) + '</div>';
    h += '</div>';
    if (b.photo) h += '<div class="p-photo"><img src="' + b.photo + '" alt=""></div>';
    h += '</div>';

    var u = T.section.underline ? ' underline' : '';

    (R.sections || []).forEach(function (sec) {
      if (!sec || !sec.title || !String(sec.title).trim()) return;
      h += '<div class="p-section' + u + '"><div class="st">' + esc(sec.title) + '</div><div class="sb">';

      if (sec.type === 'text') {
        if (sec.content && sec.content.trim()) h += '<div class="p-para">' + esc(sec.content) + '</div>';
      } else if (sec.type === 'list') {
        (sec.items || []).forEach(function (it) {
          if (!it) return;
          var L = (it.label || '').trim(), V = (it.value || '').trim();
          if (!L && !V) return;
          h += '<div class="p-kv">' + (L ? '<span class="kk">' + esc(L) + '：</span>' : '') +
               (V ? '<span class="vv">' + esc(V) + '</span>' : '') + '</div>';
        });
      } else {
        (sec.items || []).forEach(function (it) {
          if (!it) return;
          var hasRow = (it.org && it.org.trim()) || (it.role && it.role.trim()) || (it.period && it.period.trim());
          if (!hasRow) return;
          h += '<div class="p-item"><div class="ii-row1"><div>' +
               (it.org && it.org.trim() ? '<span class="ii-org">' + esc(it.org) + '</span>' : '') +
               (it.role && it.role.trim() ? (it.org && it.org.trim() ? '　' : '') + '<span class="ii-role">' + esc(it.role) + '</span>' : '') +
               '</div>' +
               (it.period && it.period.trim() ? '<div class="ii-period">' + esc(it.period) + '</div>' : '') +
               '</div>';
          (it.bullets || []).forEach(function (bl) {
            if (!bl || !String(bl).trim()) return;
            h += '<div class="p-bullet"><span class="bm">' + esc(T.bullet.marker) + '</span>' +
                 '<span class="bt">' + esc(bl) + '</span></div>';
          });
          h += '</div>';
        });
      }
      h += '</div></div>';
    });

    return h;
  }

  function renderPreview() {
    var T = effectiveTemplate();
    applyTemplate(T);
    $('#page').innerHTML = buildPreview(state.resume, T);
  }

  /* ---------------- 工具栏 ---------------- */
  function renderTplSelect() {
    var sel = $('#tplSelect'), cur = state.resume.meta.template, h = '';
    allTemplates().forEach(function (t) {
      h += '<option value="' + esc(t.id) + '"' + (t.id === cur ? ' selected' : '') + '>' +
           esc(t.name || t.id) + '</option>';
    });
    sel.innerHTML = h;
  }

  function download(blobOrText, filename, isText) {
    var blob = isText ? new Blob([blobOrText], { type: 'application/json;charset=utf-8' }) : blobOrText;
    var a = document.createElement('a');
    var url = URL.createObjectURL(blob);
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
  }

  function safeName(n) { return (String(n || 'resume').replace(/[\\/:*?"<>|\s]+/g, '_') || 'resume'); }

  function readFile(file, asText) {
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onload = function () { res(fr.result); };
      fr.onerror = function () { rej(fr.error); };
      if (asText) fr.readAsText(file, 'utf-8'); else fr.readAsDataURL(file);
    });
  }

  /* ---------------- 导出 DOCX ---------------- */
  function imgAspect(dataUrl) {
    return new Promise(function (res) {
      var im = new Image();
      im.onload = function () { res(im.naturalWidth / im.naturalHeight); };
      im.onerror = function () { res(0.75); };
      im.src = dataUrl;
    });
  }

  function dataUrlToBytes(dataUrl) {
    var comma = dataUrl.indexOf(',');
    var meta = dataUrl.slice(0, comma);
    var bin = atob(dataUrl.slice(comma + 1));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    var type = 'png';
    if (/jpeg|jpg/i.test(meta)) type = 'jpg';
    else if (/gif/i.test(meta)) type = 'gif';
    else if (/bmp/i.test(meta)) type = 'bmp';
    return { bytes: bytes, type: type };
  }

  async function exportDocx() {
    var btn = $('#docxBtn');
    var old = btn.textContent;
    btn.disabled = true; btn.textContent = '生成中…';
    try {
      var T = effectiveTemplate();
      var photo = null;
      if (state.resume.basic.photo) {
        var raw = dataUrlToBytes(state.resume.basic.photo);
        photo = { bytes: raw.bytes, type: raw.type, aspect: await imgAspect(state.resume.basic.photo) };
      }
      var blob = await window.ResumeDocx.toBlob({
        resume: state.resume, template: T, docxLib: window.docx, photo: photo
      });
      download(blob, safeName(state.resume.basic.name) + '-简历.docx', false);
    } catch (e) {
      console.error(e);
      alert('导出失败：' + (e && e.message ? e.message : e));
    } finally {
      btn.disabled = false; btn.textContent = old;
    }
  }

  /* ---------------- 事件 ---------------- */
  function bind() {
    /* 编辑：输入 */
    $('#editor').addEventListener('input', function (e) {
      var t = e.target, p = t.getAttribute && t.getAttribute('data-path');
      if (!p) return;
      setPath(state.resume, p, t.value);
      if (p === 'meta.font.scale') {
        var live = t.closest('.field') && t.closest('.field').querySelector('[data-live-scale]');
        if (live) live.textContent = t.value + '%';
      }
      if (/^sections\.\d+\.title$/.test(p) && t.closest('.group')) {
        var gh = t.closest('.group').querySelector('.ghead strong');
        if (gh) gh.textContent = t.value || '未命名小节';
      }
      renderPreview();
      save();
    });

    /* 编辑：按钮 */
    $('#editor').addEventListener('click', function (e) {
      var t = e.target;
      if (!t || !t.getAttribute) return;
      var act = t.getAttribute('data-act');
      if (!act) return;
      var si = parseInt(t.getAttribute('data-sec'), 10);
      var ii = parseInt(t.getAttribute('data-idx'), 10);
      var bi = parseInt(t.getAttribute('data-bidx'), 10);
      var R = state.resume;
      var structural = true;

      if (act === 'add-item') {
        var sec = R.sections[si];
        if (sec.type === 'list') sec.items.push({ label: '', value: '' });
        else sec.items.push({ org: '', role: '', period: '', bullets: [''] });
      } else if (act === 'del-item') {
        R.sections[si].items.splice(ii, 1);
      } else if (act === 'add-bullet') {
        R.sections[si].items[ii].bullets.push('');
      } else if (act === 'del-bullet') {
        R.sections[si].items[ii].bullets.splice(bi, 1);
      } else if (act === 'item-up' && ii > 0) {
        var a = R.sections[si].items;
        var tmp = a[ii - 1]; a[ii - 1] = a[ii]; a[ii] = tmp;
      } else if (act === 'item-down' && ii < R.sections[si].items.length - 1) {
        var a2 = R.sections[si].items;
        var tmp2 = a2[ii + 1]; a2[ii + 1] = a2[ii]; a2[ii] = tmp2;
      } else if (act === 'sec-up' && si > 0) {
        var s1 = R.sections; var ts = s1[si - 1]; s1[si - 1] = s1[si]; s1[si] = ts;
      } else if (act === 'sec-down' && si < R.sections.length - 1) {
        var s2 = R.sections; var ts2 = s2[si + 1]; s2[si + 1] = s2[si]; s2[si] = ts2;
      } else if (act === 'del-sec') {
        if (!confirm('删除小节「' + (R.sections[si].title || '未命名') + '」？')) return;
        R.sections.splice(si, 1);
      } else if (act === 'add-sec') {
        var type = t.getAttribute('data-type');
        R.sections.push(
          type === 'text' ? { type: 'text', title: '新小节', content: '' } :
          type === 'list' ? { type: 'list', title: '新小节', items: [{ label: '', value: '' }] } :
          { type: 'timeline', title: '新小节', items: [{ org: '', role: '', period: '', bullets: [''] }] }
        );
      } else if (act === 'del-photo') {
        R.basic.photo = '';
      } else if (act === 'font-reset') {
        if (!R.meta) R.meta = {};
        R.meta.font = {};
      } else {
        structural = false;
      }

      if (structural) { renderEditor(); renderPreview(); save(); }
    });

    /* 照片 */
    $('#editor').addEventListener('change', async function (e) {
      if (e.target.id !== 'photoInput') return;
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      if (f.size > 3 * 1024 * 1024) { alert('图片超过 3MB，请先压缩（过大会让本地保存失败）'); }
      state.resume.basic.photo = await readFile(f, false);
      renderEditor(); renderPreview(); save();
    });

    /* 模板切换 */
    $('#tplSelect').addEventListener('change', function (e) {
      state.resume.meta.template = e.target.value;
      /* 换模板回到该模板自带的字号，避免上一套的手动覆盖串味 */
      state.resume.meta.font = {};
      renderEditor(); renderPreview(); save();
    });

    /* 导入模板 */
    $('#tplImport').addEventListener('change', async function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      try {
        var t = JSON.parse(await readFile(f, true));
        var list = Array.isArray(t) ? t : [t];
        list.forEach(function (x, i) {
          var n = normalizeTemplate(x);
          if (!x.id) n.id = 'imported-' + Date.now() + '-' + i;
          n.name = x.name || n.id;
          var dup = importedTpls.findIndex(function (y) { return y.id === n.id; });
          if (dup >= 0) importedTpls[dup] = n; else importedTpls.push(n);
        });
        state.resume.meta.template = normalizeTemplate(list[0]).id || state.resume.meta.template;
        var first = importedTpls[importedTpls.length - 1];
        state.resume.meta.template = first.id;
        renderTplSelect(); renderPreview(); save();
        alert('已导入 ' + list.length + ' 个模板。');
      } catch (err) {
        alert('模板 JSON 解析失败：' + err.message);
      } finally { e.target.value = ''; }
    });

    /* 导出模板 */
    $('#tplExport').addEventListener('click', function () {
      var T = currentTemplate();
      download(JSON.stringify(T, null, 2), '模板-' + safeName(T.name) + '.json', true);
    });

    /* 导入简历 */
    $('#resumeImport').addEventListener('change', async function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      try {
        var r = JSON.parse(await readFile(f, true));
        if (!r.basic || !Array.isArray(r.sections)) throw new Error('缺少 basic 或 sections 字段');
        state.resume = r;
        if (!state.resume.meta) state.resume.meta = { template: 'classic-blue' };
        renderTplSelect(); renderEditor(); renderPreview(); save();
      } catch (err) {
        alert('简历 JSON 解析失败：' + err.message);
      } finally { e.target.value = ''; }
    });

    /* 导出简历 JSON */
    $('#resumeExport').addEventListener('click', function () {
      download(JSON.stringify(state.resume, null, 2),
        safeName(state.resume.basic.name) + '-简历数据.json', true);
    });

    /* 清空 */
    $('#resetBtn').addEventListener('click', function () {
      if (!confirm('清空当前内容，恢复为示例简历？')) return;
      state.resume = clone(DEMO);
      renderTplSelect(); renderEditor(); renderPreview(); save();
    });

    /* 打印 */
    $('#printBtn').addEventListener('click', function () { window.print(); });

    /* 导出 DOCX */
    $('#docxBtn').addEventListener('click', exportDocx);
  }

  /* ---------------- 启动 ---------------- */
  function init() {
    if (!load()) state.resume = clone(DEMO);
    if (!state.resume.meta) state.resume.meta = { template: 'classic-blue' };
    if (!state.resume.meta.font) state.resume.meta.font = {};
    renderTplSelect();
    renderEditor();
    renderPreview();
    bind();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
