#!/usr/bin/env python3
"""マイ・ニュースブリーフの1号分(JSON)から、ウィジェット用の news.json を作る。
使い方: python3 scripts/build_news_json.py edition.json [picks.json] > news.json
picks.json は「あなた向け」記事idの配列（任意）。個人の関心データそのものは含めない。"""
import json, sys
ed = json.load(open(sys.argv[1]))
picks = json.load(open(sys.argv[2])) if len(sys.argv) > 2 else []
items = []
for i in ed.get("items", []):
    src = (i.get("sources") or [{}])[0]
    items.append({
        "id": i["id"], "cat": i["cat"], "imp": i.get("imp", 1),
        "title": i["title"], "summary": i["summary"],
        "url": src.get("url", ""), "source": src.get("name", ""),
    })
ids = {x["id"] for x in items}
picks = [p for p in picks if p in ids]
if not picks:  # 指定がなければ重要度順の上位3本
    picks = [x["id"] for x in sorted(items, key=lambda x: -x["imp"])[:3]]
out = {
    "date": ed["date"], "label": ed.get("label", ed["date"]),
    "headline": ed.get("headline", []), "markets": ed.get("markets", []),
    "picks": picks, "items": items,
    "page": "https://claude.ai/artifact/JexwF1HzfYaMYAbrjYzt3W",
}
json.dump(out, sys.stdout, ensure_ascii=False, indent=1)
