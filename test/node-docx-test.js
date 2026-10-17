// 预验证：用 Node 跑同一份 docx-builder，确认 docx.js v9 的 API 参数全部正确
const path = require('path');
const fs = require('fs');

const docxLib = require(process.env.DOCX_MOD || 'docx');
const builder = require(path.join(__dirname, '..', 'src', 'docx-builder.js'));

const T = {
  id: 'classic-blue', name: '经典蓝',
  page: { mTop: 18, mBottom: 18, mLeft: 20, mRight: 20 },
  font: { family: 'Microsoft YaHei', base: 10 },
  color: { primary: '#1F3A5F', text: '#333333', muted: '#666666', line: '#1F3A5F' },
  header: { nameSize: 22, titleSize: 11, contactSize: 9, photoWidth: 26 },
  section: { titleSize: 12, underline: true, spaceBefore: 10, spaceAfter: 4 },
  bullet: { marker: '•', indent: 5 },
};

const R = {
  meta: { template: 'classic-blue' },
  basic: {
    name: '张 三', title: '后端开发工程师  ·  3 年经验',
    phone: '138-0000-0000', email: 'zhangsan@example.com',
    links: 'github.com/zhangsan', photo: '',
  },
  sections: [
    { id: 'summary', type: 'text', title: '个人简介',
      content: '3 年 Java / Go 后端开发经验，主导过日均 200 万请求的订单系统重构。\n熟悉高并发与分布式事务。' },
    { id: 'work', type: 'timeline', title: '工作经历', items: [
      { org: '某某科技有限公司', role: '后端开发工程师', period: '2023.06 - 至今',
        bullets: ['主导订单服务重构，接口 P99 从 820ms 降到 130ms。',
                  '设计并落地分库分表方案，支撑单表 1.2 亿行数据增长。'] },
      { org: '某某信息技术公司', role: '后端开发（实习）', period: '2022.07 - 2023.05',
        bullets: ['参与消息推送服务开发，日推送量 3000 万。'] },
    ] },
    { id: 'edu', type: 'simple', title: '教育经历', items: [
      { org: '某某大学', role: '计算机科学与技术 · 本科', period: '2018.09 - 2022.06' },
    ] },
    { id: 'skills', type: 'list', title: '专业技能', items: [
      { label: '语言', value: 'Java / Go / Python' },
      { label: '存储与中间件', value: 'MySQL / Redis / Kafka' },
    ] },
  ],
};

(async () => {
  const photoPath = path.join(__dirname, 'avatar.png');
  let photo = null;
  if (fs.existsSync(photoPath)) {
    photo = { bytes: fs.readFileSync(photoPath), aspect: 300 / 400, type: 'png' };
    console.log('photo bytes:', photo.bytes.length, 'aspect:', photo.aspect.toFixed(3));
  } else {
    console.log('没有 avatar.png，将测试无照片路径');
  }

  const out = path.join(__dirname, 'node-test.docx');
  const buf = await builder.toBuffer({ resume: R, template: T, docxLib, photo });
  fs.writeFileSync(out, buf);
  console.log('OK 生成:', out, buf.length, 'bytes');
})().catch((e) => {
  console.error('FAIL:', e && e.message);
  console.error(e && e.stack && e.stack.split('\n').slice(0, 4).join('\n'));
  process.exit(1);
});
