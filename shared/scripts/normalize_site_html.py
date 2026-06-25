from __future__ import annotations

import html
import re
from pathlib import Path


ROOT = Path.cwd()
SITE_ORIGIN = "https://rugatha.com"
DEFAULT_OG_IMAGE = "/assets/rugatha-banner.jpg"
SKIP_DIRS = {".git", ".github", ".agents", ".codex", "node_modules"}


def strip_tags(value: str) -> str:
    text = re.sub(r"<script[\s\S]*?</script>", " ", value, flags=re.I)
    text = re.sub(r"<style[\s\S]*?</style>", " ", text, flags=re.I)
    text = re.sub(r"<br\s*/?>", " ", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = (
        text.replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&quot;", '"')
        .replace("&#39;", "'")
    )
    return re.sub(r"\s+", " ", text).strip()


def escape_attr(value: str) -> str:
    return html.escape(value or "", quote=True)


def normalize_canonical_path(relative_path: str) -> str:
    if relative_path == "index.html":
        return "/"
    if relative_path.endswith("/index.html"):
        return f"/{relative_path[:-len('index.html')]}"
    return f"/{relative_path}"


def to_absolute_site_url(relative_path: str, raw_url: str | None) -> str:
    if not raw_url:
        return f"{SITE_ORIGIN}{DEFAULT_OG_IMAGE}"

    cleaned = re.sub(r"^https?://rugatha\.github\.io/web/?", f"{SITE_ORIGIN}/", raw_url, flags=re.I)
    cleaned = re.sub(r"^https?://www\.rugatha\.com/?", f"{SITE_ORIGIN}/", cleaned, flags=re.I)
    cleaned = re.sub(r"^http://rugatha\.com/?", f"{SITE_ORIGIN}/", cleaned, flags=re.I)

    if re.match(r"^https?://", cleaned, flags=re.I):
        return cleaned.rstrip("/")

    if cleaned.startswith("/"):
        return f"{SITE_ORIGIN}{cleaned}"

    file_dir = Path(relative_path).parent
    normalized = (Path("/") / file_dir / cleaned).resolve().as_posix()
    return f"{SITE_ORIGIN}{normalized}"


def extract_match(source: str, pattern: str) -> str:
    match = re.search(pattern, source, flags=re.I)
    return strip_tags(match.group(1)) if match else ""


def clean_title(title: str) -> str:
    return (
        strip_tags(title)
        .replace("| Rugatha Story Arc", "")
        .replace("| Rugatha Campaigns", "")
        .replace("| Rugatha Characters", "")
        .replace("| Deity of Rugatha", "")
        .replace("| Rugatha PC", "")
        .replace("| Rugatha", "")
        .replace("| NPC", "")
        .strip()
    )


def get_page_name(relative_path: str, content: str, title: str) -> str:
    h1 = extract_match(content, r"<h1[^>]*>([\s\S]*?)</h1>")
    h2 = extract_match(content, r"<h2[^>]*>([\s\S]*?)</h2>")
    candidate = h1 or h2 or clean_title(title)
    if candidate and candidate.lower() not in {"npc", "deity of rugatha", "deities of rugatha"}:
        return candidate

    stem = Path(relative_path).stem
    if stem.lower() in {"index", "_template", ".template"}:
      return clean_title(title)

    pretty = stem.replace("__", " : ").replace("_", " ")
    if pretty and pretty == pretty.lower():
        pretty = " ".join(part[:1].upper() + part[1:] for part in pretty.split(" "))
    return pretty or clean_title(title)


def build_title(relative_path: str, content: str, title: str) -> str:
    page_name = get_page_name(relative_path, content, title)
    clean = clean_title(title)

    if relative_path.startswith("npc/npc_page/pages/") and clean.lower() == "npc":
        return f"{page_name} | NPC | Rugatha"
    if relative_path.startswith("deities/pages/") and clean.lower() == "deity of rugatha":
        return f"{page_name} | Deity of Rugatha"
    return title


def summarize(value: str, max_length: int = 155) -> str:
    compact = strip_tags(value)
    if len(compact) <= max_length:
        return compact
    return f"{compact[: max_length - 1].rstrip()}…"


def infer_description(relative_path: str, content: str, title: str) -> str:
    page_name = get_page_name(relative_path, content, title)

    if relative_path == "index.html":
        return "Explore Rugatha campaigns, characters, deities, maps, history, and community tools in one place."
    if relative_path == "about-us/index.html":
        return "Learn about Rugatha, its original D&D world, campaign history, milestones, and community projects."
    if relative_path in {"campaigns/index.html", "campaigns/pages/index.html"}:
        return "Explore Rugatha campaigns, story arcs, and chapter records across the main line and side stories."
    if relative_path.startswith("campaigns/pages/"):
        if re.search(r"/chpt[^/]+\.html$", relative_path, flags=re.I):
            return f"Read {page_name}, a Rugatha chapter record with story content, chapter navigation, and related characters."
        if "story arc" in clean_title(title).lower():
            return f"Explore {page_name}, a Rugatha story arc with overview, chapter navigation, and related campaign context."
        return f"Explore {page_name}, a Rugatha campaign page with chapter navigation, story context, and related records."
    if relative_path == "character_main_page/index.html":
        return "Browse Rugatha player characters and NPCs from across the campaigns and worldbuilding archive."
    if relative_path == "character_card/index.html":
        return "Create and export a Rugatha-style D&D character card with custom stats, portraits, and colors."
    if relative_path == "deities/index.html":
        return "Browse the gods, domains, and faiths of Rugatha across the main pantheon and hidden religions."
    if relative_path.startswith("deities/pages/"):
        return f"Read the profile of {page_name}, a deity in Rugatha, including domains, titles, and sayings."
    if relative_path == "emperors/index.html":
        return "Browse the emperors and key historical figures who shaped Dranison in the world of Rugatha."
    if relative_path == "experience/index.html":
        return "Explore Rugatha Experience beginner-friendly D&D adventures, current scenarios, and public player feedback."
    if relative_path == "map/index.html":
        return "Explore the map of Dranison and its notable locations in the world of Rugatha."
    if relative_path == "member/index.html":
        return "Access the Adventurer's Journal for member records, character references, and account-related tools."
    if relative_path == "npc/index.html":
        return "Search and browse Rugatha NPCs by keyword, race, faith, and location."
    if relative_path.startswith("npc/npc_page/pages/"):
        return f"Read the profile of {page_name}, an NPC in Rugatha, including appearances, locations, and related characters."
    if relative_path == "pc/index.html":
        return "Browse Rugatha player characters by campaign, with portraits, classes, and player information."
    if relative_path.startswith("pc/articles/"):
        return f"Read the profile of {page_name}, a player character in Rugatha, with story notes and artwork."
    if relative_path == "timeline/index.html":
        return "Follow the history of Dranison and major events across Rugatha campaigns on a shared timeline."

    first_paragraph = extract_match(content, r"<p[^>]*>([\s\S]*?)</p>")
    return summarize(first_paragraph or f"{clean_title(title)} | Rugatha")


def infer_og_type(relative_path: str) -> str:
    if (
        relative_path.startswith("campaigns/pages/")
        or relative_path.startswith("npc/npc_page/pages/")
        or relative_path.startswith("deities/pages/")
        or relative_path.startswith("pc/articles/")
    ):
        return "article"
    return "website"


def build_meta_block(title: str, description: str, canonical_url: str, og_image: str, og_type: str) -> str:
    return "\n".join(
        [
            f'  <meta name="description" content="{escape_attr(description)}">',
            f'  <link rel="canonical" href="{escape_attr(canonical_url)}">',
            f'  <meta property="og:type" content="{escape_attr(og_type)}">',
            f'  <meta property="og:title" content="{escape_attr(title)}">',
            f'  <meta property="og:description" content="{escape_attr(description)}">',
            f'  <meta property="og:url" content="{escape_attr(canonical_url)}">',
            f'  <meta property="og:image" content="{escape_attr(og_image)}">',
            '  <meta name="twitter:card" content="summary_large_image">',
            f'  <meta name="twitter:title" content="{escape_attr(title)}">',
            f'  <meta name="twitter:description" content="{escape_attr(description)}">',
            f'  <meta name="twitter:image" content="{escape_attr(og_image)}">',
        ]
    )


def collect_html_files(root: Path) -> list[Path]:
    files: list[Path] = []
    for item in root.iterdir():
        if item.is_dir():
            if item.name in SKIP_DIRS:
                continue
            files.extend(path for path in item.rglob("*.html"))
        elif item.is_file() and item.suffix == ".html":
            files.append(item)
    return files


def normalize_html(file_path: Path) -> bool:
    relative_path = file_path.relative_to(ROOT).as_posix()
    original = file_path.read_text(encoding="utf-8")
    content = original
    content = re.sub(r"https?://rugatha\.github\.io/web/?", f"{SITE_ORIGIN}/", content, flags=re.I)
    content = re.sub(r"http://rugatha\.com/?", f"{SITE_ORIGIN}/", content, flags=re.I)
    content = re.sub(r"https://www\.rugatha\.com/?", f"{SITE_ORIGIN}/", content, flags=re.I)
    content = re.sub(r"</link>", "", content, flags=re.I)

    raw_title = extract_match(content, r"<title[^>]*>([\s\S]*?)</title>") or "Rugatha"
    title = build_title(relative_path, content, raw_title)
    content = re.sub(
        r"(<title[^>]*>)[\s\S]*?(</title>)",
        rf"\1{escape_attr(title)}\2\n",
        content,
        count=1,
        flags=re.I,
    )
    description = infer_description(relative_path, content, title)
    canonical_url = f"{SITE_ORIGIN}{normalize_canonical_path(relative_path)}"

    existing_og_image = (
        extract_match(content, r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\'][^>]*>')
        or extract_match(content, r'<meta[^>]+name=["\']twitter:image["\'][^>]+content=["\']([^"\']+)["\'][^>]*>')
        or DEFAULT_OG_IMAGE
    )
    og_image = to_absolute_site_url(relative_path, existing_og_image)
    og_type = infer_og_type(relative_path)

    content = re.sub(r'\s*<meta[^>]+name=["\']description["\'][^>]*>\n?', "", content, flags=re.I)
    content = re.sub(r'\s*<link[^>]+rel=["\']canonical["\'][^>]*>\n?', "", content, flags=re.I)
    content = re.sub(
        r'\s*<meta[^>]+property=["\']og:(type|title|description|url|image)["\'][^>]*>\n?',
        "",
        content,
        flags=re.I,
    )
    content = re.sub(
        r'\s*<meta[^>]+name=["\']twitter:(card|title|description|image)["\'][^>]*>\n?',
        "",
        content,
        flags=re.I,
    )

    meta_block = build_meta_block(title, description, canonical_url, og_image, og_type)
    content = re.sub(r"(<title[^>]*>[\s\S]*?</title>\s*)", rf"\1{meta_block}\n", content, count=1, flags=re.I)
    content = re.sub(r"(</title>)\s*(<meta name=\"description\")", r"\1\n  \2", content)
    content = re.sub(r"(twitter:image\" content=\"[^\"]+\">)\s*(<link)", r"\1\n\2", content)
    content = re.sub(r"\n{3,}", "\n\n", content)

    if content != original:
        file_path.write_text(content, encoding="utf-8")
        return True
    return False


def normalize_text_file(file_path: Path) -> bool:
    original = file_path.read_text(encoding="utf-8")
    content = re.sub(r"https?://rugatha\.github\.io/web/?", f"{SITE_ORIGIN}/", original, flags=re.I)
    content = re.sub(r"http://rugatha\.com/?", f"{SITE_ORIGIN}/", content, flags=re.I)
    content = re.sub(r"https://www\.rugatha\.com/?", f"{SITE_ORIGIN}/", content, flags=re.I)
    if content != original:
        file_path.write_text(content, encoding="utf-8")
        return True
    return False


def main() -> None:
    html_files = collect_html_files(ROOT)
    html_updated = sum(1 for file_path in html_files if normalize_html(file_path))

    js_updated = 0
    for relative_path in ["shared/rugatha.config.js"]:
        if normalize_text_file(ROOT / relative_path):
            js_updated += 1

    print(f"Updated {html_updated} HTML files and {js_updated} JS files.")


if __name__ == "__main__":
    main()
