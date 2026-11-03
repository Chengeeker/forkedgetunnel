// Chengeeker, 2026-11-03. GPL-2.0; see ../LICENSE. Offline compatibility checks.
// Run from the repository root: node tests/worker-compatibility.test.cjs
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const crypto = require('node:crypto');
const source = fs.readFileSync('_worker.js', 'utf8');
const context = vm.createContext({
  TextEncoder, TextDecoder, Uint8Array, ArrayBuffer, DataView, URL, URLSearchParams, Request, Response, Headers,
  ReadableStream, WritableStream, TransformStream, AbortController, atob, btoa,
  setTimeout, clearTimeout, queueMicrotask, console, WebSocket: {OPEN: 1, CLOSING: 2, CLOSED: 3},
  crypto: {
    getRandomValues: value => crypto.webcrypto.getRandomValues(value),
    subtle: new Proxy(crypto.webcrypto.subtle, {get(target, key) {
      if (key === 'digest') return (algorithm, data) => algorithm === 'MD5'
        ? Promise.resolve(Uint8Array.from(crypto.createHash('md5').update(data).digest()).buffer)
        : target.digest(algorithm, data);
      return typeof target[key] === 'function' ? target[key].bind(target) : target[key];
    }}),
  },
  fetch() { throw new Error('Unexpected external request'); },
});
const exported = [
  '格式化用户标识', '编码带密钥文本', '解码带密钥文本', '计算认证摘要',
  '获取UUID字节', '解析魏烈思请求', '获取SOCKS5账号', '获取代理默认端口', '反代参数获取',
  '构造安全层记录', '安全层记录解析器', '构造握手消息', '握手消息解析器',
  '执行流式认证加密', '执行流式认证解密', '导入分组认证密钥', '执行分组认证加密', '执行分组认证解密',
  '构造中继消息属性', '构造中继消息', '获取传输协议配置', '获取本机标识', '计算双重摘要',
  '解码WS早期数据',
];
vm.runInContext(source.replace('export default {', 'globalThis.worker = {') + `\nglobalThis.helpers = {${exported.join(',')}};`, context);
const api = context.helpers;
const plain = value => JSON.parse(JSON.stringify(value));
const bytes = value => Buffer.from(value);
const uuid = '12345678-1234-4123-8123-123456789abc';

