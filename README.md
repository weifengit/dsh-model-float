# dsh-model-float

在 DSH 主界面挂一只可拖动的**鲸鱼娘浮动面板**，鼠标放上去就能看到白嫖模型
各厂商的接入状态、剩余积分与余额——不用再一次次点进
「设置 → Our Free Model → 白嫖模型接入」。

> A draggable whale-girl floating panel in the DeepSeek Harness web shell.
> Hover it and every free-model vendor shows up with its connection state and
> the credit it still has.

---

## 效果

| | |
|---|---|
| 浮动鲸鱼 | 挂在屏幕任意位置，可拖动，位置记在浏览器本地 |
| **功能圆环** | 悬停鲸鱼弹出一圈动作。**贴边自动裁成半圆、贴角裁成四分之一圆**，可见弧上均分 |
| **白嫖模型** | 圆环第一格：展开厂商表 |
| **一键锁屏** | 圆环第二格：全屏遮罩，含桌面时钟、天气、系统监控（CPU/内存/网速）、活跃对话 |
| **内存释放** | 圆环第三格：请宿主回收内存，结果以 toast 回报 |
| 厂商表 | 13 家渠道各自的接入状态 + 剩余积分/余额（按各家自己的单位） |
| 模型可用性 | 可展开每个模型的可用 / 地区限制 / 不可用 / 限流 |
| **总开关** | **一键把不可用厂商的模型从对话框的模型选择器里隐藏；开关状态固化在宿主上，重启也不丢** |

![面板](docs/screenshot.png)

## 数据来源

面板不新增任何后端接口，只读宿主机**已经在提供**的两个同源数据面：

| 数据面 | 回答的问题 |
|---|---|
| `GET /api/our-free-model/summary` | 免费通道现在有哪些模型？每个在本机**能不能用**？ |
| `POST /api/channel-pack` → `provider.status` | 每家厂商有多少模型、多少账号、启用了吗？ |
| `POST /api/channel-pack` → `credits.balances` | 每家厂商的账号**还剩多少**积分/余额？ |
| `POST /api/channel-pack` → `model.list` | 这家厂商哪些模型已经被隐藏了？ |

写入只有一个入口：

| 写入面 | 作用 |
|---|---|
| `POST /api/channel-pack` → `model.setDisabledMany` | 批量隐藏／恢复某厂商的模型 |

也就是说，面板显示的就是「白嫖模型接入」那一页的数据，只是把它压缩成一眼能看懂的
样子。要看更多（领积分、登录、模型黑名单），仍然是回设置页。

**依赖**：本插件需要 `dsh-our-free-model` 在场（它提供上面两个数据面）。缺了它，
面板会显示「读取失败」，其余部分照常工作。

## 清理模型选择器

模型选择器里塞了 600 多个条目（光是 Cline 一家就 475 个），翻起来很费劲。
面板因此有一个**总开关**（卡片右上角，原先「换个角落」的位置）：

- **开**：把所有不可用厂商的模型从模型选择器里隐藏，列表里也不再出现这些厂商；
- **关**：把开关藏起来的模型原样放回去。

本机实测：模型选择器从 **620 个条目降到 81 个**，列表从 13 家变成 5 家。

### 状态固化在宿主上

开关的状态（开/关，以及它藏了哪些模型）存在**宿主**的
`~/.dsh/model-float/switch.json`，通过 `GET/POST /api/model-float/switch`
读写。

放宿主而不是浏览器的 `localStorage`，是因为它要跟黑名单一起活着：黑名单在
宿主上，如果开关状态只在浏览器里，那么**重启 DSH 之后**会变成「模型还藏着的，
但开关显示是关的」——一个用户既解释不了也撤销不了的状态。

实测：刷新页面、重启 DSH 之后，开关都保持原样。

### 已下线的渠道

升级 our-free-model 之后，某些渠道可能被上游**整体移除**（2.5.8 移除了 WorkBuddy
国内/国际版，2.5.9 又移除了华为 CodeArts）。这类渠道对任何 RPC 都回
`provider-retired`。

面板的处理是**直接把它们从列表里去掉**，而不是列成「未知」：

- 没人会去用一个已经下线的渠道，列出来只是噪音；
- 更要紧的是，开关会去「隐藏不可用厂商的模型」，而它读这些渠道的第一步就会抛错——
  一个下线的渠道足以让整个开关失灵。

开关本身也按厂商隔离了：某个厂商失败只跳过它，不会中止整次操作；关方向遇到已
下线的渠道则把它从记录里剔除，不让它每次都被重试。

### 什么算「不可用」

只有两种情况会被自动隐藏：

1. **厂商没接上**——已关闭、未登录、或根本没有账号；
2. **厂商接上了但没额度**——余额 ≤ 0。

**余额查不出来的不算**。那是个「不知道」，不是「用不了」——按未知去隐藏，
会把能用的模型也弄没了。所以 LobsterAI 这种「查询失败」的情况会原样留着。

### 恢复的边界

黑名单是设置页和面板共用的：你在设置页手动关掉的模型，不该被开关的
「恢复」顺手打开。所以开关记了一份「自己藏过哪些」，恢复时只动这份。

这份记录可能和实际对不上（别的浏览器改过、设置页动过），所以恢复时只
打开**记录里、且当前确实还藏着**的那些——你手动打开过的模型不会被二次动。

## 安装

