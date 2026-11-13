# Arkib SPM — 维护说明

整理 SPM 资源链接的静态网站。所有资料都是**链接**到原作者公开分享的文件（主要是 Google Drive），本站不存放任何文件。

## 目录结构

| 路径 | 用途 |
|---|---|
| `site/` | **要上传的网站**（静态 HTML，可放 Netlify / Vercel / Cloudflare Pages / 任何主机） |
| `scripts/update.py` | **一键更新**：重新抓取 → 对比变化 → 重新生成网站 |
| `scripts/build.py` | 生成网站；顶部可改 `SITE_URL`（域名）和 `SITE_NAME`（网站名） |
| `scripts/extract.py` | 从抓到的网页提取链接 |
| `scripts/style.css`, `scripts/app.js` | 网站样式和搜索/筛选功能 |
| `data/pages.json` | 提取好的全部链接数据 |
| `data/raw*/` | 上次抓取的网页缓存 |
| `data/changes-日期.txt` | 每次更新的变化报告（新增 / 消失的链接） |

## 平时怎么更新（包括 2027、2028……）

```bash
python3 scripts/update.py
```

大约 6 分钟（每秒只请求 1 页，对原网站友好）。完成后把 `site/` 整个文件夹上传覆盖即可。

**不需要改任何代码**，新年份会自动出现：
- 新页面会自动发现：每次都会重新读取 Bumi Gemilang 的 SPM 总页，找出所有 SPM 子页面。
- 年份会自动识别：链接标题里出现 "2027" 就会归到 2027，并自动生成 `/soalan-percubaan-spm-2027/` 页面。首页、导航栏和搜索框例子也会自动换成最新年份。
- sitemap、llms.txt、FAQ 里的年份范围也会自动更新。

### 建议频率
- **7 月 – 10 月（percubaan 高峰期）**：每周更新 1–2 次。
- **其他月份**：每月一次就够。

## 每次更新后检查 3 件事

1. **看终端输出的 `+新增 / -消失` 数字。**如果出现 ⚠「超过 30% 链接消失」，表示原网站可能改版了，先不要上传，叫我（或开发者）调整 `extract.py`。
2. **打开 `data/changes-日期.txt`**，快速看新增的是不是合理。
3. **本地预览**：

   ```bash
   python3 -m http.server 8765 -d site
   ```

   然后打开 http://localhost:8765 看一下最新年份页面。

## 可能需要手动调整的情况

| 情况 | 改哪里 |
|---|---|
| 出现新科目（例如新开的 SPM 科目） | `build.py` 里的 `SUBJECTS` 列表加一行（slug、名称、英文名、类别、匹配关键词） |
| 新的州属 / 机构名称没被识别（筛选下拉没有它） | `build.py` 里的 `STATES` / `STATE_ALIASES` |
| 某类资料被分错类（例如笔记被当成试卷） | `build.py` 里的 `classify()` 关键词 |
| Bumi Gemilang 换了总页网址 | `update.py` 顶部的 `HUB` |
| 换域名 / 网站名 | `build.py` 顶部的 `SITE_URL`、`SITE_NAME` |

## 可选：全自动更新

把这个文件夹放到 GitHub，再用 GitHub Actions 每周自动跑 `python3 scripts/update.py`，然后自动部署到 Netlify 或 Cloudflare Pages。这样就完全不用手动操作，只需偶尔看一下变化报告。

## SEO 小提醒

- 上线后到 **Google Search Console** 提交 `https://你的域名/sitemap.xml`。
- 每次更新后 sitemap 的 `lastmod` 会自动变成当天日期，Google 会更快重新抓取。

## 设置（只改 `config.json`）

| 字段 | 说明 |
|---|---|
| `site_url` | 你的域名，例如 `https://spmtrial.com` |
| `site_name` | 网站名称 |
| `contact_email` | 联系邮箱（AdSense 审核需要；可用 Cloudflare 免费 Email Routing 转发到你的 Gmail） |
| `adsense_client` | AdSense 发布商 ID，例如 `ca-pub-1234567890123456`。填了之后会自动加上 AdSense 代码和 `ads.txt` |
| `ad_slots` | （可选）在 AdSense 后台建立的广告单元 ID。不填就只用 Auto Ads（Google 自动放广告） |

## 广告位置（每页最多 6 个 + 底部 1 个）

| 位置 | 出现在 |
|---|---|
| `top` | 标题和筛选栏下面（最多人看到） |
| `infeed` | 最新年份列表的第 12 行之后（混在内容中，点击率高） |
| `incontent` | 每个大区块之间（每科页面的各部分之间、年份页面每 4 科之间） |
| `bottom` | FAQ 之前 |

想在本地预览广告位置（灰色框）：

```bash
AD_PREVIEW=1 python3 scripts/build.py
```

## 支持 QR 码 + 广告位（后台“❤️ Sokongan & Iklan”）
- 打开 https://spmtrial.com/admin/#iklan（只有 sgece88@gmail.com 能登入）。
- **支持 QR**：上传 QR 图 → 改标题/文字 → 按“Simpan & terbitkan”。每页顶部出现一条“Sokong SPMTrial”，页尾有大 QR 卡；没上传 QR 就不显示。
- **广告**：按“+ Tambah iklan” → 上传图片（建议 1200×300）→ 填点击后要去的网址 → 选显示在哪里（全部 / 主页 / 某科目）→ 保存。
- 没有广告时，可显示“Ruang iklan”空位（点了会发邮件给你），方便大学/补习中心联系。
- 改完约 1 分钟生效，不需要重新建站。图片存在 Cloudflare KV。

## 自己的试卷（后台“➕ Kertas sendiri”）
- 打开 https://spmtrial.com/admin/#sendiri → “+ Tambah kertas”。
- 选科目、类型（默认 Soalan Percubaan）、年份（可以是 2027 等新年份）、州属，填显示名称。
- 每个按钮：名称（Kertas 1 / Jawapan K1…）+ 自己 Google Drive 的分享链接（要设成“Anyone with the link”）。
- 按 “Simpan & terbitkan”：约 1 分钟后科目页直接显示；下次自动建站（每周一，或推送代码时）会正式写进年份页、搜索和 sitemap，新的年份（例如 Trial SPM 2027 页）也会自动生成。
- 名称以 Kertas/Soalan 开头 = 蓝色试卷按钮；以 Jawapan/Skema 开头 = 绿色答案按钮；其他 = 灰色资料按钮。
- 之后这些行也会出现在 Allite Quiz 页，可以加 Allite K1/K2 按钮。
