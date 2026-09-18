from pathlib import Path
from playwright.sync_api import sync_playwright

BASE_URL = "http://127.0.0.1:8787"
OUT = Path("verification/meow-wars-v06")
OUT.mkdir(parents=True, exist_ok=True)
ARENAS = [
    "garden-siege",
    "rooftop-rumble",
    "junkyard-jamboree",
    "taj-mahal",
    "oconnell-bridge",
    "westminster-bridge",
    "donabate-beach",
]

def canvas_point(page, x, y):
    canvas = page.locator("canvas")
    box = canvas.bounding_box()
    if not box:
        raise AssertionError("Meow Wars canvas has no bounding box")
    return (
        box["x"] + (x / 1280.0) * box["width"],
        box["y"] + (y / 720.0) * box["height"],
    )

def click_canvas(page, x, y):
    px, py = canvas_point(page, x, y)
    page.mouse.click(px, py)

with sync_playwright() as p:
    browser = p.chromium.launch()
    context = browser.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=1)
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda exc: errors.append(str(exc)))

    page.goto(BASE_URL + "/games/meow-wars/?acceptance=v06", wait_until="domcontentloaded")
    page.wait_for_selector("canvas", timeout=30000)
    page.wait_for_function("window.__MEOW_WARS_BUILD === 'MW-HD-20260918-01'", timeout=30000)
    info = page.evaluate("window.__MEOW_WARS_BUILD_INFO()")
    assert info["version"] == "0.6.0", info
    assert info["build"] == "MW-HD-20260918-01", info
    assert info["sourceArt"] == "3840x2160", info
    assert info["terrainTexture"] == "2560x1440", info
    assert info["parallaxLayers"] == 3, info
    assert info["arenas"] == ARENAS, info

    page.locator("canvas").screenshot(path=str(OUT / "00-menu.png"))
    click_canvas(page, 1160, 45)
    page.wait_for_timeout(250)
    page.locator("canvas").screenshot(path=str(OUT / "00-settings-version-build.png"))
    click_canvas(page, 640, 532)
    page.wait_for_timeout(150)

    for index, arena in enumerate(ARENAS):
        page.goto(BASE_URL + "/games/meow-wars/?arena=" + arena, wait_until="domcontentloaded")
        page.wait_for_selector("canvas", timeout=30000)
        page.wait_for_function("window.__MEOW_WARS_BUILD === 'MW-HD-20260918-01'", timeout=30000)
        for _ in range(index):
            click_canvas(page, 955, 257)
            page.wait_for_timeout(140)
        selected = page.evaluate("window.__MEOW_WARS_SELECTED_ARENA")
        assert selected == arena, (arena, selected)
        page.locator("canvas").screenshot(path=str(OUT / f"{index+1:02d}-{arena}-menu.png"))
        click_canvas(page, 640, 603)
        page.wait_for_function("window.__MEOW_WARS_ACTIVE_ARENA === '" + arena + "'", timeout=10000)
        page.wait_for_timeout(900)
        page.locator("canvas").screenshot(path=str(OUT / f"{index+1:02d}-{arena}-battle.png"))

    if errors:
        raise AssertionError("Browser page errors: " + " | ".join(errors))
    browser.close()

print("Meow Wars v0.6 browser verification passed for all seven arenas.")