```bash
# 在 profile 目录里加一条 link 依赖
cd ~/.dsh/profiles/web
python3 - <<'PY'
import json, collections
p = 'package.json'
d = json.load(open(p), object_pairs_hook=collections.OrderedDict)
d['dependencies']['dsh-model-float'] = 'link:/absolute/path/to/modelfloat'
b = d['dsh']['profile']['bundles']
if 'dsh-model-float' not in b:
    b.insert(b.index('dsh-our-free-model') + 1, 'dsh-model-float')
json.dump(d, open(p, 'w'), indent=2, ensure_ascii=False)
open(p, 'a').write('\n')
PY
pnpm install
```

然后把本包挂进 profile 的 `bundles`（见上一步已写好的 `package.json`），重启
`dsh web`。开发中也可以用 `--patch` 临时挂载。

## 开发

```bash
pnpm install     # esbuild + react + typescript
pnpm build       # client/src → dist/client.js
pnpm check       # tsc --noEmit
```

产物 `dist/client.js` 必须是客户端模块系统认得的 **classic-script** 形态：

```js
window.__ModuleLoader__.load({ id: 'dsh-model-float', factory: require => { /* … */ } })
```

`react` / `react-dom` 走运行时模块表（平台种子），在 esbuild 里标为 external。

## 结构

```
src/index.js            插件入口（转出宿主半边）
src/host.js             宿主半边：开关状态的持久化 + 一个 JSON 路由
src/store.js            原子写的 JSON store（重启后仍在）
client/src/index.tsx    浏览器半边：注册 shell.overlay 槽位、轮询读数、总开关
client/src/float.tsx   浮标本体：装配圆环 + 卡片 + 锁屏，管拖拽与悬停
client/src/ring/       功能圆环：geometry.ts 可见弧/扇区命中，icons.tsx 线描图标
client/src/features/   每个功能一个独立模块
  free-model/          白嫖模型：厂商表、数据面、总开关、定位
  lockscreen/          锁屏遮罩：时钟、天气、系统监控、活跃对话
  system/              系统指标客户端（宿主采样，页面轮询）
client/src/whale.tsx   DeepSeek 官方鲸鱼标（逐字节取自 dsh-client-ui-primitives）
client/src/data.ts     数据面的读取与聚合 + 模型黑名单的读写
client/src/styles.ts   样式（只用 shell 的 --dsw-alias-* 主题变量）
scripts/build-client.mjs  esbuild 打包 + ModuleLoader 信封
scripts/check.mjs      自检（定位计算、产物形状、开关契约）
```

### 鲸鱼的几何

按钮的盒子**就是图形本身**（56 × 41，取自标志自身的 23.16 : 17.04），不是正方形。
正方形盒子套一个扁宽的标志，上下会留下空白，而那圈空白会被看成「离边界还有一段距离」——
即使位置已经是 0。

边距是 0：鲸鱼可以拖到视口左上角 (0,0)，也可以贴住右下边。默认落点留 12px 的呼吸位，
免得第一次出现在窗口角落时像是渲染错了。

### 宿主半边为什么不是空的

总开关的状态必须活过 **DSH 重启**，所以它不能只存在浏览器里：它镜像的
黑名单在宿主上，浏览器本地状态在重启后会变成「模型还藏着的，开关却显示关的」。

宿主半边因此持有一份 `~/.dsh/model-float/switch.json`，并通过
`GET/POST /api/model-float/switch` 暴露给浏览器。

## 交互细节

- **拖动**：按住鲸鱼娘拖到任意位置，松手即固定；位置存 `localStorage`，刷新后还在。
  位置会被夹在视口内，换了屏幕尺寸也不会把鲸鱼弄丢。
- **拖动**：按住鲸鱼拖到任意位置，**可以真正贴边**——不留保留边距，左上能到 0,0，右下能到视口减自身尺寸。位置记在浏览器本地，刷新与重启都在。
- **悬停**：移上去 140ms 后展开圆环，离开 320ms 后收起。**鲸鱼、圆环、卡片都算悬停区**：
  指针从鲸鱼移到圆环或卡片、停在卡片里的开关上，都不会把面板关掉。
- **圆环只高亮，点击才执行**：悬停到扇区只是高亮，避免鼠标路过就跑了一个耗时操作。
- **圆环贴边自动裁切**：贴左边时半圆朝**右**延展，贴上边时朝**下**，
  四个角则朝对角方向（左上角 → 右下）。扇区沿**可见弧**均分，不会被画到屏幕外。
- **点击外部关闭**：白嫖模型面板展开后，点页面任意处（含插件 iframe 内的预览）即关闭。
  键盘 `Tab` 聚焦鲸鱼娘也会展开，`Esc` 收起。
- **点击**：点一下切换开合（触屏与不方便悬停的场景）。
- **刷新**：卡片右上角的 `⟳` 立刻重读一次；平时每 90 秒自动读一次，页面切回前台时也会读。
- **总开关**：卡片右上角的开关，一键隐藏/恢复所有不可用厂商的模型。

## 已知限制

- 余额是**逐账号顺序**向上游查的（Channel Pack 的既有约定，避免并发触发风控），
  所以 13 家厂商的首次读数可能要几秒；卡片会先把已知的数据显示出来。
- `WorkBuddy 国际版` 没有余额接口（上游不提供），面板如实写「无余额接口」，
  不会显示成 0——0 的语义是「已用光」，混淆会误导。
- 某些厂商（如 LobsterAI）查不到余额时显示「读取失败」并把原因放在行首的
  `title` 里，同样不显示成 0。

## Model Experience

无。面板是浏览器侧 UI，不注册任何面向模型的内容。

#### KV Cache 影响

无。这个插件不进入模型上下文，不改变任何 prompt、工具 schema 或请求体。

## 许可

MIT
