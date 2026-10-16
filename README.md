# 加号的知识牌桌

只为加号制作的温暖手机卡牌学习游戏，使用用户指定的《科一文化素养200常识》。

## 在线游玩

GitHub Pages 预期地址为 https://weiruijiao0.github.io/jiahao-knowledge-card-table/ ，请以 Actions 成功后的实际部署地址为准。公开源码不等于已经通过中国大陆网络或真实iPhone验收；这些项目仍需实测。

- 完整30关、200个原始编号，五种卡牌交互。
- 直接发牌做题，选牌后显示解释；没有倒计时、失败惩罚、广告、付费或登录。
- 十姿态Q版陪伴角色、本地声音与可选音乐、星星与通关奖励。
- 独立间隔复习、错题优先、本地自动存档、导出与导入、首次缓存后离线。
- 支持手机竖屏与安全区；小屏和本地WebKit有自动化检查，真实iPhone/微信和大陆普通网络仍待验收。

## 本地开发

需要 Node 24。运行 npm ci、npm test、npm run build，再执行 node scripts/serve.mjs。
更新可选公开源码下载时，先运行 python scripts/package-source.py，再构建。
仓库 main 分支的 .github/workflows/pages.yml 自动验证、构建和发布；详见 [GitHub发布说明](docs/github.md)。

题库见 src/data/knowledge.json，关卡见 src/data/levels.json，逐条对应见 [覆盖报告](docs/coverage.md)，资料校订见 [原文审阅](docs/source-audit.md)。原资料含重复与存疑项，保留编号与原文，不冒充2027官方考纲。

## 许可

原创程序采用 [MIT](LICENSE)；原资料文字、生成素材与第三方依赖边界见 [NOTICE](NOTICE.md) 和 [第三方说明](docs/third-party.md)。原始用户PDF、参考图片、玩家存档和发布凭据没有进入仓库。
