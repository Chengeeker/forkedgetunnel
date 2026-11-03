// Chengeeker, 2026-11-03. GPL-2.0; see ../LICENSE. Mock API only.
const {test} = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs/promises'), os = require('node:os'), path = require('node:path');
const {准备Pages} = require('../scripts/prepare-pages.cjs');
const id = 'a'.repeat(32), productionId = 'b'.repeat(32), otherId = 'c'.repeat(32);
const env = {CLOUDFLARE_ACCOUNT_ID: 'd'.repeat(32), CLOUDFLARE_API_TOKEN: 'test-only-token', CF_PAGES_URL: 'https://1234.my-project.pages.dev', CF_PAGES_BRANCH: 'main'};
const project = () => ({name: 'my-project', production_branch: 'main', deployment_configs: {
  production: {compatibility_date: '2025-11-04', compatibility_flags: [], env_vars: {ADMIN: {type: 'plain_text', value: 'test-only-admin'}, PRIVATE: {type: 'secret_text', value: null}, CLOUDFLARE_API_TOKEN: {type: 'plain_text', value: 'test-only-token'}}, kv_namespaces: {}},
  preview: {compatibility_date: '2025-11-04', env_vars: {}, kv_namespaces: {}},
}});
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'forkedgetunnel-pages-'));
  t.after(async () => {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
    assert(path.basename(root).startsWith('forkedgetunnel-pages-'));
    await fs.rm(root, {recursive: true, force: true});
  });
  await fs.writeFile(path.join(root, 'wrangler.toml'), 'main = "_worker.js"\ncompatibility_date = "2025-11-04"\n');
  await fs.writeFile(path.join(root, '_worker.js'), 'export default {};');
  for (const directory of ['admin', 'login', 'noADMIN', 'noKV', 'cdn-cgi', 'tests']) {
    await fs.mkdir(path.join(root, directory)); await fs.writeFile(path.join(root, directory, 'index.html'), directory);
  }
  await fs.writeFile(path.join(root, '.env'), 'PRIVATE=test-only-token');
  return root;
}
function mock(configuration, handler) {
  const calls = [];
  const request = async (url, options) => {
    const target = new URL(url);
    assert.equal(target.origin, 'https://api.cloudflare.com');
    assert.equal(options.headers.Authorization, 'Bearer test-only-token');
    assert.equal(options.redirect, 'error'); assert(options.signal);
    const endpoint = target.pathname.replace(`/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}`, '') + target.search;
    calls.push({endpoint, ...options});
    if (endpoint === '/pages/projects/my-project') return Response.json({success: true, result: configuration});
    const result = await handler(endpoint, options, calls);
    return result instanceof Response ? result : Response.json({success: true, ...result});
  };
  return {request, calls};
}

test('new production deployment provisions KV and emits deploy metadata without leaking build secrets', async t => {
  const root = await fixture(t);
  const api = mock(project(), (endpoint, options) => {
    if (options.method === 'GET') return {result: []};
    assert.equal(endpoint, '/storage/kv/namespaces');
    assert.equal(JSON.parse(options.body).title, 'forkedgetunnel-my-project-production-KV');
    return {result: {id}};
  });
  assert.deepEqual(await 准备Pages(env, api.request, root), {项目名: 'my-project', 部署环境: 'production', 标识: id});
  const config = await fs.readFile(path.join(root, 'wrangler.toml'), 'utf8');
  assert.match(config, /pages_build_output_dir = "\.\/dist"/); assert.match(config, new RegExp(`id = "${id}"`));
  assert.match(config, /"ADMIN" = "test-only-admin"/); assert.doesNotMatch(config, /test-only-token|PRIVATE|main =/);
  assert.deepEqual((await fs.readdir(path.join(root, 'dist'))).sort(), ['_worker.js', 'admin', 'cdn-cgi', 'login', 'noADMIN', 'noKV'].sort());
  assert.equal(await fs.readFile(path.join(root, 'dist', '_worker.js'), 'utf8'), 'export default {};');
});

