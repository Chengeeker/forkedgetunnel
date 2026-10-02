// Chengeeker, 2026-10-02. GPL-2.0; see ../LICENSE. Offline tests only.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const html = fs.readFileSync('admin/index.html', 'utf8');
const extract = (start, end) => { const i = html.indexOf(start); assert(i > 0); return html.slice(i, html.indexOf(end, i)); };
let countries = ['US', null], warnings = 0, closed = false;
const state = {networkChecking: false, results: [], selectedIds: new Set()};
const context = {state, bootLoading: {active: false}, Map, Promise,
  rememberSelectedLibrary() {}, renderNetworkCard() {}, updateLibraryOptions() {}, updateActionAvailability() {},
  resetResultFilters() {}, renderResults() {}, setProgress() {}, loadLocations: async () => {}, updateServiceStatus() {},
  resolveBestHost: async () => 'test', showNetworkWarning() { warnings++; },
  detectStack: async family => { const country = countries[family === 'ipv4' ? 0 : 1]; if (!country) throw new Error('offline failure'); return {status: 'done', country, allowed: country === 'CN', ipType: family, ip: family === 'ipv4' ? '192.0.2.1' : '2001:db8::1'}; },
  els: {networkWarningOverlay: {classList: {remove() { closed = true; }}}, latencyBtn: {disabled: false, focus() {}}}, svgPulseIcon: () => ''};
vm.createContext(context);
vm.runInContext(extract('async function ensureCnNetworkBeforeAction(', 'function showNetworkWarning()') + extract('function confirmNetworkWarning()', 'function openLocalOptimizeFromWarning()') + extract('function availableFamilies()', 'function librarySelectionKey('), context);
(async () => {
  assert.equal(await context.refreshCnNetwork(), true); assert.equal(warnings, 1); assert.equal(state.ipv4, '192.0.2.1');
  assert.equal(await context.refreshCnNetwork(), true); assert.equal(warnings, 1);
  countries = ['CN', 'JP']; assert.equal(await context.refreshCnNetwork(), true); assert.equal(warnings, 2); assert(state.ipv6);
  countries = ['CN', null]; await context.refreshCnNetwork(); assert.equal(warnings, 2);
  countries = ['US', null]; await context.refreshCnNetwork(); assert.equal(warnings, 3);
  const statusEl = {}; assert.equal(await context.ensureCnNetworkBeforeAction({statusEl}), true); assert.equal(warnings, 3);
  context.confirmNetworkWarning(); assert(closed);
  countries = [null, null]; assert.equal(await context.refreshCnNetwork(), false); assert.equal(warnings, 4); assert.equal(state.ipv4, null);
  assert.equal(await context.ensureCnNetworkBeforeAction({statusEl}), false); assert(statusEl.textContent.includes('不可访问'));
  console.log('PASS: non-CN allowed, mixed stacks, warning dedup/reset, no reload, real failures retained. No network requests made.');
})().catch(error => { console.error(error); process.exitCode = 1; });
