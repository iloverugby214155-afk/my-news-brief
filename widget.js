// マイ・ニュースブリーフ — Scriptable ウィジェット
// 小・中・大のどのサイズでも使えます。タップするとニュースページが開きます。
// 毎朝7時ごろに更新されるデータ（GitHub上の news.json）を読みます。

const DATA_URL = "https://raw.githubusercontent.com/iloverugby214155-afk/my-news-brief/main/news.json";
const PAGE_URL = "https://claude.ai/artifact/JexwF1HzfYaMYAbrjYzt3W";

// ---- 色（ライト / ダーク）----
const C = {
  bg:     Color.dynamic(new Color("#f7f7f4"), new Color("#18181b")),
  ink:    Color.dynamic(new Color("#1c1c1e"), new Color("#f2f2f2")),
  sub:    Color.dynamic(new Color("#6e6e73"), new Color("#a1a1a8")),
  accent: Color.dynamic(new Color("#35577a"), new Color("#9dbbe0")),
  up:     Color.dynamic(new Color("#15803d"), new Color("#4ade80")),
  down:   Color.dynamic(new Color("#b91c1c"), new Color("#f87171")),
  line:   Color.dynamic(new Color("#e3e3de"), new Color("#2c2c30")),
};

// ---- データ取得（失敗したら前回の保存分を使う）----
async function loadData() {
  const fm = FileManager.local();
  const cachePath = fm.joinPath(fm.cacheDirectory(), "my-news-brief.json");
  try {
    const req = new Request(DATA_URL + "?t=" + Date.now());
    req.timeoutInterval = 15;
    const data = await req.loadJSON();
    if (data && data.items) {
      fm.writeString(cachePath, JSON.stringify(data));
      return { data, stale: false };
    }
  } catch (e) {}
  if (fm.fileExists(cachePath)) {
    return { data: JSON.parse(fm.readString(cachePath)), stale: true };
  }
  return { data: null, stale: true };
}

function text(stack, str, size, color, weight = "regular", lines = 1) {
  const t = stack.addText(str);
  t.font = weight === "bold" ? Font.boldSystemFont(size)
         : weight === "semibold" ? Font.semiboldSystemFont(size)
         : Font.systemFont(size);
  t.textColor = color;
  t.lineLimit = lines;
  t.minimumScaleFactor = 0.85;
  return t;
}

function header(w, d, stale, compact) {
  const h = w.addStack();
  h.centerAlignContent();
  text(h, "ニュースブリーフ", compact ? 11 : 12, C.accent, "bold");
  h.addSpacer();
  const md = (d.date || "").slice(5).replace("-", "/");
  text(h, md + (stale ? " ・前回分" : ""), 11, C.sub);
}

function marketRow(w, markets, count) {
  const row = w.addStack();
  row.spacing = 10;
  markets.slice(0, count).forEach((m) => {
    const s = row.addStack();
    s.layoutVertically();
    text(s, m.name, 10, C.sub);
    text(s, m.value, 14, C.ink, "bold");
    const arrow = m.dir > 0 ? "▲" : m.dir < 0 ? "▼" : "";
    // 変化率だけ短く表示（"(+2.87%)" → "+2.87%"）
    const pct = (m.chg.match(/[+−-]?\d+(\.\d+)?%/) || [m.chg])[0];
    text(s, arrow + pct, 10, m.dir > 0 ? C.up : m.dir < 0 ? C.down : C.sub, "semibold");
  });
}

function pickItems(d, n) {
  const byId = Object.fromEntries(d.items.map((i) => [i.id, i]));
  const picked = (d.picks || []).map((id) => byId[id]).filter(Boolean);
  const rest = d.items.filter((i) => !picked.includes(i)).sort((a, b) => b.imp - a.imp);
  return picked.concat(rest).slice(0, n);
}

function itemRow(w, item, showSummary) {
  const s = w.addStack();
  s.layoutVertically();
  if (item.url) s.url = item.url;
  text(s, item.cat, 10, C.accent, "bold");
  text(s, item.title, 13, C.ink, "semibold", 2);
  if (showSummary) text(s, item.summary, 11, C.sub, "regular", 2);
}

async function build() {
  const { data: d, stale } = await loadData();
  const w = new ListWidget();
  w.backgroundColor = C.bg;
  w.url = PAGE_URL;
  w.refreshAfterDate = new Date(Date.now() + 60 * 60 * 1000); // 1時間ごとに見直す

  const family = config.widgetFamily || "large";

  if (!d) {
    w.setPadding(14, 14, 14, 14);
    text(w, "ニュースブリーフ", 12, C.accent, "bold");
    w.addSpacer(6);
    text(w, "データを読み込めませんでした。通信状況を確認してください。", 12, C.sub, "regular", 4);
    return w;
  }

  if (family === "small") {
    w.setPadding(12, 12, 12, 12);
    header(w, d, stale, true);
    w.addSpacer(6);
    const top = pickItems(d, 1)[0];
    if (top) {
      text(w, top.cat, 10, C.accent, "bold");
      text(w, top.title, 13, C.ink, "semibold", 4);
    }
    w.addSpacer();
    const m = (d.markets || [])[0];
    if (m) {
      const r = w.addStack(); r.centerAlignContent();
      text(r, m.name + " ", 10, C.sub);
      text(r, m.value, 11, C.ink, "bold");
    }
    return w;
  }

  if (family === "medium") {
    w.setPadding(12, 14, 12, 14);
    header(w, d, stale, false);
    w.addSpacer(6);
    (d.headline || []).slice(0, 3).forEach((h, i) => {
      const r = w.addStack();
      r.spacing = 6;
      text(r, String(i + 1), 12, C.accent, "bold");
      text(r, h, 12, C.ink, "regular", 2);
      w.addSpacer(3);
    });
    w.addSpacer();
    marketRow(w, d.markets || [], 4);
    return w;
  }

  // large / extraLarge
  w.setPadding(14, 16, 14, 16);
  header(w, d, stale, false);
  w.addSpacer(8);
  marketRow(w, d.markets || [], 4);
  w.addSpacer(8);
  const line = w.addStack(); line.size = new Size(0, 1); line.backgroundColor = C.line; line.addSpacer();
  w.addSpacer(8);
  text(w, "あなたへのおすすめ", 11, C.sub, "bold");
  w.addSpacer(4);
  const items = pickItems(d, family === "extraLarge" ? 6 : 4);
  items.forEach((it, i) => {
    itemRow(w, it, family === "extraLarge");
    if (i < items.length - 1) w.addSpacer(7);
  });
  w.addSpacer();
  return w;
}

const widget = await build();
if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  await widget.presentLarge(); // アプリ内で実行したときのプレビュー
}
Script.complete();