test('existing binding and other KV bindings are preserved, with no namespace creation or data writes', async t => {
  const root = await fixture(t), configuration = project();
  configuration.deployment_configs.production.kv_namespaces = {KV: {namespace_id: productionId}, OTHER: {namespace_id: otherId}};
  const api = mock(configuration, endpoint => { assert.equal(endpoint, `/storage/kv/namespaces/${productionId}`); return {result: {id: productionId}}; });
  await 准备Pages(env, api.request, root);
  assert(api.calls.every(call => call.method === 'GET'));
  const config = await fs.readFile(path.join(root, 'wrangler.toml'), 'utf8');
  assert(config.includes(productionId)); assert(config.includes(otherId));
});

test('preview gets an isolated namespace, and pagination reuses a previous build resource', async t => {
  const root = await fixture(t), configuration = project();
  configuration.deployment_configs.production.kv_namespaces = {KV: {namespace_id: productionId}};
  const api = mock(configuration, (endpoint, options) => {
    assert.equal(options.method, 'GET');
    if (endpoint.endsWith('page=1')) return {result: Array.from({length: 100}, (_, index) => ({title: `other-${index}`, id: otherId})), result_info: {total_pages: 2}};
    assert(endpoint.endsWith('page=2'));
    return {result: [{title: 'forkedgetunnel-my-project-preview-KV', id}]};
  });
  const result = await 准备Pages({...env, CF_PAGES_BRANCH: 'feature/test'}, api.request, root);
  assert.equal(result.部署环境, 'preview'); assert.equal(result.标识, id);
  assert.doesNotMatch(await fs.readFile(path.join(root, 'wrangler.toml'), 'utf8'), new RegExp(productionId));
});

test('concurrent namespace creation reuses the winning resource', async t => {
  const root = await fixture(t); let lists = 0;
  const api = mock(project(), (endpoint, options) => {
    if (options.method === 'POST') return Response.json({success: false, errors: [{code: 10014}]}, {status: 400});
    return {result: ++lists === 1 ? [] : [{title: 'forkedgetunnel-my-project-production-KV', id}]};
  });
  assert.equal((await 准备Pages(env, api.request, root)).标识, id);
  assert.equal(api.calls.filter(call => call.method === 'POST').length, 1);
});

test('bad permissions, stale binding and extra resource bindings fail without overwriting config', async t => {
  for (const mode of ['permission', 'stale', 'extra', 'hidden-var', 'invalid-binding']) {
    const root = await fixture(t), configuration = project();
    if (mode === 'stale') configuration.deployment_configs.production.kv_namespaces = {KV: {namespace_id: productionId}};
    if (mode === 'extra') configuration.deployment_configs.production.d1_databases = {DB: {id}};
    if (mode === 'hidden-var') configuration.deployment_configs.production.env_vars.ADMIN.value = null;
    if (mode === 'invalid-binding') configuration.deployment_configs.production.kv_namespaces = {KV: {}};
    const original = await fs.readFile(path.join(root, 'wrangler.toml'), 'utf8');
    const api = mock(configuration, () => Response.json({success: false, errors: [{code: 10000}]}, {status: 403}));
    await assert.rejects(准备Pages(env, api.request, root), error => { assert(!error.message.includes(env.CLOUDFLARE_API_TOKEN)); return true; });
    assert.equal(await fs.readFile(path.join(root, 'wrangler.toml'), 'utf8'), original);
    assert(api.calls.every(call => call.method === 'GET'));
  }
});

test('missing credentials and invalid build context make no API calls', async t => {
  const root = await fixture(t); let calls = 0;
  const request = () => { calls++; throw new Error('Should not run'); };
  for (const overrides of [{CLOUDFLARE_API_TOKEN: ''}, {CLOUDFLARE_ACCOUNT_ID: 'not-an-account'}, {CF_PAGES_URL: 'https://outside.example'}, {CF_PAGES_BRANCH: ''}]) {
    await assert.rejects(准备Pages({...env, ...overrides}, request, root));
  }
  assert.equal(calls, 0);
});
