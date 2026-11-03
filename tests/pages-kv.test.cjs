// Chengeeker, 2026-11-03. GPL-2.0; see ../LICENSE. Mock Cloudflare API only.
const {test} = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs/promises'), vm = require('node:vm'), crypto = require('node:crypto'), os = require('node:os'), path = require('node:path');
const {准备Pages} = require('../scripts/prepare-pages.cjs');
const id = 'a'.repeat(32), account = 'b'.repeat(32), uuid = '12345678-1234-4123-8123-123456789abc';
const variables = {ADMIN: 'test-admin', KEY: 'test-key', UUID: uuid, OFF_LOG: 'true', CLOUDFLARE_ACCOUNT_ID: account, CLOUDFLARE_API_TOKEN: 'test-token', KV_NAMESPACE_NAME: 'my-project-production'};
async function app(handler) {
  const calls = [], context = vm.createContext({
    TextEncoder, TextDecoder, Uint8Array, ArrayBuffer, DataView, URL, URLSearchParams, Request, Response, Headers,
    ReadableStream, WritableStream, TransformStream, AbortController, AbortSignal, atob, btoa, performance,
    setTimeout, clearTimeout, queueMicrotask, console, WebSocket: {OPEN: 1, CLOSING: 2, CLOSED: 3},
    crypto: {getRandomValues: value => crypto.webcrypto.getRandomValues(value), subtle: new Proxy(crypto.webcrypto.subtle, {get(target, key) {
      if (key === 'digest') return (algorithm, data) => algorithm === 'MD5' ? Promise.resolve(Uint8Array.from(crypto.createHash('md5').update(data).digest()).buffer) : target.digest(algorithm, data);
      return typeof target[key] === 'function' ? target[key].bind(target) : target[key];
    }})},
    async fetch(url, options) {
      assert.equal(new URL(url).origin, 'https://api.cloudflare.com');
      assert.equal(options.headers.Authorization, 'Bearer test-token'); assert.equal(options.redirect, 'manual');
      assert(options.signal); calls.push({url, ...options}); return handler(new URL(url), options);
    },
  });
  const source = await fs.readFile('_worker.js', 'utf8');
  vm.runInContext(source.replace('export default {', 'globalThis.worker = {') + '\nglobalThis.storage = 获取配置存储;', context);
  const env = {...variables, ASSETS: {fetch: async request => new Response(new URL(request.url).pathname)}};
  const pending = [];
  async function request(url, init = {}, bindings = env) {
    const incoming = new Request(url, init); incoming.cf = {colo: 'HKG', asn: 64512, country: 'CN'};
    return context.worker.fetch(incoming, bindings, {waitUntil(promise) { pending.push(promise); }});
  }
  return {context, calls, env, request, pending};
}
const json = result => Response.json({success: true, result});
function server() {
  const data = new Map(); let exists = false, creates = 0;
  return {data, get creates() { return creates; }, fetch(url, options) {
    const endpoint = url.pathname.replace(`/client/v4/accounts/${account}/storage/kv/namespaces`, '');
    if (!endpoint && options.method === 'GET') return json(exists ? [{id, title: variables.KV_NAMESPACE_NAME}] : []);
    if (!endpoint && options.method === 'POST') { assert.equal(JSON.parse(options.body).title, variables.KV_NAMESPACE_NAME); exists = true; creates++; return json({id}); }
    if (endpoint === `/${id}`) return json({id});
    assert(endpoint.startsWith(`/${id}/values/`)); const key = decodeURIComponent(endpoint.split('/values/')[1]);
    if (options.method === 'PUT') { data.set(key, options.body); return json(null); }
    return data.has(key) ? new Response(data.get(key)) : new Response('not found', {status: 404});
  }};
}
test('first deployment without native KV logs in, creates storage, saves and reopens config', async () => {
  const backend = server(), runtime = await app(backend.fetch);
  const login = await runtime.request('https://project.pages.dev/login', {method: 'POST', body: 'password=test-admin'});
  assert.equal(login.status, 200); assert.equal(runtime.calls.length, 0);
  const cookie = login.headers.get('Set-Cookie').split(';')[0];
  const first = await runtime.request('https://project.pages.dev/admin/config.json', {headers: {Cookie: cookie}});
  assert.equal(first.status, 200); const config = await first.json();
  assert.equal(backend.creates, 1); assert(backend.data.has('config.json'));
  config.优选订阅生成.SUBNAME = '持久化验证';
  const saved = await runtime.request('https://project.pages.dev/admin/config.json', {method: 'POST', headers: {Cookie: cookie}, body: JSON.stringify(config)});
  assert.equal(saved.status, 200); await Promise.all(runtime.pending);
  const next = await app(backend.fetch);
  const reopened = await next.request('https://project.pages.dev/admin/config.json', {headers: {Cookie: cookie}});
  assert.equal((await reopened.json()).优选订阅生成.SUBNAME, '持久化验证'); assert.equal(backend.creates, 1);
  const custom = await next.request('https://custom.example/admin/config.json', {headers: {Cookie: cookie}});
  assert.equal((await custom.json()).优选订阅生成.SUBNAME, '持久化验证');
});
test('ordinary visitors and unauthenticated admin requests do not access the API', async () => {
  const runtime = await app(() => { throw new Error('Unexpected API request'); });
  assert.equal((await runtime.request('https://project.pages.dev/')).status, 404);
  assert.equal((await runtime.request('https://project.pages.dev/admin')).status, 302);
  assert.equal((await runtime.request('https://project.pages.dev/login')).status, 200); assert.equal(runtime.calls.length, 0);
  vm.runInContext("处理WS请求 = async () => new Response('ws'); 处理gRPC请求 = async () => new Response('grpc');", runtime.context);
  await runtime.request('https://project.pages.dev/channel', {headers: {Upgrade: 'websocket'}});
  await runtime.request('https://project.pages.dev/channel', {method: 'POST', headers: {'Content-Type': 'application/grpc'}});
  assert.equal(runtime.calls.length, 0, 'Transport requests must not access the storage API');
});
test('native binding wins, existing namespace ID is preserved, and keys are URL encoded', async () => {
  const backend = server(), runtime = await app(backend.fetch), native = {get() {}};
  assert.equal(runtime.context.storage({...variables, KV: native}), native);
  const storage = runtime.context.storage({...variables, KV_NAMESPACE_ID: id});
  await storage.put('中文 /?#', 'saved'); assert.equal(await storage.get('中文 /?#'), 'saved');
  assert.equal(backend.creates, 0); assert.equal(backend.data.get('中文 /?#'), 'saved');
  assert(runtime.calls.every(call => !call.url.includes('page=')));
});
test('concurrent first writes share initialization, and 10014 creation races are recovered', async () => {
  const backend = server(), runtime = await app(backend.fetch), storage = runtime.context.storage(variables);
  await Promise.all([storage.put('one', '1'), storage.put('two', '2')]); assert.equal(backend.creates, 1);
  let lists = 0;
  const raced = await app((url, options) => options.method === 'POST'
    ? Response.json({success: false, errors: [{code: 10014}]}, {status: 400})
    : url.search ? json(++lists === 1 ? [] : [{title: variables.KV_NAMESPACE_NAME, id}]) : new Response('restored'));
  assert.equal(await raced.context.storage(variables).get('config.json'), 'restored');
  const paged = await app((url, options) => {
    assert.equal(options.method, 'GET');
    if (!url.search) return new Response('existing');
    return json(url.searchParams.get('page') === '1' ? Array.from({length: 100}, (_, index) => ({title: `other-${index}`, id})) : [{title: variables.KV_NAMESPACE_NAME, id}]);
  });
  assert.equal(await paged.context.storage(variables).get('config.json'), 'existing');
});
test('API authorization errors yield 503, never default config or a false successful save', async () => {
  const runtime = await app(() => Response.json({success: false, errors: [{message: 'test-token'}]}, {status: 403}));
  const login = await runtime.request('https://project.pages.dev/login', {method: 'POST', body: 'password=test-admin'});
  const cookie = login.headers.get('Set-Cookie').split(';')[0];
  for (const init of [{headers: {Cookie: cookie}}, {method: 'POST', headers: {Cookie: cookie}, body: '{}'}]) {
    const response = await runtime.request('https://project.pages.dev/admin/config.json', init);
    assert.equal(response.status, 503); const message = await response.text(); assert(message.includes('HTTP 403')); assert(!message.includes('test-token'));
  }
  let denyWrites = false; const backend = server();
  const ready = await app((url, options) => denyWrites && options.method === 'PUT' ? Response.json({success: false}, {status: 403}) : backend.fetch(url, options));
  const authenticated = await ready.request('https://project.pages.dev/login', {method: 'POST', body: 'password=test-admin'});
  const headers = {Cookie: authenticated.headers.get('Set-Cookie').split(';')[0]};
  const config = await (await ready.request('https://project.pages.dev/admin/config.json', {headers})).json();
  denyWrites = true;
  assert.equal((await ready.request('https://project.pages.dev/admin/config.json', {method: 'POST', headers, body: JSON.stringify(config)})).status, 503);
});
test('initialization failures can retry; non-404 reads and failed writes are not hidden', async () => {
  let fail = true; const backend = server();
  const runtime = await app((url, options) => fail ? new Response('failure', {status: 503}) : backend.fetch(url, options));
  const storage = runtime.context.storage(variables);
  await assert.rejects(storage.get('x')); fail = false; assert.equal(await storage.get('x'), null);
  fail = true; await assert.rejects(storage.get('x')); await assert.rejects(storage.put('x', 'value'));
  const redirected = await app(() => new Response(null, {status: 302, headers: {Location: 'https://outside.example'}}));
  await assert.rejects(redirected.context.storage(variables).get('x')); assert.equal(redirected.calls.length, 1);
});
test('Pages preparation needs no credentials and does not rewrite deployment config', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'forkedgetunnel-pages-'));
  t.after(async () => { assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir())); assert(path.basename(root).startsWith('forkedgetunnel-pages-')); await fs.rm(root, {recursive: true, force: true}); });
  const original = 'main = "_worker.js"'; await fs.writeFile(path.join(root, 'wrangler.toml'), original);
  for (const name of ['_worker.js', 'admin', 'login', 'noADMIN', 'noKV', 'cdn-cgi']) await fs.writeFile(path.join(root, name), name);
  await fs.writeFile(path.join(root, '.env'), 'secret'); await 准备Pages(root);
  assert.equal(await fs.readFile(path.join(root, 'wrangler.toml'), 'utf8'), original);
  assert.deepEqual((await fs.readdir(path.join(root, 'dist'))).sort(), ['_worker.js', 'admin', 'login', 'noADMIN', 'noKV', 'cdn-cgi'].sort());
});
