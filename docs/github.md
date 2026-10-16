# GitHub 开源与 Pages 发布

本游戏可以开源到全新的 GitHub 公开仓库，也可以从同一仓库构建 GitHub Pages 游戏网页。GitHub 源码页面用于阅读和下载代码；GitHub Pages 的 HTTPS 网址用于直接玩游戏。技术上适用本项目的纯静态架构，无需服务器、数据库或在线AI。

## 发布到本游戏的新仓库

1. 在自己的 GitHub 账号下新建 Public 空仓库，例如 jiahao-knowledge-card-table。不要放入其他项目的仓库。
2. 将项目内容放在仓库根目录，根目录应同时看到 package.json、src、public、LICENSE 和 .github/workflows/pages.yml。不要在外面再套一层文件夹。
3. 推送到 main 分支。Settings → Pages → Build and deployment → Source 选择 GitHub Actions；然后在 Actions 中运行 Build and publish Jiahao's card table。
4. 工作流安装锁定依赖，验证知识与关卡规则，生成可选源码下载，构建完整游戏并发布 dist。Actions 成功后，Environment / Settings → Pages 中显示的实际 HTTPS 地址才是游戏入口。
5. 用真实 iPhone Safari 与中国大陆普通网络测试。尚未创建目标仓库、完成账号授权或执行远程工作流，因此不能把配置准备完成视为已经发布，也不能宣称大陆可达。

常见地址形态为 https://你的用户名.github.io/仓库名/ 。项目使用相对资源路径，已验证在独立子目录下加载、作答与离线刷新；不需要为某个账号写死路径。

工作流使用 GitHub 原生 GITHUB_TOKEN，不需要把个人 Token 写进代码。账号登录和授权应在官方页面完成，不要把密码或访问令牌发到聊天中。

## 公开内容边界

发布源码、关卡题库、成品美术音频、原创程序MIT许可证、第三方许可和测试脚本。不发布其他项目、Sites身份文件、凭据、开发缓存或玩家存档。原始PDF和用户参考图片不在本项目源码目录中。

独立的 GitHub 上传包中已去除本地测试截图、站点运营记录、重复的构建文件和嵌套源码ZIP；工作流会在GitHub重新生成游戏构建和公开源码ZIP。

## 中国大陆使用目标

当前 chatgpt.site 入口已被用户手机截图证实受到托管安全层拦截，该入口不作为大陆手机验收通过。GitHub Pages 是另一个托管入口，但尚未在用户网络实测；不能仅凭换平台承诺它解决大陆访问问题。

可以先免费发布 GitHub Pages 试开，若不能稳定访问，则保留GitHub作为开源仓库，将同一静态构建部署到已获授权的独立大陆托管与自有域名。大陆长期托管与备案步骤见 deployment.md。

官方依据：

- https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- https://vite.dev/guide/static-deploy.html#github-pages
