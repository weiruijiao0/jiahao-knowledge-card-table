# 部署说明

## 本次公开网页

本游戏使用独立的新 Sites 站点，配置为任何持有链接的人均可访问，不需要登录 ChatGPT。正式上线结果与网址见交付的 docs/publication.md。没有借用其他用户项目的代码、数据、存储或托管空间，也没有购买域名、付费服务或开通外部账户。

Sites 自带 HTTPS 地址，可先让加号直接用 Safari 打开。此入口没有经过中国大陆普通网络或真实iPhone的实测；不能将托管平台报告成功、开发机的HTTP成功或WebKit模拟等同于大陆访问验收。如他的网络不能直开，使用下方的大陆托管方案。

## 可迁移的静态网站

`dist/` 是完整静态网站，部署包解压后首页应直接位于根目录。无需后端、数据库、登录或在线AI。核心图片、音效、音乐、题库和代码全部同站加载；公开源码ZIP是可选下载，不进入核心离线预缓存。

`index.html`、`sw.js` 和 `assets/` 结构必须保留。`open-source.html`、`source/`、`LICENSE.txt` 与 `THIRD-PARTY-NOTICES.txt` 用于公开源码和许可。不要上传开发缓存、玩家导出存档、用户原始参考图或任何密钥。

## 以大陆长期使用为目标的方案

如果需要自主管理、面向大陆网络的长期入口，建议新建腾讯云 CloudBase 静态托管项目，绑定自己的域名与HTTPS，按服务商要求完成ICP备案。发布者需要腾讯云账号及必要的实名认证；加号作为玩家只需打开游戏链接，无需云账号。域名、套餐或使用量可能产生费用，购买前应由用户确认。

不能把默认测试域名当作长期地址：CloudBase官方将其定位为开发测试；EdgeOne Pages官方说明，其默认域名在部分加速区域对大陆请求返回401，其他区域预览链接有3小时期限。因此不把这些默认地址作为本游戏的大陆稳定方案。

官方参考：

- [CloudBase静态托管控制台](https://console.cloud.tencent.com/tcb/hosting)
- [静态网站托管操作指南](https://cloud.tencent.cn/document/product/876/46900)
- [CloudBase自定义域名与备案](https://cloudbase.cloud.tencent.com/blog/2026/07/24/custom-domain)
- [EdgeOne Pages域名和加速区域说明](https://edgeone.cloud.tencent.com/pages/document/175191784523485184)

具体部署步骤：

1. 发布者在腾讯云开通全新的CloudBase环境与静态托管，不选择其他游戏或项目的环境。
2. 注册一个自己持有的域名，按当前服务要求完成实名和ICP备案；查看实际套餐与预计费用，再确认开通。
3. 在该新环境的静态网站托管页面上传 jiahao-deploy.zip 或 dist/ 内容。首页设为 index.html，保持文件名大小写与目录结构。
4. 在域名配置中添加自定义域名，按页面给出的记录值设置DNS。启用HTTPS证书与强制HTTPS，等待服务商确认生效。
5. index.html 与 sw.js 采用 Cache-Control: no-cache；带哈希JS/CSS可长缓存。固定名称的图片与音频更新时配合站点缓存刷新。
6. 检查MIME：JS为 text/javascript，CSS为 text/css，WAV为 audio/wav，WebP为 image/webp，SVG为 image/svg+xml。HTML应在线浏览，ZIP应下载。
7. 在加号的普通移动网络与Wi-Fi实测下面的流程，再把该HTTPS地址作为日常入口。

也可使用中国内地OSS静态托管加自定义域名。阿里云官方说明默认Bucket域名的HTML会触发下载，正常网页浏览需绑定域名；中国内地Bucket绑定域名须完成备案。[OSS静态网站托管](https://help.aliyun.com/zh/oss/user-guide/static-website-hosting/)、[OSS备案说明](https://help.aliyun.com/zh/icp-filing/basic-icp-service/product-overview/use-oss)。

已有全新Nginx站点时，可参考 deployment/nginx.conf.example，填入本游戏域名、站点目录和证书路径，再按服务器正常流程验证配置。游戏支持根目录或末尾带斜线的独立子目录，如 /jiahao/。

## 真实手机验收

使用加号自己的iPhone，分别在普通移动网络与Wi-Fi中打开正式HTTPS网址。先关闭VPN或代理，确认普通网络能够首访。轻触卡牌启用Safari音频；无需添加到主屏幕、安装App或描述文件。

检查角色、发牌、五种玩法、答错继续、音效与音乐独立开关、刷新与重新打开恢复、图鉴、独立复习、第30关奖励。首次完整缓存后断网刷新验证离线；从未访问该站时不能离线下载游戏。再在真实微信中验证核心操作。

记录手机型号、iOS和微信版本、运营商、日期、是否首访、加载表现及失败请求。本机测试和发布测试各自记录，未执行的项目保留“待实测”。

## 更新与存档

保留同一个域名、协议和存档键，可在更新后继续使用本地记录。迁移域名前，从设置导出存档，在新网址导入。先上传新资源，最后更新首页与 sw.js，避免用户请求到尚未上传的JS。

公开源码下载包由 python scripts/package-source.py 生成，再执行 npm run build。原始用户PDF、参考照片、站点凭据和玩家存档均不进入公开源码包。
