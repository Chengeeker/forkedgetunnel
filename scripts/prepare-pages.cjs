// Chengeeker, 2026-11-03. GPL-2.0; see ../LICENSE.
const 文件 = require('node:fs/promises'), 路径 = require('node:path');
async function 准备Pages(根目录 = 路径.resolve(__dirname, '..')) {
  const 输出目录 = 路径.join(根目录, 'dist');
  await 文件.mkdir(输出目录, {recursive: true});
  for (const 名称 of ['_worker.js', 'admin', 'login', 'noADMIN', 'noKV', 'cdn-cgi']) {
    await 文件.cp(路径.join(根目录, 名称), 路径.join(输出目录, 名称), {recursive: true});
  }
  console.log('Pages 运行资源已准备到 dist；配置存储在首次使用时初始化。');
}
module.exports = {准备Pages};
if (require.main === module) 准备Pages().catch(() => { console.error('Pages 运行资源复制失败。'); process.exitCode = 1; });
