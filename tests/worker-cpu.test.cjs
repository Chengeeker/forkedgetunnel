// Chengeeker, 2026-11-09. GPL-2.0; see ../LICENSE. No network requests.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const crypto = require('node:crypto');
const stats = {digests: 0, copiedBytes: 0, slices: 0};
class CheckedBytes extends Uint8Array {
  set(input, offset) { stats.copiedBytes += input.length; return super.set(input, offset); }
  slice(...args) { stats.slices++; return super.slice(...args); }
}
const context = vm.createContext({
  TextEncoder, TextDecoder, Uint8Array: CheckedBytes, ArrayBuffer, DataView, URL, URLSearchParams,
  Request, Response, Headers, ReadableStream, WritableStream, TransformStream, AbortController,
  atob, btoa, setTimeout, clearTimeout, queueMicrotask, console,
  WebSocket: {OPEN: 1, CLOSING: 2, CLOSED: 3},
  crypto: {getRandomValues: value => crypto.webcrypto.getRandomValues(value), subtle: {
    async digest(algorithm, data) {
      stats.digests++;
      return algorithm === 'MD5' ? Uint8Array.from(crypto.createHash('md5').update(data).digest()).buffer
        : crypto.webcrypto.subtle.digest(algorithm, data);
    },
  }},
  fetch() { throw new Error('Unexpected external request'); },
});
vm.runInContext(fs.readFileSync('_worker.js', 'utf8').replace('export default {', 'globalThis.worker = {') +
  '\nglobalThis.api = {创建Grain收纳器, 创建下行Grain发送器, 桥接下行数据流};', context);
const api = context.api;
const env = {ADMIN: 'test-only-password', KEY: 'test-only-key'};
const explicitUuid = '12345678-1234-4123-8123-123456789abc';
context.处理WS请求 = async (_request, uuid) => new Response(uuid);
async function identify(bindings) {
  const request = new Request('https://test.invalid/channel', {headers: {Upgrade: 'websocket'}});
  request.cf = {colo: 'HKG', asn: 64512, country: 'CN'};
  return (await context.worker.fetch(request, bindings, {})).text();
}
function legacyUuid(bindings) {
  const md5 = text => crypto.createHash('md5').update(text).digest('hex');
  const digest = md5(md5(bindings.ADMIN + bindings.KEY).slice(7, 27));
  return [digest.slice(0, 8), digest.slice(8, 12), '4' + digest.slice(13, 16),
    '8' + digest.slice(17, 20), digest.slice(20)].join('-');
}
function socket() {
  return {readyState: 1, sent: [], close() {this.readyState = 3;},
    send(data) {return new Promise(resolve => setImmediate(() => {this.sent.push(Buffer.from(data));resolve();}));}};
}

