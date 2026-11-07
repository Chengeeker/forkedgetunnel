// Chengeeker, 2026-11-07. GPL-2.0; see ../LICENSE. No native launch or network.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const html = fs.readFileSync('admin/index.html', 'utf8');
const start = html.indexOf('function openOptimizeStartModal()');
const end = html.indexOf('function escapeHtml(value)', start);
assert(start > 0 && end > start);
const shown = new Set(['optimizeStartModal']);
const elements = Object.fromEntries(['optimizeStartModal','localOptimizeModal','cfdataLaunchStatus'].map(id => [id, {
  classList: {add() { shown.add(id); }, remove() { shown.delete(id); }}
}]));
const context = {document: {getElementById: id => elements[id]}, navigator: {userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}, window: {location: {href: ''}}, openOnlineOptimizeModal() {}};
vm.createContext(context); vm.runInContext(html.slice(start, end), context);
context.chooseLocalOptimize();
assert(shown.has('localOptimizeModal')); assert(!shown.has('optimizeStartModal'));
assert.equal(context.window.location.href, 'forkedgetunnel-cfdata://open');
assert(elements.cfdataLaunchStatus.textContent.includes('启动请求'));
context.closeLocalOptimizeModal({target: 1, currentTarget: 2}); assert(shown.has('localOptimizeModal'));
context.closeLocalOptimizeModal(); assert(!shown.has('localOptimizeModal'));
context.navigator.userAgent = 'Mozilla/5.0 (Linux; Android 15)'; context.window.location.href = '';
assert.equal(context.launchLocalCfData(), false); assert.equal(context.window.location.href, '');
assert(elements.cfdataLaunchStatus.textContent.includes('订阅链接'));
const native = fs.readFileSync('local-cfdata/windows/launcher.ps1','utf8');
assert(native.includes("'127.0.0.1', '-port', '13336'"));
assert(native.includes('SHA-256 mismatch')); assert(!native.includes('%1'));
assert(native.includes('HKCU:\\Software\\Classes\\forkedgetunnel-cfdata'));
const upstream = JSON.parse(fs.readFileSync('local-cfdata/upstream.json','utf8'));
assert.equal(Object.keys(upstream.assets).length, 2);
assert(Object.values(upstream.assets).every(hash => /^[a-f0-9]{64}$/.test(hash)));
assert(!html.includes('CF_TOOLS_RAW_URL'));
console.log('PASS: Windows launch request, Android guidance, modal lifecycle, fixed local endpoint and URI isolation. No native launch performed.');
