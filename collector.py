"""Fetch a public contact-lens product page and append a normalized price record.

This intentionally only reads public product pages.  It never signs in, adds an
item to a cart, or places an order.
"""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen


ROOT = Path(__file__).parent
PRODUCTS_FILE = ROOT / "public" / "products.json"
USER_AGENT = "ContactLensPriceComparer/0.1 (+personal research; public pages only)"

SOURCES = {
    "www.shiningeyes.com.tw": "漾美 SparklingEyes",
    "ieyeshining.com": "鏡后 Lenses Queen",
    "www.funny-eyes.com": "睛美 PrettyEyes",
    "www.bblens.tw": "BBLens",
    "ai-dai.com": "愛戴 AIDAI",
    "www.ai-dai.com": "愛戴 AIDAI",
    "www.afternunlab.com": "Afternun Lab",
    "www.morefine-optical.com": "MoreFine Optical",
    "www.watsons.com.tw": "屈臣氏 Watsons",
}


def clean(value: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", value))).strip()


def source_name(url: str) -> str:
    host = urlparse(url).netloc.lower().split(":")[0]
    return SOURCES.get(host, host)


def get_page(url: str) -> str:
    request = Request(url, headers={"User-Agent": USER_AGENT, "Accept-Language": "zh-TW,zh;q=0.9"})
    with urlopen(request, timeout=20) as response:
        charset = response.headers.get_content_charset() or "utf-8"
        return response.read().decode(charset, errors="replace")


def first_match(pattern: str, text: str, flags: int = re.I | re.S) -> str | None:
    match = re.search(pattern, text, flags)
    return clean(match.group(1)) if match else None


def parse_title(page: str) -> str:
    return (
        first_match(r'<meta[^>]+property=["\']og:title["\'][^>]+content=["\']([^"\']+)', page)
        or first_match(r"<h1[^>]*>(.*?)</h1>", page)
        or first_match(r"<title[^>]*>(.*?)</title>", page)
        or "未命名商品"
    )


def structured_prices(page: str) -> list[int]:
    """Read a Product's price from JSON-LD before considering page-wide text.

    Shopline pages put coupon amounts in the header, so the first visible dollar
    amount is not necessarily the product price.
    """
    prices: list[int] = []
    scripts = re.findall(r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', page, re.I | re.S)

    def product_prices(value: object) -> None:
        if isinstance(value, list):
            for item in value:
                product_prices(item)
        elif isinstance(value, dict):
            kind = value.get("@type", [])
            kind = kind if isinstance(kind, list) else [kind]
            if "Product" in kind:
                offers = value.get("offers", [])
                offers = offers if isinstance(offers, list) else [offers]
                for offer in offers:
                    if isinstance(offer, dict) and str(offer.get("price", "")).replace(".", "", 1).isdigit():
                        prices.append(int(float(str(offer["price"]))))
            for child in value.values():
                product_prices(child)

    for script in scripts:
        try:
            product_prices(json.loads(html.unescape(script)))
        except json.JSONDecodeError:
            continue
    return prices


def parse_prices(page: str) -> tuple[int | None, int | None]:
    structured = structured_prices(page)
    if structured:
        return structured[0], structured[1] if len(structured) > 1 and structured[1] > structured[0] else None
    # Most sites render NT$ / NT123,456; BBLens and Shopline pages also use $123,456.
    values = [int(raw.replace(",", "")) for raw in re.findall(r"(?:NT\s*\$?|\$)\s*([0-9][0-9,]*)", page, re.I)]
    values = [value for value in values if value > 0]
    if not values:
        return None, None
    # Product pages show the sale price before the crossed-out original price.
    return values[0], values[1] if len(values) > 1 and values[1] > values[0] else None


def parse_offer(title: str) -> tuple[int | None, int, int, int | None]:
    """Return pieces/box, bought boxes, gift boxes, and explicitly stated total boxes."""
    pieces = re.search(r"(\d+)\s*片裝", title)
    bought = re.search(r"(\d+)\s*盒(?:組)?", title)
    gift = re.search(r"(?:送|加送)\s*(\d+)\s*盒", title)
    total = re.search(r"共\s*(\d+)\s*盒", title)
    return (
        int(pieces.group(1)) if pieces else None,
        int(bought.group(1)) if bought else 1,
        int(gift.group(1)) if gift else 0,
        int(total.group(1)) if total else None,
    )


def brand_from_title(title: str) -> str:
    target_brands = {
        "嬌生安視優": ("嬌生", "安視優", "ACUVUE"),
        "酷柏": ("酷柏", "COOPER"),
        "博士倫": ("博士倫", "BAUSCH"),
        "晶碩": ("晶碩", "PEGAVISION"),
        "海昌": ("海昌", "HYDRON"),
        "美若康": ("美若康", "MIACARE"),
        "愛爾康": ("愛爾康", "ALCON"),
    }
    for canonical, aliases in target_brands.items():
        if any(alias.lower() in title.lower() for alias in aliases):
            return canonical
    for brand, aliases in {
        "星歐": ("星歐", "LARGAN", "卡沛兒", "CAPELL"),
        "帝康": ("帝康", "TICON"),
        "實瞳": ("實瞳", "SEED"),
        "昆凌": ("昆凌", "QUINLIVAN"),
        "視茂": ("視茂", "SMART VISION"),
    }.items():
        if any(alias.lower() in title.lower() for alias in aliases):
            return brand
    return "未分類"


def extract(url: str) -> dict:
    page = get_page(url)
    title = parse_title(page)
    sale_price, list_price = parse_prices(page)
    pieces_per_box, bought_boxes, gift_boxes, total_boxes = parse_offer(title)
    total_boxes = total_boxes if total_boxes is not None else bought_boxes + gift_boxes
    total_pieces = pieces_per_box * total_boxes if pieces_per_box else None
    return {
        "source": source_name(url),
        "brand": brand_from_title(title),
        "product": title,
        "salePrice": sale_price,
        "listPrice": list_price,
        "piecesPerBox": pieces_per_box,
        "boughtBoxes": bought_boxes,
        "giftBoxes": gift_boxes,
        "totalPieces": total_pieces,
        "unitPrice": round(sale_price / total_pieces, 2) if sale_price and total_pieces else None,
        "url": url,
        "checkedAt": datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds"),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Add a public product page to products.json")
    parser.add_argument("url", help="Public product URL from one of the configured sources")
    parser.add_argument("--dry-run", action="store_true", help="Print extracted data without saving it")
    args = parser.parse_args()

    if source_name(args.url) == urlparse(args.url).netloc:
        parser.error("This site is not configured yet. Add it to SOURCES first.")

    record = extract(args.url)
    if record["salePrice"] is None:
        print("Could not find a price. The page layout may have changed.", file=sys.stderr)
        return 2
    print(json.dumps(record, ensure_ascii=False, indent=2))
    if args.dry_run:
        return 0

    products = json.loads(PRODUCTS_FILE.read_text(encoding="utf-8"))
    products = [product for product in products if product["url"] != args.url]
    products.append(record)
    PRODUCTS_FILE.write_text(json.dumps(products, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Saved {len(products)} products to {PRODUCTS_FILE.name}.")
    time.sleep(0.5)  # keep manual / scheduled runs courteous to retail sites
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
