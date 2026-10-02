// forkedgetunnel offline tests by Chengeeker, 2026-10-02. GPL-2.0; see ../LICENSE.
// Run from the repository root: node tests/local-clash.test.cjs
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const html = fs.readFileSync('admin/index.html', 'utf8');
for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) if (match[1].trim()) new Function(match[1]);
const start = html.indexOf('const localClash ='), poolStart = html.indexOf('async function runPool(');
assert(start > 0 && poolStart > 0);
const source = html.slice(start, html.indexOf('function bindEvents()', start));
const pool = html.slice(poolStart, html.indexOf('async function fetchJson(', poolStart));
const elements = {};
for (const [id, value] of Object.entries({clashController: 'http://127.0.0.1:9090', clashSecret: 'dummy-test-secret', clashTestUrl: 'https://www.gstatic.com/generate_204', clashTimeout: '5000', clashThreads: '4', clashFilter: ''})) elements[id] = {value, addEventListener() {}};
for (const id of ['clashTestBtn', 'clashLoadBtn', 'clashStatus', 'clashConfigHelp']) elements[id] = {addEventListener() {}};
elements.clashResultBody = {rows: [], replaceChildren() { this.rows = []; }, insertRow() { const row = {cells: [], insertCell() { const cell = {}; this.cells.push(cell); return cell; }}; this.rows.push(row); return row; }};
const events = {}, calls = [];
const context = {URL, URLSearchParams, AbortController, TypeError, setTimeout, clearTimeout, console, $: id => elements[id.slice(1)], window: {parent: {location: {origin: 'https://test.example'}}, addEventListener: (name, fn) => { events[name] = fn; }}};
context.fetch = async (url, options) => {
  calls.push({url, options});
  if (url.endsWith('/proxies')) return {ok: true, status: 200, json: async () => ({proxies: {DIRECT: {type: 'Direct'}, group: {type: 'Selector', all: ['HK']}, 'HK / ?#': {type: 'Vless'}, US: {type: 'Vless'}}})};
  return {ok: true, status: 200, json: async () => ({delay: url.includes('US') ? 100 : 30})};
};
vm.createContext(context);
vm.runInContext(source + pool + '\nglobalThis.api = {readLocalClashSettings, requestLocalClash, loadLocalClashNodes, testLocalClashNodes, bindLocalClashEvents, localClash};', context);
(async () => {
  const api = context.api;
  for (const base of ['https://example.com', 'http://192.168.1.1:9090', 'http://user:password@localhost:9090', 'http://localhost:9090/path', 'http://localhost:9090?secret=x']) { elements.clashController.value = base; assert.throws(() => api.readLocalClashSettings()); }
  for (const base of ['http://localhost:9090', 'https://[::1]:9443', 'http://127.0.0.1:9090']) { elements.clashController.value = base; assert(api.readLocalClashSettings().base); }
  await api.loadLocalClashNodes(); assert.equal(api.localClash.rows.length, 2);
  await api.testLocalClashNodes(); assert.equal(api.localClash.rows[0].delay, 30);
  assert.equal(elements.clashResultBody.rows[0].cells[0].textContent, 'HK / ?#');
  assert(calls.some(call => call.url.includes('HK%20%2F%20%3F%23/delay')));
  assert(calls.every(call => call.options.method === 'GET' && call.options.redirect === 'error' && call.options.credentials === 'omit' && !call.url.includes('dummy-test-secret')));
  for (const [status, message] of [[401, '鉴权'], [503, '失败'], [504, '超时'], [404, '不存在']]) { context.fetch = async () => ({ok: false, status}); await assert.rejects(api.requestLocalClash(api.readLocalClashSettings(), '/proxies', {controllers: new Set(), stopped: false}), error => error.message.includes(message)); }
  context.fetch = async () => ({ok: true, status: 200, json: async () => ({delay: 0})});
  await api.testLocalClashNodes(); assert(api.localClash.rows.every(row => row.delay === null && row.status.includes('有效延迟')));
  elements.clashFilter.value = 'HK'; await api.testLocalClashNodes(); assert.equal(elements.clashResultBody.rows.length, 1); elements.clashFilter.value = '';
  let started = 0; elements.clashThreads.value = '1';
  context.fetch = (url, options) => new Promise((resolve, reject) => { started++; options.signal.addEventListener('abort', () => { const error = new Error('abort'); error.name = 'AbortError'; reject(error); }, {once: true}); });
  const running = api.testLocalClashNodes(); await api.testLocalClashNodes(); await running;
  assert.equal(started, 1); assert(api.localClash.rows.every(row => row.status === '已停止')); assert.equal(api.localClash.run, null);
  api.bindLocalClashEvents(); assert(elements.clashConfigHelp.textContent.includes('https://test.example'));
  events['forkedgetunnel:close'](); assert.equal(elements.clashSecret.value, ''); assert.equal(api.localClash.session, null);
  console.log('PASS: scripts compiled; loopback, filtering, encoding, native delay/sort, errors, cancellation, key/session cleanup. No network requests made.');
})().catch(error => { console.error(error); process.exitCode = 1; });
