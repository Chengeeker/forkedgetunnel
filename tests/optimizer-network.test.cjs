// Chengeeker, 2026-11-07. GPL-2.0; see ../LICENSE. Offline regression checks.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const html = fs.readFileSync('admin/index.html', 'utf8');
function extract(start, end) {
  const offset = html.indexOf(start), limit = html.indexOf(end, offset);
  assert(offset > 0 && limit > offset);
  return html.slice(offset, limit);
}
const storage = new Map(), calls = [];
const select = {
  options: [], disabled: true, value: '',
  set innerHTML(value) { this.options = []; this.value = ''; },
  appendChild(option) { this.options.push(option); },
  get selectedOptions() { return [this.options.find(option => option.value === this.value) || this.options[0]].filter(Boolean); }
};
const state = {networkChecking: false, results: [], ipv4: null, ipv6: null};
const els = {librarySelect: select, inputSourceHint: {}, importBtn: {}, ipInput: {value: 'previous input'}, latencyStatus: {}, latencyBtn: {}, speedAllBtn: {}};
let failingHosts = new Set(), remoteText = '', fetches = 0;
const context = {
  state, els, Map, Set, Promise, Math, Array, Error,
  window: {localStorage: {getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key)}},
  document: {createElement: () => ({dataset: {}})},
  detectStack: async (family, host) => {
    calls.push({family, host});
    if (failingHosts.has(host)) throw new Error('service unavailable');
    return {status: 'done', ip: family === 'ipv4' ? '192.0.2.1' : '2001:db8::1', ipType: family, country: 'US', allowed: false};
  },
  updateEditorMeta() {}, friendlyError: error => error.message,
  fetchText: async () => { fetches++; return remoteText; }
};
vm.createContext(context);
vm.runInContext(
  extract('const BEST_HOSTS =', 'const LIBRARY_SELECTION_CACHE_KEY =') +
  extract('const LIBRARY_SELECTION_CACHE_KEY =', 'const SAVE_EASTER_SHAKE_DELAY_MS =') +
  extract('function librarySelectionKey(', 'function updateActionAvailability()') +
  extract('function updateActionAvailability()', 'function updateEditorMeta()') +
  extract('function availableFamilies()', 'function librarySelectionKey('), context
);
(async () => {
  const cacheKey = 'bestcf:active-best-host';
  const primary = 'bestcf.cmliussss.hidns.vip', backup = 'ns.psb.kdns.fr';
  storage.set(cacheKey, primary); failingHosts.add(primary);
  let result = await context.resolveBestHost();
  assert.equal(result.host, backup); assert.equal(storage.get(cacheKey), backup);
  assert.equal(calls.length, 4); assert(result.checks.every(check => check.status === 'fulfilled'));
  calls.length = 0;
  await context.resolveBestHost();
  assert.equal(calls.length, 2); assert(calls.every(call => call.host === backup));
  failingHosts.add(backup);
  result = await context.resolveBestHost();
  assert(result.checks.every(check => check.status === 'rejected')); assert.equal(storage.has(cacheKey), false);

  // Failed dual-stack detection must not hide static libraries or block a retry.
  context.updateLibraryOptions();
  assert.equal(select.options.length, 8); assert.equal(select.disabled, false); assert.equal(select.value, 'custom'); assert.equal(els.importBtn.hidden, true);
  await context.importLibrary(); assert.equal(els.ipInput.value, 'previous input'); assert.equal(fetches, 0);
  context.updateActionAvailability();
  assert.equal(els.latencyBtn.disabled, false); assert.equal(els.speedAllBtn.disabled, true);
  for (const family of ['ipv4', 'ipv6']) {
    select.value = select.options.find(option => option.dataset.family === family).value;
    await context.importLibrary();
    assert(els.ipInput.value.includes(family === 'ipv4' ? '104.16.0.0/13' : '2606:4700::/32'));
  }
  assert.equal(fetches, 0);
  context.rememberSelectedLibrary(); context.updateLibraryOptions();
  assert.equal(select.selectedOptions[0].dataset.family, 'ipv6');
  select.value = select.options.find(option => option.textContent === 'CM优选列表v4').value;
  remoteText = '<!DOCTYPE html><html>upstream landing page</html>';
  const previousInput = els.ipInput.value;
  await context.importLibrary();
  assert.equal(els.ipInput.value, previousInput); assert(els.latencyStatus.textContent.includes('网页'));
  remoteText = '192.0.2.0/24'; await context.importLibrary(); assert.equal(els.ipInput.value, remoteText);
  let finishImport;
  context.fetchText = () => new Promise(resolve => finishImport = resolve);
  const importing = context.importLibrary();
  assert.equal(els.importBtn.disabled, true);
  els.ipInput.value = 'custom.example:443#my entry'; context.useCustomInput();
  assert.equal(select.value, 'custom'); assert.equal(els.importBtn.hidden, true);
  finishImport('192.0.2.99:443'); await importing;
  assert.equal(els.ipInput.value, 'custom.example:443#my entry');
  context.updateLibraryOptions(); assert.equal(select.value, 'custom');
  // A source switch also invalidates an older import without overwriting input or a newer status.
  select.value = select.options.find(option => option.textContent === 'CM优选列表v4').value;
  context.rememberSelectedLibrary(); const switched = context.importLibrary();
  select.value = select.options.find(option => option.dataset.family === 'ipv6').value;
  context.rememberSelectedLibrary();
  finishImport('192.0.2.88:443'); await switched;
  assert.equal(els.ipInput.value, 'custom.example:443#my entry'); assert.equal(els.importBtn.disabled, false);
  state.networkChecking = true; context.updateActionAvailability(); assert.equal(els.latencyBtn.disabled, true);

  context.fetchJsonFromFastestEndpoint = async () => ({endpoint: 'https://test.invalid', data: {}});
  context.preferredTypeFromCnIspCode = () => '官方优选';
  vm.runInContext(extract('async function detectStack(', 'async function loadLocations()'), context);
  await assert.rejects(context.detectStack('ipv4', primary), /有效出口 IP/);
  context.fetchJsonFromFastestEndpoint = async () => ({endpoint: 'https://test.invalid', data: {ip: '192.0.2.1', ipType: 'ipv4', country: 'US'}});
  assert.equal((await context.detectStack('ipv4', primary)).allowed, false);
  console.log('PASS: stale-host failover, checked cache, real failures, library imports without detection, HTML rejection and retry availability. No network requests made.');
})().catch(error => { console.error(error); process.exitCode = 1; });
