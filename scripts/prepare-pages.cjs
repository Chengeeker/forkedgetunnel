// Chengeeker, 2026-11-03. GPL-2.0; see ../LICENSE.
const 文件 = require('node:fs/promises');
const 路径 = require('node:path');

async function 准备Pages(环境 = process.env, 请求 = fetch, 根目录 = 路径.resolve(__dirname, '..')) {
  const 账号 = 环境.CLOUDFLARE_ACCOUNT_ID?.trim(), 令牌 = 环境.CLOUDFLARE_API_TOKEN?.trim();
  if (!/^[a-f0-9]{32}$/i.test(账号 || '') || !令牌) throw new Error('请在 Pages 构建环境中配置 CLOUDFLARE_ACCOUNT_ID 和加密的 CLOUDFLARE_API_TOKEN。');
  const 部署地址 = new URL(环境.CF_PAGES_URL || 'https://invalid.invalid');
  if (!部署地址.hostname.endsWith('.pages.dev')) throw new Error('缺少有效的 CF_PAGES_URL，请在 Pages Git 构建环境中运行。');
  const 项目名 = 部署地址.hostname.split('.').at(-3);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(项目名 || '') || !环境.CF_PAGES_BRANCH) throw new Error('无法确定 Pages 项目或构建分支。');

  async function 调用接口(端点, 方法 = 'GET', 数据) {
    let 响应, 内容;
    try {
      响应 = await 请求(`https://api.cloudflare.com/client/v4/accounts/${账号}${端点}`, {
        method: 方法, headers: {Authorization: `Bearer ${令牌}`, 'Content-Type': 'application/json'},
        body: 数据 === undefined ? undefined : JSON.stringify(数据), redirect: 'error', signal: AbortSignal.timeout(30000),
      });
      内容 = await 响应.json();
    } catch (_) { throw new Error('Cloudflare API 请求失败或返回无效数据，请检查网络及账号授权。'); }
    if (!响应.ok || 内容?.success !== true) {
      const 错误 = new Error(`Cloudflare API ${方法} 失败（HTTP ${响应.status}）；请检查 Pages 读取和 Workers KV 编辑权限。`);
      错误.重复名称 = Array.isArray(内容?.errors) && 内容.errors.some(项 => 项.code === 10014);
      throw 错误;
    }
    return 内容;
  }

  const 项目 = (await 调用接口(`/pages/projects/${项目名}`)).result;
  const 生产分支 = 项目?.production_branch || 项目?.source?.config?.production_branch;
  if (!生产分支 || 项目.name !== 项目名) throw new Error('Pages 项目信息不完整，已停止构建。');
  const 部署环境 = 环境.CF_PAGES_BRANCH === 生产分支 ? 'production' : 'preview';
  const 配置 = 项目.deployment_configs?.[部署环境];
  if (!配置) throw new Error(`无法读取 ${部署环境} 配置，已停止构建。`);
  // 此应用只使用 KV；额外资源不能因切换为文件配置而被静默移除。
  for (const 键 of ['d1_databases', 'r2_buckets', 'services', 'durable_object_namespaces', 'queues', 'queue_producers', 'analytics_engine_datasets', 'ai_bindings', 'hyperdrive_bindings', 'vectorize_bindings', 'browser']) {
    if (配置[键] && Object.keys(配置[键]).length) throw new Error(`当前项目包含额外绑定 ${键}，请先将其纳入部署配置，避免自动构建覆盖。`);
  }
  const 绑定 = {...配置.kv_namespaces};
  const 明文变量 = Object.entries(配置.env_vars || {}).filter(([键, 值]) => 键 !== 'CLOUDFLARE_API_TOKEN' && 值.type === 'plain_text');
  if (明文变量.some(([, 值]) => typeof 值.value !== 'string')) throw new Error('无法完整读取现有明文变量，已停止构建以保护配置。');
  const 标题 = `forkedgetunnel-${项目名}-${部署环境}-KV`;
  const 有效标识 = 值 => typeof 值 === 'string' && /^[a-f0-9]{32}$/i.test(值);
  async function 查找命名空间() {
    for (let 页码 = 1; ; 页码++) {
      const 列表 = await 调用接口(`/storage/kv/namespaces?per_page=100&page=${页码}`);
      if (!Array.isArray(列表.result)) throw new Error('KV 清单格式无效，已停止构建。');
      const 命中 = 列表.result.find(项 => 项.title === 标题);
      if (命中) return 命中.id;
      if (列表.result.length < 100 || 页码 >= 列表.result_info?.total_pages) return null;
    }
  }
  let 标识 = 绑定.KV?.namespace_id;
  if (Object.hasOwn(绑定, 'KV')) {
    if (!有效标识(标识)) throw new Error('现有 KV 绑定格式无效；不会自动替换原有数据。');
    const 原命名空间 = (await 调用接口(`/storage/kv/namespaces/${标识}`)).result;
    if (原命名空间?.id !== 标识) throw new Error('无法确认原 KV 命名空间，已停止构建以保护配置。');
  } else {
    标识 = await 查找命名空间();
    if (!标识) {
      try { 标识 = (await 调用接口('/storage/kv/namespaces', 'POST', {title: 标题})).result?.id; }
      catch (错误) {
        if (!错误.重复名称) throw 错误;
        标识 = await 查找命名空间();
      }
    }
    if (!有效标识(标识)) throw new Error('未取得有效的 KV 命名空间 ID，已停止构建。');
    绑定.KV = {namespace_id: 标识};
  }
  for (const 项 of Object.values(绑定)) if (!有效标识(项?.namespace_id)) throw new Error('现有 KV 绑定格式无效，已停止构建。');
  const 兼容日期 = 配置.compatibility_date || (await 文件.readFile(路径.join(根目录, 'wrangler.toml'), 'utf8')).match(/compatibility_date\s*=\s*"([0-9-]+)"/)?.[1];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(兼容日期 || '')) throw new Error('缺少有效的兼容日期，已停止构建。');
  const 部署配置 = [
    '# Generated during Pages build; do not commit account-specific configuration.',
    `name = ${JSON.stringify(项目名)}`, 'pages_build_output_dir = "./dist"',
    `compatibility_date = ${JSON.stringify(兼容日期)}`,
    `compatibility_flags = ${JSON.stringify(配置.compatibility_flags || [])}`,
    '[vars]', ...明文变量.map(([键, 值]) => `${JSON.stringify(键)} = ${JSON.stringify(值.value)}`),
    ...Object.entries(绑定).flatMap(([键, 值]) => ['[[kv_namespaces]]', `binding = ${JSON.stringify(键)}`, `id = ${JSON.stringify(值.namespace_id)}`]),
    '',
  ].join('\n');
  const 输出目录 = 路径.join(根目录, 'dist');
  await 文件.mkdir(输出目录, {recursive: true});
  // 只复制运行资源，构建令牌、生成配置、测试和开发记录不进入静态站点。
  for (const 名称 of ['_worker.js', 'admin', 'login', 'noADMIN', 'noKV', 'cdn-cgi']) {
    await 文件.cp(路径.join(根目录, 名称), 路径.join(输出目录, 名称), {recursive: true});
  }
  await 文件.writeFile(路径.join(根目录, 'wrangler.toml'), 部署配置, 'utf8');
  console.log(`Pages ${项目名}/${部署环境} 已准备 KV 绑定和 dist 资源。`);
  return {项目名, 部署环境, 标识};
}

module.exports = {准备Pages};
if (require.main === module) 准备Pages().catch(错误 => { console.error(错误.message); process.exitCode = 1; });