(async () => {
  assert.equal(await identify(env), legacyUuid(env));
  assert.equal(stats.digests, 2);
  stats.digests = 0;
  assert.equal(await identify(env), legacyUuid(env));
  assert.equal(stats.digests, 0, 'Warm fixed credentials must not repeat the two digests');
  assert.equal(await identify({...env, UUID: explicitUuid.toUpperCase()}), explicitUuid);
  assert.equal(stats.digests, 0, 'An explicit valid UUID does not require credential derivation');
  assert.equal(await identify({...env, UUID: 'invalid'}), legacyUuid(env));
  assert.equal(stats.digests, 0, 'An invalid explicit UUID keeps the legacy derived identity');
  for (const changed of [{...env, ADMIN: 'changed-password'}, {...env, KEY: 'changed-key'}, env]) {
    stats.digests = 0;
    assert.equal(await identify(changed), legacyUuid(changed));
    assert.equal(stats.digests, 2, 'Changed credential material must be re-derived');
  }
  const originalDigest = context.crypto.subtle.digest;
  let fail = true;
  context.crypto.subtle.digest = async (...args) => {
    if (fail) {fail = false; throw new Error('test-only digest failure');}
    return originalDigest(...args);
  };
  const retryEnv = {...env, ADMIN: 'retry-password'};
  await assert.rejects(identify(retryEnv), /test-only digest failure/);
  stats.digests = 0;
  assert.equal(await identify(env), legacyUuid(env));
  assert.equal(stats.digests, 0, 'A failed derivation must not replace the previous completed identity');
  assert.equal(await identify(retryEnv), legacyUuid(retryEnv));
  assert.equal(stats.digests, 2, 'A failed derivation must be retried');
  context.crypto.subtle.digest = originalDigest;
  const identities = await Promise.all([identify(env), identify(retryEnv), identify({...env, UUID: explicitUuid})]);
  assert.deepEqual(identities, [legacyUuid(env), legacyUuid(retryEnv), explicitUuid]);
  const concurrent = [{...env, ADMIN: 'concurrent-one'}, {...env, ADMIN: 'concurrent-two'}];
  assert.deepEqual(await Promise.all(concurrent.map(identify)), concurrent.map(legacyUuid));

  const grain = api.创建Grain收纳器(16, true);
  const items = [1, 2, 3, 4].map(n => ({chunk: new CheckedBytes(4).fill(n)}));
  for (const item of items) grain.收纳(item);
  stats.copiedBytes = stats.slices = 0;
  const first = grain.合包();
  assert.deepEqual(Buffer.from(first.chunk), Buffer.from([1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4]));
  assert.equal(stats.copiedBytes, 16);
  assert.equal(stats.slices, 0, 'An owned merged result must be built once, without copying it again');
  assert.deepEqual([...first.items], items);
  const snapshot = Buffer.from(first.chunk);
  grain.收纳({chunk: new CheckedBytes(4).fill(9)});
  grain.收纳({chunk: new CheckedBytes(4).fill(8)});
  assert.equal(grain.合包().chunk.byteLength, 8);
  assert.deepEqual(Buffer.from(first.chunk), snapshot, 'A later merge must not overwrite a pending send');
  const oversize = new CheckedBytes(24).fill(6);
  grain.收纳({chunk: oversize});
  assert.equal(grain.合包().chunk, oversize);
  assert.equal(grain.为空, true);
  assert.equal(grain.字节数, 0);
  for (const owned of [false, true]) {
    const queue = api.创建Grain收纳器(32, owned), expected = [], output = [];
    for (let i=1; i<=256; i++) {
      const chunk = new CheckedBytes((i*17)%49+1).fill(i%251);
      expected.push(Buffer.from(chunk));queue.收纳({chunk});
      while (queue.字节数 >= 32) output.push(Buffer.from(queue.合包().chunk));
    }
    while (!queue.为空) output.push(Buffer.from(queue.合包().chunk));
    assert.deepEqual(Buffer.concat(output), Buffer.concat(expected));
  }

  const ws = socket(), sender = api.创建下行Grain发送器(ws, Uint8Array.of(0, 0));
  const chunks = [new Uint8Array(4096).fill(1), new Uint8Array(4096).fill(2), new Uint8Array(32768).fill(3)];
  await sender.发送(chunks[0]);await sender.发送(chunks[1]);await sender.flush();
  await sender.直接发送(chunks[2]);await sender.停止并刷新();
  assert.deepEqual(Buffer.concat(ws.sent), Buffer.concat([Buffer.from([0,0]), ...chunks.map(x=>Buffer.from(x))]));

  const payload = Uint8Array.from({length: 300000}, (_, i) => i%251);
  let offset = 0, pull = 0, remoteClosed = false;
  const readable = new ReadableStream({type: 'bytes', pull(controller) {
    const request = controller.byobRequest;
    const count = Math.min(request.view.byteLength, [4096,16000,65536][pull++%3], payload.length-offset);
    new Uint8Array(request.view.buffer, request.view.byteOffset, count).set(payload.subarray(offset,offset+count));
    offset += count;request.respond(count);
    if (offset === payload.length) controller.close();
  }});
  const byobWs = socket();
  await api.桥接下行数据流({readable, closed: Promise.resolve(), close(){remoteClosed=true;}}, byobWs, Uint8Array.of(0,0), null);
  assert.deepEqual(Buffer.concat(byobWs.sent), Buffer.concat([Buffer.from([0,0]),Buffer.from(payload)]));
  assert.equal(remoteClosed, true);
  assert.equal(byobWs.readyState, 3);
  console.log('PASS: fixed identity reuse/invalidation/failure/concurrency, owned merge copy budget and byte order, async sends and BYOB buffer lifetime. No network requests.');
})().catch(error => {console.error(error); process.exitCode=1;});