(async () => {
  assert.equal(api.格式化用户标识(api.获取UUID字节(uuid)), uuid);
  assert.equal(api.计算认证摘要('abc'), crypto.createHash('sha224').update('abc').digest('hex'));
  assert.equal(api.编码带密钥文本('abc', 'k'), 'CgkI');
  assert.equal(api.解码带密钥文本(api.编码带密钥文本('中文凭据/abc', uuid), uuid), '中文凭据/abc');

  const packet = Uint8Array.from([0, ...api.获取UUID字节(uuid), 0, 1, 1, 187, 1, 192, 0, 2, 1, 7, 8]);
  const parsed = api.解析魏烈思请求(packet, uuid);
  assert.deepEqual(plain({...parsed, rawClientData: [...parsed.rawClientData]}), {
    hasError: false, addressType: 1, port: 443, hostname: '192.0.2.1', isUDP: false, rawClientData: [7, 8], version: 0,
  });
  const badAuth = packet.slice(); badAuth[1] ^= 1;
  assert.equal(api.解析魏烈思请求(badAuth, uuid).message, 'Invalid uuid');
  assert.equal(api.解析魏烈思请求(packet.slice(0, 23), uuid).hasError, true);
  const udp = packet.slice(); udp[18] = 2;
  assert.equal(api.解析魏烈思请求(udp, uuid).isUDP, true);

  const account = {username: 'user', password: 'pass', hostname: '[2001:db8::1]', port: 1080};
  assert.deepEqual(plain(api.获取SOCKS5账号('user:pass@[2001:db8::1]:1080')), account);
  assert.deepEqual(plain(api.获取SOCKS5账号(`${btoa('user:pass')}@[2001:db8::1]:1080`)), account);
  assert.throws(() => api.获取SOCKS5账号('user@relay.example:1080'), /认证/);
  for (const [type, port] of Object.entries({socks5: 1080, http: 80, https: 443, turn: 3478, sstp: 443})) {
    assert.equal(api.获取代理默认端口(type), port);
    const result = await api.反代参数获取(new URL(`https://edge.example/?${type}=user:pass@relay.example:${port}&globalproxy`), uuid);
    assert.equal(result.代理类型, type);
    assert.equal(result.代理全局, true);
    assert.deepEqual(plain(result.代理参数), {username: 'user', password: 'pass', hostname: 'relay.example', port});
  }
  const chain = {type: 'https', hostname: 'relay.example', port: 443, username: 'user', password: 'pass'};
  const chainResult = await api.反代参数获取(new URL(`https://edge.example/video/${api.编码带密钥文本(JSON.stringify(chain), uuid)}`), uuid);
  assert.equal(chainResult.代理类型, 'https');
  assert.equal(chainResult.反代兜底, false);
  assert.equal(chainResult.代理参数.password, 'pass');

  const record = api.构造安全层记录(23, Uint8Array.of(1, 2, 3));
  assert.equal(bytes(record).toString('hex'), '1703030003010203');
  const recordParser = new api.安全层记录解析器();
  recordParser.feed(record.slice(0, 4)); assert.equal(recordParser.next(), null);
  recordParser.feed(record.slice(4));
  const recordResult = recordParser.next();
  assert.deepEqual(plain({...recordResult, fragment: [...recordResult.fragment]}), {type: 23, version: 771, length: 3, fragment: [1, 2, 3]});
  assert.equal(recordParser.next(), null);
  const handshake = api.构造握手消息(1, Uint8Array.of(4, 5));
  const handshakeParser = new api.握手消息解析器();
  handshakeParser.feed(handshake.slice(0, 3)); assert.equal(handshakeParser.next(), null);
  handshakeParser.feed(handshake.slice(3));
  assert.equal(bytes(handshakeParser.next().body).toString('hex'), '0405');

  const key = Uint8Array.from({length: 32}, (_, i) => i), nonce = new Uint8Array(12), aad = Uint8Array.of(7, 8, 9);
  for (const length of [0, 1, 15, 16, 17, 64, 129]) {
    const input = Uint8Array.from({length}, (_, i) => i);
    const cipher = crypto.createCipheriv('chacha20-poly1305', key, nonce, {authTagLength: 16});
    cipher.setAAD(aad);
    const expected = Buffer.concat([cipher.update(input), cipher.final(), cipher.getAuthTag()]);
    const encrypted = api.执行流式认证加密(key, nonce, input, aad);
    assert.deepEqual(bytes(encrypted), expected);
    assert.deepEqual(bytes(api.执行流式认证解密(key, nonce, encrypted, aad)), bytes(input));
    const corrupted = encrypted.slice(); corrupted[corrupted.length - 1] ^= 1;
    assert.throws(() => api.执行流式认证解密(key, nonce, corrupted, aad), /authentication failed/);
  }
  const aesKey = await api.导入分组认证密钥(key.slice(0, 16), ['encrypt', 'decrypt']);
  const aesInput = Uint8Array.of(1, 2, 3), aesCipher = crypto.createCipheriv('aes-128-gcm', key.slice(0, 16), nonce);
  aesCipher.setAAD(aad);
  const aesExpected = Buffer.concat([aesCipher.update(aesInput), aesCipher.final(), aesCipher.getAuthTag()]);
  const aesEncrypted = await api.执行分组认证加密(aesKey, nonce, aesInput, aad);
  assert.deepEqual(bytes(aesEncrypted), aesExpected);
  assert.deepEqual(bytes(await api.执行分组认证解密(aesKey, nonce, aesEncrypted, aad)), bytes(aesInput));

  const attribute = api.构造中继消息属性(6, new TextEncoder().encode('hello'));
  assert.equal(bytes(attribute).toString('hex'), '0006000568656c6c6f000000');
  const relayMessage = api.构造中继消息(3, Uint8Array.from({length: 12}, (_, i) => i), [attribute]);
  assert.equal(bytes(relayMessage).toString('hex'), '0003000c2112a442000102030405060708090a0b0006000568656c6c6f000000');
  for (const transport of ['ws', 'grpc', 'xhttp']) {
    const config = api.获取传输协议配置({UUID: uuid, 传输协议: transport, gRPC模式: 'multi'});
    assert.equal(config.路径字段名, transport === 'grpc' ? 'serviceName' : 'path');
    assert.equal(config.域名字段名, transport === 'grpc' ? 'authority' : 'host');
    assert(config.type.startsWith(transport));
    if (transport === 'xhttp') {
      const extra = JSON.parse(new URLSearchParams(config.type).get('extra'));
      assert.equal(extra.noGRPCHeader, true);
      assert.equal(extra.xPaddingObfsMode, true);
      assert.deepEqual([extra.xPaddingHeader, extra.xPaddingKey], [...api.获取本机标识(uuid)]);
    }
  }

  const env = {ADMIN: 'test-only-password', KEY: 'test-only-key', UUID: uuid, KV: {get: async () => null}, ASSETS: {fetch: async () => new Response('local-page')}};
  async function request(path, options = {}, bindings = env) {
    const req = new Request(`https://edge.example${path}`, {...options, ...(options.body instanceof ReadableStream ? {duplex: 'half'} : {})});
    req.cf = {colo: 'HKG', asn: 64512, country: 'CN'};
    return context.worker.fetch(req, bindings, {waitUntil() {}});
  }
  const version = await request(`/version?uuid=${uuid}`);
  assert.equal(version.status, 200);
  const versionMatch = source.match(/^\s*const\s+Version\s*=\s*['"]([^'"]+)['"]\s*;?/m);
  assert(versionMatch, 'The admin panel must be able to read the source version');
  assert.deepEqual(await version.json(), {Version: Number(versionMatch[1].replace(/\D+/g, ''))});
  assert.equal(await (await request('/login')).text(), 'local-page');
  const rejected = await request('/admin');
  assert.equal(rejected.status, 302); assert.equal(rejected.headers.get('Location'), '/login');
  const login = await request('/login', {method: 'POST', body: 'password=test-only-password'});
  assert.deepEqual(await login.json(), {success: true});
  assert.match(login.headers.get('Set-Cookie'), /^auth=.+; Path=\/; Max-Age=86400; HttpOnly; Secure; SameSite=Lax$/);
  assert.equal((await request('/login', {method: 'POST', body: 'password=wrong'})).headers.get('Set-Cookie'), null);
  assert.equal((await request('/admin', {}, {...env, ADMIN: undefined, UUID: undefined, KEY: undefined})).status, 404);

  const snapshot = async response => ({status: response.status, headers: [...response.headers], text: await response.text()});
  const bounded = async promise => {
    let deadline;
    try { return await Promise.race([promise, new Promise((_, reject) => { deadline = setTimeout(() => reject(new Error('Authenticated stream stalled')), 2000); })]); }
    finally { clearTimeout(deadline); }
  };
  const notFound = await snapshot(await request('/missing'));
  assert.equal(notFound.status, 404); assert.equal(notFound.text, 'Not Found');
  const framed = payload => {
    assert(payload.length < 128, 'These fixtures use a single-byte protobuf length');
    return Uint8Array.from([0, 0, 0, 0, payload.length + 2, 10, payload.length, ...payload]);
  };
  for (const options of [
    {method: 'POST'},
    {method: 'POST', body: 'unrelated form data'},
    {method: 'POST', headers: {'Content-Type': 'application/grpc'}},
    {method: 'POST', body: framed(badAuth), headers: {'Content-Type': 'application/grpc'}},
    {method: 'POST', body: Uint8Array.of(0, 128, 0, 0, 0), headers: {'Content-Type': 'application/grpc'}},
    {headers: {Upgrade: 'websocket', 'Sec-WebSocket-Protocol': 'A'.repeat(12000)}},
  ]) assert.deepEqual(await snapshot(await request('/channel', options)), notFound);
  assert.deepEqual(await snapshot(await request('/%zz', {method: 'POST', body: 'unrelated post'})), notFound);
  assert.equal((await request('/missing', {method: 'HEAD'})).body, null);
  assert.equal(api.解码WS早期数据('binary', uuid), null, 'A normal subprotocol is not treated as malformed early data');
  let cancelled = false;
  const invalidBody = new ReadableStream({start(c) { c.enqueue(framed(badAuth)); }, cancel() { cancelled = true; }});
  assert.deepEqual(await snapshot(await request('/channel', {method: 'POST', body: invalidBody, headers: {'Content-Type': 'application/grpc'}})), notFound);
  assert.equal(cancelled, true, 'Rejecting a request must stop its upload');
  for (const headers of [{}, {'Content-Type': 'application/grpc'}]) {
    const brokenBody = new ReadableStream({start(c) { c.error(new Error('offline read error')); }});
    assert.deepEqual(await snapshot(await request('/channel', {method: 'POST', body: brokenBody, headers})), notFound);
  }

  const speedHost = new TextEncoder().encode('speed.cloudflare.com');
  const speedPacket = Uint8Array.from([0, ...api.获取UUID字节(uuid), 0, 1, 1, 187, 2, speedHost.length, ...speedHost]);
  const expected204 = Buffer.concat([Buffer.from([0, 0]), Buffer.from('HTTP/1.1 204 No Content\r\nContent-Length: 0\r\nConnection: close\r\n\r\n')]);
  const trojanPacket = Uint8Array.from([...Buffer.from(api.计算认证摘要(uuid)), 13, 10, 1, 3, speedHost.length, ...speedHost, 1, 187, 13, 10]);
  for (const headers of [{}, {'Content-Type': 'application/grpc'}]) {
    const result = await request('/channel', {method: 'POST', body: headers['Content-Type'] ? framed(trojanPacket) : trojanPacket, headers});
    assert.equal(result.status, 200);
    const reply = Buffer.from(await result.arrayBuffer());
    assert.deepEqual(headers['Content-Type'] ? reply.subarray(7) : reply, expected204.subarray(2));
  }
  const [paddingHeader, paddingKey] = api.获取本机标识(uuid);
  for (const headers of [{}, {'Content-Type': 'application/grpc', [paddingHeader]: `https://edge.example/?${paddingKey}=${'a'.repeat(300)}`}]) {
    const result = await request('/channel', {method: 'POST', body: speedPacket, headers});
    assert.equal(result.status, 200);
    assert.equal(result.headers.get('Content-Type'), 'application/octet-stream');
    assert.deepEqual(Buffer.from(await result.arrayBuffer()), expected204);
  }
  let upload;
  const liveBody = new ReadableStream({start(c) { upload = c; }});
  let settled = false;
  const liveResponse = request('/channel', {method: 'POST', body: liveBody, headers: {'Content-Type': 'application/grpc'}}).then(r => { settled = true; return r; });
  const liveFrame = framed(speedPacket);
  upload.enqueue(liveFrame.slice(0, 3));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(settled, false, 'Unauthenticated partial frames must not reveal gRPC response headers');
  upload.enqueue(liveFrame.slice(3, 10)); upload.enqueue(liveFrame.slice(10));
  const live = await bounded(liveResponse);
  assert.equal(live.status, 200); assert.equal(live.headers.get('Content-Type'), 'application/grpc');
  assert.equal(live.headers.get('grpc-status'), '0');
  const responseFrames = Buffer.from(await live.arrayBuffer());
  const decoded = [];
  for (let offset = 0; offset < responseFrames.length;) {
    const length = responseFrames.readUInt32BE(offset + 1);
    assert.equal(responseFrames[offset + 5], 10);
    decoded.push(responseFrames.subarray(offset + 7, offset + 5 + length)); offset += 5 + length;
  }
  assert.deepEqual(Buffer.concat(decoded), expected204, 'The validated stream responds before the upload ends');
  upload.close();
  vm.runInContext('globalThis.originalForward = 转发字节流; 转发字节流 = () => new Promise(resolve => { globalThis.continueDial = resolve; });', context);
  let upstream;
  const upstreamBody = new ReadableStream({start(c) { upstream = c; }});
  const normalResponse = request('/channel', {method: 'POST', body: upstreamBody, headers: {'Content-Type': 'application/grpc'}});
  upstream.enqueue(framed(packet));
  const normal = await bounded(normalResponse);
  assert.equal(normal.status, 200, 'Response headers do not wait for dialing or upload completion');
  const downlink = normal.body.getReader();
  const firstReply = await bounded(downlink.read());
  assert.equal(Buffer.from(firstReply.value).toString('hex'), '00000000040a020000');
  upstream.close(); context.continueDial();
  assert.equal((await bounded(downlink.read())).done, true);
  vm.runInContext('转发字节流 = originalForward; delete globalThis.originalForward; delete globalThis.continueDial;', context);
  assert.match(await (await request('/missing', {}, {...env, URL: 'nginx'})).text(), /Welcome to nginx/);
  const mirrored = [];
  context.fetch = async (url, options) => { mirrored.push({url, options}); return new Response('public.example', {headers: {'Content-Type': 'text/html'}}); };
  const mirror = await request('/channel?token=private-value', {method: 'POST', body: 'unrelated form data', headers: {Cookie: 'auth=private-cookie', Authorization: 'Bearer private-token'}}, {...env, URL: 'https://public.example'});
  assert.equal(await mirror.text(), 'edge.example');
  assert.equal(mirrored.length, 1); assert.equal(mirrored[0].url, 'https://public.example/');
  assert.equal(mirrored[0].options.method, 'GET'); assert.equal(mirrored[0].options.body, null);
  for (const name of ['Cookie', 'Authorization', 'Content-Type']) assert.equal(mirrored[0].options.headers.get(name), null);
  context.fetch = () => { throw new Error('Unexpected external request'); };

  // Routing mocks avoid dialing real services; the parsers and crypto above run unchanged.
  vm.runInContext(`
    处理WS请求 = async () => new Response('ws-route');
    处理gRPC请求 = async () => new Response('grpc-route');
    处理叉HTTP请求 = async () => new Response('xhttp-route');
  `, context);
  assert.equal(await (await request('/channel', {headers: {Upgrade: 'websocket'}})).text(), 'ws-route');
  assert.equal(await (await request('/channel', {method: 'POST', headers: {'Content-Type': 'application/grpc'}})).text(), 'grpc-route');
  assert.equal(await (await request('/channel', {method: 'POST', headers: {'Content-Type': 'application/octet-stream'}})).text(), 'xhttp-route');
  assert.equal(await (await request('/robots.txt')).text(), 'User-agent: *\nDisallow: /');
  console.log('PASS: Worker authentication, probe fallback, live fragmented gRPC/XHTTP, protocol fields, chain parameters and crypto interoperability. No network requests made.');
})().catch(error => { console.error(error); process.exitCode = 1; });
