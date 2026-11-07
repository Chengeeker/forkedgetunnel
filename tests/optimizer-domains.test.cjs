// Chengeeker, 2026-11-07. GPL-2.0; see ../LICENSE. No external requests.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const html = fs.readFileSync('admin/index.html', 'utf8');
function extract(start, end) {
  const offset = html.indexOf(start), limit = html.indexOf(end, offset);
  assert(offset > 0 && limit > offset); return html.slice(offset, limit);
}
let dnsCalls = [], probes = [], denyPrimary = false, noRecords = false, clock = 0, saved;
const context = {
  URL, URLSearchParams, Map, Set, Promise, Math, BigInt, Error, crypto: require('node:crypto').webcrypto,
  TLS_PORTS: [443, 2053], CANDIDATE_INPUT_ERROR_MESSAGE: 'invalid candidates',
  performance: {now: () => ++clock},
  state: {selectedIds: new Set(['1']), results: [], sort: {key: 'latency', dir: 'asc'}},
  els: {customIPs: {value: ''}},
  window: {parent: {appendOnlineOptimizeSelections: lines => { saved = lines; return true; }}},
  testOptionsConnectivity: async url => { probes.push(url); if (url.includes('C0000201')) throw new Error('first IP unreachable'); },
  isOfficialPreferredIp: () => false,
  getActiveBestHost: () => 'test.invalid',
  fetchWithTimeout: async (url, options) => {
    if (!url.includes('/dns-query?') && !url.includes('/resolve?')) return {ok: true, json: async () => ({ip: '192.0.2.50', ipType: 'ipv6', country: 'US', colo: 'LAX'})};
    dnsCalls.push(url);
    assert.equal(options.headers.Accept, 'application/dns-json');
    if (denyPrimary && url.startsWith('https://cloudflare-dns.com/')) throw new Error('DNS unavailable');
    const type = new URL(url).searchParams.get('type');
    return {ok: true, json: async () => ({Status: 0, Answer: noRecords ? [] : type === 'A' ? [{type: 5, data: 'alias.example.com'}, {type: 1, data: '192.0.2.1'}, {type: 1, data: '192.0.2.2'}] : [{type: 28, data: '2001:db8::1'}]})};
  },
  updateSelectionState() {}, copySelectedResults() { throw new Error('unexpected clipboard fallback'); }
};
vm.createContext(context);
vm.runInContext(
  extract('function prepareCandidates(', 'async function runPool(') +
  extract('async function testLatency(', 'function isOfficialPreferredIp(') +
  extract('function selectedResults()', 'function startSaveSelectedLongPress(') +
  extract('function getSortedResults()', 'function renderSpeedCell(') +
  extract('function formatResultForAdmin(', 'async function copySelectedResults('), context
);
(async () => {
  const api = context;
  const candidates = Array.from(api.prepareCandidates('EXAMPLE.com:443#US [10ms]\nexample.com:443\n192.0.2.2:2053\n[2001:db8::1]:443', 16, 0));
  assert.equal(candidates.length, 3); assert.equal(candidates[0].address, 'example.com:443'); assert.equal(candidates[0].remark, 'US [10ms]');
  const originals = ['www.xflash.vip:443', 'test.509666.xyz:443', 'cf.vvhan.com:443'];
  assert.deepEqual(Array.from(api.prepareCandidates(originals.join('\n'), 16, 0), item => item.address), originals);
  assert.deepEqual(Array.from(api.prepareCandidates(originals.join('\n'), 2, 0), item => item.address), originals.slice(0, 2));
  assert.equal(api.prepareCandidates('192.0.2.0/30#range', 2, 443)[0].remark, 'range');
  assert.equal(api.normalizeDomainCandidate('example.com', 0), 'example.com:443');
  assert.equal(api.normalizeDomainCandidate('example.com:8443', 443), 'example.com:8443');
  for (const value of ['https://example.com/path', 'user@example.com', 'localhost', '-bad.example', 'a..example', 'example.com:0', 'example.com:65536', '<script>.com']) assert.equal(api.normalizeDomainCandidate(value, 443), null, value);
  assert.throws(() => api.prepareCandidates('https://example.com/path', 8, 443));
  const run = {stopped: false, controllers: new Set()};
  const row = await api.testLatency('example.com:443', 500, run);
  assert.equal(row.address, 'example.com:443'); assert(row.type.startsWith('域名解析IP'));
  assert.equal(row.parsed.family, 'ipv6'); assert.equal(row.parsed.ip, '2001:db8::1');
  assert.equal(dnsCalls.length, 2); assert.equal(probes.length, 2);
  const speedUrl = api.buildProbeUrl(row.parsed, '__down', {bytes: '20000000'});
  assert(speedUrl.includes('2001-db8--1.test.invalid:443/__down'));
  assert(!speedUrl.includes('example.com'));
  await api.testLatency('example.com:443', 500, run); assert.equal(dnsCalls.length, 2);
  context.state.results = [{...row, id: 1, speedState: 'done', speedMbps: 25}];
  context.formatSpeedMbps = value => String(value);
  api.saveSelectedResults(); assert.equal(saved.length, 1); assert(saved[0].startsWith('example.com:443#')); assert(saved[0].includes('25Mbps'));
  // Drive the actual screening entry point: input is immutable and all domains may resolve to the same IP.
  Object.assign(context, {
    readSettings: () => ({limit: 16, port: 0, threads: 2, timeout: 500}),
    resetResultFilters() {}, renderResults() {}, setProgress() {}, updateActionAvailability() {},
    svgStopIcon: () => '', svgPulseIcon: () => '', friendlyError: e => e.message,
    showOptimizeToast: message => { throw new Error(message); }
  });
  Object.assign(context.els, {ipInput: {value: originals.map((v, i) => v + '#source ' + i).join('\n')}, latencyStatus: {}, latencyBtn: {classList: {add() {}, remove() {}}}});
  const originalInput = context.els.ipInput.value;
  vm.runInContext(extract('async function startLatencyRun()', 'function stopLatencyRun()') + extract('async function runPool(', 'async function fetchJson('), context);
  await api.startLatencyRun();
  assert.equal(context.els.ipInput.value, originalInput);
  assert.equal(context.state.results.length, 3);
  for (const [i, item] of context.state.results.entries()) {
    item.speedState = 'done'; item.speedMbps = [10, 50, 30][i];
    context.state.selectedIds.add(String(item.id));
    assert.equal(item.remark, 'source ' + originals.indexOf(item.address));
    assert.equal(item.parsed.ip, '2001:db8::1');
  }
  context.state.sort = {key: 'speed', dir: 'desc'};
  const expected = Array.from(api.getSortedResults(), ({item}) => item.address);
  api.saveSelectedResults();
  assert.deepEqual(Array.from(saved, line => line.split('#')[0]), expected);
  assert(saved.every(line => line.includes('source ' + originals.indexOf(line.split('#')[0]))));
  // The parent app appends these exact selections without re-parsing addresses or saving KV.
  const textarea = {value: 'existing.example:443#keep'};
  let modified;
  const parent = {document: {getElementById: () => textarea}, showToast() {}, refreshLineEditor() {}, markModified: key => modified = key, closeOnlineOptimizeModal() {}};
  vm.createContext(parent);
  vm.runInContext(extract('function appendOnlineOptimizeSelections(', '// 从在线优选警告弹窗'), parent);
  parent.appendOnlineOptimizeSelections(saved);
  assert.equal(textarea.value, 'existing.example:443#keep\n' + saved.join('\n')); assert.equal(modified, 'sub');
  denyPrimary = true; dnsCalls = [];
  await api.resolveDomainAddresses(api.parseAddressWithPort('fallback.example:2053'), {stopped: false});
  assert.equal(dnsCalls.length, 4); assert(dnsCalls.some(url => url.startsWith('https://dns.google/resolve?')));
  const before = dnsCalls.length;
  await assert.rejects(api.resolveDomainAddresses(api.parseAddressWithPort('stop.example:443'), {stopped: true}), /已停止/);
  assert.equal(dnsCalls.length, before);
  noRecords = true;
  await assert.rejects(api.resolveDomainAddresses(api.parseAddressWithPort('empty.example:443'), {stopped: false}));
  console.log('PASS: mixed domain/IP input, validation, DNS fallback/cache/cancellation, IPv6 probe fallback, speed target and original-domain list import. No network requests made.');
})().catch(error => { console.error(error); process.exitCode = 1; });
