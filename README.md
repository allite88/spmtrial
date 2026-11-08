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
