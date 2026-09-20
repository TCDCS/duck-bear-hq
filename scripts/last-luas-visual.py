from pathlib import Path
import json
import os
from playwright.sync_api import sync_playwright

BASE = os.environ.get("LAST_LUAS_URL", "http://127.0.0.1:4173/games/last-luas/")
OUT = Path(os.environ.get("LAST_LUAS_OUT", "/tmp/last-luas-real-characters"))
OUT.mkdir(parents=True, exist_ok=True)

SHOTS = [
    {"name": "player", "query": "smoke=1&distance=18", "viewport": (1280, 720), "focus": None},
    {"name": "tourist", "query": "smoke=1&focus=tourist", "viewport": (1280, 720), "focus": "tourist"},
    {"name": "cyclist", "query": "smoke=1&focus=cyclist", "viewport": (1280, 720), "focus": "cyclist"},
    {"name": "umbrella", "query": "smoke=1&focus=umbrella", "viewport": (1280, 720), "focus": "umbrella"},
    {"name": "delivery", "query": "smoke=1&focus=delivery", "viewport": (1280, 720), "focus": "delivery"},
    {"name": "mobile-umbrella", "query": "smoke=1&focus=umbrella", "viewport": (844, 390), "focus": "umbrella"},
    {"name": "facade-arket", "query": "smoke=1&landmark=arket", "viewport": (1280, 720), "focus": None, "landmark": "arket"},
    {"name": "facade-hodges", "query": "smoke=1&landmark=hodges", "viewport": (1280, 720), "focus": None, "landmark": "hodges"},
    {"name": "facade-cafe", "query": "smoke=1&landmark=cafe", "viewport": (1280, 720), "focus": None, "landmark": "cafe"},
    {"name": "facade-dawson-lounge", "query": "smoke=1&landmark=dawson-lounge", "viewport": (1280, 720), "focus": None, "landmark": "dawson-lounge"},
    {"name": "facade-ria", "query": "smoke=1&landmark=ria", "viewport": (1280, 720), "focus": None, "landmark": "ria"},
    {"name": "facade-stanns", "query": "smoke=1&landmark=stanns", "viewport": (1280, 720), "focus": None, "landmark": "stanns"},
    {"name": "facade-ivy", "query": "smoke=1&landmark=ivy", "viewport": (1280, 720), "focus": None, "landmark": "ivy"},
]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1280, "height": 720})
    page = context.new_page()
    report = []

    for shot in SHOTS:
        name = shot["name"]
        width, height = shot["viewport"]
        page.set_viewport_size({"width": width, "height": height})
        console_messages = []
        page_errors = []

        def on_console(msg):
            console_messages.append(f"{msg.type}: {msg.text}")

        def on_error(err):
            page_errors.append(str(err))

        page.on("console", on_console)
        page.on("pageerror", on_error)
        url = f"{BASE}?{shot['query']}"
        page.goto(url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_function(
            """() => document.documentElement.dataset.lastLuasReady === '1'
                   || document.documentElement.dataset.lastLuasAssetError === '1'""",
            timeout=45000,
        )
        data = page.evaluate("""() => ({...document.documentElement.dataset})""")
        if data.get("lastLuasAssetError") == "1":
            page.screenshot(path=str(OUT / f"{name}-asset-error.png"), full_page=True)
            raise RuntimeError(f"{name}: Last Luas character assets failed to load")
        if data.get("lastLuasBuild") != "0.4.0":
            raise RuntimeError(f"{name}: wrong build {data.get('lastLuasBuild')}")
        if data.get("lastLuasCharacterAssets") != "2":
            raise RuntimeError(f"{name}: expected 2 character assets, got {data.get('lastLuasCharacterAssets')}")
        if data.get("lastLuasObstacleCount") != "29":
            raise RuntimeError(f"{name}: expected 29 obstacles, got {data.get('lastLuasObstacleCount')}")
        if shot.get("focus") and data.get("lastLuasReviewFocus") != shot["focus"]:
            raise RuntimeError(f"{name}: review focus did not activate")
        if shot.get("landmark") and data.get("lastLuasReviewLandmark") != shot["landmark"]:
            raise RuntimeError(f"{name}: landmark review did not activate")
        page.wait_for_function(
            "() => document.documentElement.dataset.lastLuasSmokeStopped === '1'",
            timeout=10000,
        )
        data = page.evaluate("""() => ({...document.documentElement.dataset})""")
        page.screenshot(path=str(OUT / f"{name}.png"), full_page=True)
        report.append({
            "name": name,
            "query": shot["query"],
            "viewport": [width, height],
            "dataset": data,
            "console": console_messages,
            "pageErrors": page_errors,
        })
        if page_errors:
            raise RuntimeError(f"{name}: browser errors: {' | '.join(page_errors)}")
        page.remove_listener("console", on_console)
        page.remove_listener("pageerror", on_error)

    context.close()
    browser.close()

(OUT / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
print(json.dumps({"shots": [x["name"] for x in SHOTS], "count": len(SHOTS)}, indent=2))
