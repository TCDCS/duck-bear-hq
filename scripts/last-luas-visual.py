from pathlib import Path
import json
import os
from playwright.sync_api import sync_playwright

BASE = os.environ.get("LAST_LUAS_URL", "http://127.0.0.1:4173/games/last-luas/")
OUT = Path(os.environ.get("LAST_LUAS_OUT", "/tmp/last-luas-real-characters"))
OUT.mkdir(parents=True, exist_ok=True)

SHOTS = [
    ("model-axis-check", 0, 1280, 720, "modelcheck=1"),
    ("player", 12, 1280, 720, ""),
    ("tourist", 60, 1280, 720, ""),
    ("cyclist", 72, 1280, 720, ""),
    ("umbrella", 102, 1280, 720, ""),
    ("delivery", 148, 1280, 720, ""),
    ("mobile-umbrella", 102, 844, 390, ""),
]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    report = []
    for name, distance, width, height, extra in SHOTS:
        page = browser.new_page(viewport={"width": width, "height": height})
        messages = []
        page.on("console", lambda msg, messages=messages: messages.append(f"{msg.type}: {msg.text}"))
        page.on("pageerror", lambda err, messages=messages: messages.append(f"pageerror: {err}"))
        suffix = f"&{extra}" if extra else ""
        url = f"{BASE}?smoke=1&distance={distance}{suffix}"
        page.goto(url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_function(
            """() => document.documentElement.dataset.lastLuasReady === '1'
                   || document.documentElement.dataset.lastLuasAssetError === '1'""",
            timeout=45000,
        )
        data = page.evaluate("""() => ({...document.documentElement.dataset})""")
        if data.get("lastLuasAssetError") == "1":
            print(json.dumps({"url": url, "dataset": data, "console": messages}, indent=2))
            page.screenshot(path=str(OUT / f"{name}-asset-error.png"), full_page=True)
            raise RuntimeError("Last Luas character assets failed to load")
        if data.get("lastLuasBuild") != "0.4.0" or data.get("lastLuasCharacterAssets") != "2":
            print(json.dumps({"url": url, "dataset": data, "console": messages}, indent=2))
            raise RuntimeError("Last Luas readiness metadata is incorrect")
        page.wait_for_timeout(900)
        page.screenshot(path=str(OUT / f"{name}.png"))
        report.append({"name": name, "distance": distance, "viewport": [width, height], "dataset": data, "console": messages})
        page.close()
    browser.close()

(OUT / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
print(json.dumps({"shots": [x[0] for x in SHOTS], "count": len(SHOTS)}, indent=2))
