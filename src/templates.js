/* 内置模板：一份配置同时驱动 HTML 预览 与 DOCX 导出。
   尺寸单位统一为 mm（页面/照片），字号为 pt。 */
const BUILTIN_TEMPLATES = [
  {
    id: 'classic-blue',
    name: '经典蓝',
    page: { mTop: 18, mBottom: 18, mLeft: 20, mRight: 20 },
    font: { family: 'Microsoft YaHei', base: 10 },
    color: { primary: '#1F3A5F', text: '#333333', muted: '#666666', line: '#1F3A5F' },
    header: { nameSize: 22, titleSize: 11, contactSize: 9, photoWidth: 26 },
    section: { titleSize: 12, underline: true, spaceBefore: 10, spaceAfter: 4 },
    bullet: { marker: '•', indent: 5 }
  },
  {
    id: 'minimal-gray',
    name: '简约灰',
    page: { mTop: 16, mBottom: 16, mLeft: 22, mRight: 22 },
    font: { family: 'Microsoft YaHei', base: 10.5 },
    color: { primary: '#3D3D3D', text: '#2E2E2E', muted: '#777777', line: '#CCCCCC' },
    header: { nameSize: 21, titleSize: 10.5, contactSize: 9, photoWidth: 24 },
    section: { titleSize: 11, underline: false, spaceBefore: 11, spaceAfter: 4 },
    bullet: { marker: '—', indent: 5 }
  },
  {
    id: 'dark-green',
    name: '沉稳绿',
    page: { mTop: 20, mBottom: 20, mLeft: 20, mRight: 20 },
    font: { family: 'Microsoft YaHei', base: 10 },
    color: { primary: '#1B4D3E', text: '#2F3A36', muted: '#6B7C75', line: '#1B4D3E' },
    header: { nameSize: 24, titleSize: 11, contactSize: 9.5, photoWidth: 28 },
    section: { titleSize: 12, underline: true, spaceBefore: 12, spaceAfter: 5 },
    bullet: { marker: '·', indent: 5 }
  },
  {
    id: 'compact-blue',
    name: '紧凑蓝（一页装更多）',
    page: { mTop: 12, mBottom: 12, mLeft: 16, mRight: 16 },
    font: { family: 'Microsoft YaHei', base: 9 },
    color: { primary: '#14456B', text: '#333333', muted: '#6A6A6A', line: '#14456B' },
    header: { nameSize: 18, titleSize: 9.5, contactSize: 8.5, photoWidth: 22 },
    section: { titleSize: 10.5, underline: true, spaceBefore: 7, spaceAfter: 3 },
    bullet: { marker: '•', indent: 4 }
  }
];

/* 补齐缺省字段：导入别人的模板时只需给一部分，剩下的用这套兜底 */
const TEMPLATE_FALLBACK = {
  id: 'imported',
  name: '导入的模板',
  page: { mTop: 18, mBottom: 18, mLeft: 20, mRight: 20 },
  font: { family: 'Microsoft YaHei', base: 10 },
  color: { primary: '#1F3A5F', text: '#333333', muted: '#666666', line: '#1F3A5F' },
  header: { nameSize: 22, titleSize: 11, contactSize: 9, photoWidth: 26 },
  section: { titleSize: 12, underline: true, spaceBefore: 10, spaceAfter: 4 },
  bullet: { marker: '•', indent: 5 }
};

function normalizeTemplate(t) {
  const out = JSON.parse(JSON.stringify(TEMPLATE_FALLBACK));
  if (!t || typeof t !== 'object') return out;
  for (const k of Object.keys(TEMPLATE_FALLBACK)) {
    if (t[k] && typeof t[k] === 'object' && !Array.isArray(t[k])) {
      out[k] = Object.assign({}, TEMPLATE_FALLBACK[k], t[k]);
    } else if (t[k] !== undefined) {
      out[k] = t[k];
    }
  }
  out.id = t.id || 'imported';
  out.name = t.name || '导入的模板';
  return out;
}
