# 来源与致谢

本仓库基于 [cmliu/edgetunnel](https://github.com/cmliu/edgetunnel) 修改，管理页面来源包含 [EDT-Pages/EDT-Pages.github.io](https://github.com/EDT-Pages/EDT-Pages.github.io)。后续修改见 [开发记录](./DEVELOPMENT.md)。来源记录不表示本 fork 已对外部项目、服务或全部客户端逐项验收，也不代表本仓库维护其演示站或提供相关服务。

## 上游历史引用清单

以下保留原 README 的代码及资料引用；部分链接为上游贡献记录或交流资料，具体归属以相应源码和许可证为准。

- [zizifn/edgetunnel](https://github.com/zizifn/edgetunnel)
- [3Kmfi6HP/EDtunnel](https://github.com/6Kmfi6HP/EDtunnel)
- [SHIJS1999/cloudflare-worker-vless-ip](https://github.com/SHIJS1999/cloudflare-worker-vless-ip)
- [Stanley-baby](https://github.com/Stanley-baby)
- [ACL4SSR](https://github.com/ACL4SSR/ACL4SSR/tree/master/Clash/config)
- [股神](https://t.me/CF_NAT/38889)
- [Workers/Pages Metrics](https://t.me/zhetengsha/3382)
- [白嫖哥](https://t.me/bestcfipas)
- [Mingyu](https://github.com/ymyuuu/workers-vless)
- [ToiCF/CF-Workers-HTTPS](https://github.com/ToiCF/CF-Workers-HTTPS)
- [ToiCF/CF-Workers-TURN](https://github.com/ToiCF/CF-Workers-TURN)
- [ToiCF/CF-Workers-SoftEther](https://github.com/ToiCF/CF-Workers-SoftEther)
- [eooce](https://github.com/eooce/Cloudflare-proxy)
- [Sukka](https://ip.skk.moe/)
- [zhangtaile](https://github.com/cmliu/edgetunnel/pull/999)
- [1345695](https://github.com/1345695/edcloudwasm)
- [ToiCF/GrainTCP](https://github.com/ToiCF/GrainTCP)
- [xream](https://github.com/cmliu/edgetunnel/pull/1359)

## 本 fork 新增组件与数据来源

- [PoemMisty/CFData-WEB](https://github.com/PoemMisty/CFData-WEB/tree/v1.8.5)：Windows 本地优选后端，独立组件的对应源码和许可证见 [local-cfdata](./local-cfdata/README.md)。
- [VPN Gate](https://www.vpngate.net/api/iphone/)：志愿者节点清单；链式思路参考 [byJoey/cfnew](https://github.com/byJoey/cfnew)，本 fork 未直接复制其实现。
- [Cloudflare 官方 IPv4](https://www.cloudflare.com/ips-v4) / [IPv6](https://www.cloudflare.com/ips-v6)：面板内置网段快照来源。

Worker 与网页使用 [GPL-2.0](./LICENSE)，独立本地组件使用 [GPL-3.0-or-later](./local-cfdata/LICENSE)。外部项目及服务仍遵循各自许可证和条款。
