from __future__ import annotations

import html
import json
import re
from pathlib import Path


ROOT = Path.cwd()
SITE_ORIGIN = "https://rugatha.com"
SITE_NAME = "Rugatha"
SITE_LOCALE = "en_US"
ALTERNATE_SITE_LOCALE = "zh_TW"
DEFAULT_OG_IMAGE = "/assets/rugatha-banner.jpg"
SKIP_DIRS = {".git", ".github", ".agents", ".codex", "node_modules"}
RELATED_CHARACTER_TAG_LIMIT = 40


_RELATED_CHARACTER_CACHE: dict[str, object] | None = None


def strip_tags(value: str) -> str:
    text = re.sub(r"<script[\s\S]*?</script>", " ", value, flags=re.I)
    text = re.sub(r"<style[\s\S]*?</style>", " ", text, flags=re.I)
    text = re.sub(r"<br\s*/?>", " ", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    previous = None
    while text != previous:
        previous = text
        text = html.unescape(text)
    text = text.replace("\xa0", " ")
    return re.sub(r"\s+", " ", text).strip()


def escape_attr(value: str) -> str:
    return html.escape(value or "", quote=True)


def load_json_file(relative_path: str) -> object:
    file_path = ROOT / relative_path
    if not file_path.exists():
        return {}
    return json.loads(file_path.read_text(encoding="utf-8"))


def normalize_canonical_path(relative_path: str) -> str:
    if relative_path == "index.html":
        return "/"
    if relative_path in {"characters/index.html", "character_main_page/index.html"}:
        return "/characters/"
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


def has_zh_tw_body_content(content: str) -> bool:
    body = extract_match(content, r"<body[^>]*>([\s\S]*?)</body>") or strip_tags(content)
    return bool(re.search(r"[\u4e00-\u9fff]", body))


def unique_values(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        cleaned = strip_tags(str(value)).strip()
        key = cleaned.casefold()
        if not cleaned or key in seen:
            continue
        seen.add(key)
        result.append(cleaned)
    return result


def pretty_id(value: str) -> str:
    return str(value).replace("__", " / ").replace("_", " ").strip()


def load_related_character_data() -> dict[str, object]:
    global _RELATED_CHARACTER_CACHE
    if _RELATED_CHARACTER_CACHE is not None:
        return _RELATED_CHARACTER_CACHE

    pcs_json = load_json_file("campaigns/pages/pcs.json")
    guest_json = load_json_file("campaigns/pages/guest.json")
    npcs_json = load_json_file("campaigns/pages/npcs.json")
    npc_rows = load_json_file("npc/data/characters.json")

    npc_names: dict[str, str] = {}
    if isinstance(npc_rows, list):
        for row in npc_rows:
            if not isinstance(row, dict):
                continue
            npc_id = str(row.get("id") or "").strip()
            if not npc_id:
                continue
            name = str(row.get("nameEn") or row.get("name") or pretty_id(npc_id)).strip()
            npc_names[npc_id] = name
            npc_names[npc_id.casefold()] = name

    _RELATED_CHARACTER_CACHE = {
        "pcs": pcs_json.get("pcs", {}) if isinstance(pcs_json, dict) else {},
        "guest": guest_json.get("guest", {}) if isinstance(guest_json, dict) else {},
        "npcs": npcs_json.get("npcs", {}) if isinstance(npcs_json, dict) else {},
        "npc_names": npc_names,
    }
    return _RELATED_CHARACTER_CACHE


def chapter_key_from_path(relative_path: str) -> str | None:
    path = Path(relative_path)
    if not relative_path.startswith("campaigns/pages/"):
        return None
    if not re.match(r"chpt[^/]+\.html?$", path.name, flags=re.I):
        return None
    return f"{path.parent.name}-{path.stem.lower()}"


def arc_key_from_path(relative_path: str) -> str | None:
    path = Path(relative_path)
    if not relative_path.startswith("campaigns/pages/"):
        return None
    if path.name.lower() != "index.html":
        return None
    if len(path.parts) < 4:
        return None
    return path.parent.name


def related_character_names(relative_path: str) -> dict[str, list[str]]:
    chapter_key = chapter_key_from_path(relative_path)
    arc_key = arc_key_from_path(relative_path)
    if not chapter_key and not arc_key:
        return {"pcs": [], "guests": [], "npcs": [], "tags": []}

    data = load_related_character_data()
    pcs_map = data.get("pcs", {}) if isinstance(data.get("pcs"), dict) else {}
    guest_map = data.get("guest", {}) if isinstance(data.get("guest"), dict) else {}
    npcs_map = data.get("npcs", {}) if isinstance(data.get("npcs"), dict) else {}
    npc_names = data.get("npc_names", {}) if isinstance(data.get("npc_names"), dict) else {}

    pc_names = unique_values(pcs_map.get(chapter_key, []) if chapter_key and isinstance(pcs_map.get(chapter_key), list) else [])
    guest_names = unique_values(
        guest_map.get(chapter_key, []) if chapter_key and isinstance(guest_map.get(chapter_key), list) else []
    )
    npc_key = next(
        (
            key
            for key in [chapter_key, arc_key]
            if key and isinstance(npcs_map.get(key), list) and npcs_map.get(key)
        ),
        None,
    )
    npc_ids = npcs_map.get(npc_key, []) if npc_key else []
    npc_display_names = unique_values(
        [str(npc_names.get(str(npc_id), npc_names.get(str(npc_id).casefold(), pretty_id(str(npc_id))))) for npc_id in npc_ids]
    )
    return {
        "pcs": pc_names,
        "guests": guest_names,
        "npcs": npc_display_names,
        "tags": unique_values([*pc_names, *guest_names, *npc_display_names])[:RELATED_CHARACTER_TAG_LIMIT],
    }


def summarize_name_group(label: str, names: list[str], limit: int) -> str:
    if not names:
        return ""
    shown = names[:limit]
    suffix = f", and {len(names) - limit} more" if len(names) > limit else ""
    return f"{label} {', '.join(shown)}{suffix}"


def related_character_summary(related: dict[str, list[str]]) -> str:
    parts = [
        summarize_name_group("PCs", related.get("pcs", []), 5),
        summarize_name_group("guests", related.get("guests", []), 2),
        summarize_name_group("NPCs", related.get("npcs", []), 4),
    ]
    joined = "; ".join(part for part in parts if part)
    return f" Featuring {joined}." if joined else ""


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
    related = related_character_names(relative_path)
    character_summary = related_character_summary(related)

    if relative_path == "index.html":
        return "Explore Rugatha campaigns, characters, deities, maps, history, and community tools in one place."
    if relative_path == "about-us/index.html":
        return "Learn about Rugatha, its original D&D world, campaign history, milestones, and community projects."
    if relative_path in {"campaigns/index.html", "campaigns/pages/index.html"}:
        return "Explore Rugatha campaigns, story arcs, and chapter records across the main line and side stories."
    if relative_path.startswith("campaigns/pages/"):
        if re.search(r"/chpt[^/]+\.html$", relative_path, flags=re.I):
            return f"Read {page_name}, a Rugatha chapter record with story content, chapter navigation, and related characters.{character_summary}"
        if "story arc" in clean_title(title).lower():
            return f"Explore {page_name}, a Rugatha story arc with overview, chapter navigation, and related campaign context.{character_summary}"
        return f"Explore {page_name}, a Rugatha campaign page with chapter navigation, story context, and related records.{character_summary}"
    if relative_path in {"characters/index.html", "character_main_page/index.html"}:
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


def build_meta_block(
    title: str,
    description: str,
    canonical_url: str,
    og_image: str,
    og_type: str,
    has_alternate_locale: bool,
    article_tags: list[str] | None = None,
) -> str:
    lines = [
        f'  <meta name="description" content="{escape_attr(description)}">',
        '  <meta name="robots" content="index, follow">',
        f'  <link rel="canonical" href="{escape_attr(canonical_url)}">',
        f'  <meta property="og:type" content="{escape_attr(og_type)}">',
        f'  <meta property="og:site_name" content="{escape_attr(SITE_NAME)}">',
        f'  <meta property="og:locale" content="{escape_attr(SITE_LOCALE)}">',
    ]
    if has_alternate_locale:
        lines.append(f'  <meta property="og:locale:alternate" content="{escape_attr(ALTERNATE_SITE_LOCALE)}">')
    if og_type == "article":
        for tag in article_tags or []:
            lines.append(f'  <meta property="article:tag" content="{escape_attr(tag)}">')
    lines.extend(
        [
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
    return "\n".join(lines)


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
    has_alternate_locale = has_zh_tw_body_content(content)
    related = related_character_names(relative_path)

    existing_og_image = (
        extract_match(content, r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\'][^>]*>')
        or extract_match(content, r'<meta[^>]+name=["\']twitter:image["\'][^>]+content=["\']([^"\']+)["\'][^>]*>')
        or DEFAULT_OG_IMAGE
    )
    og_image = to_absolute_site_url(relative_path, existing_og_image)
    og_type = infer_og_type(relative_path)

    content = re.sub(r'\s*<meta[^>]+name=["\']description["\'][^>]*>\n?', "", content, flags=re.I)
    content = re.sub(r'\s*<meta[^>]+name=["\']robots["\'][^>]*>\n?', "", content, flags=re.I)
    content = re.sub(r'\s*<link[^>]+rel=["\']canonical["\'][^>]*>\n?', "", content, flags=re.I)
    content = re.sub(
        r'\s*<meta[^>]+property=["\']og:(type|site_name|locale(?::alternate)?|title|description|url|image)["\'][^>]*>\n?',
        "",
        content,
        flags=re.I,
    )
    content = re.sub(r'\s*<meta[^>]+property=["\']article:tag["\'][^>]*>\n?', "", content, flags=re.I)
    content = re.sub(
        r'\s*<meta[^>]+name=["\']twitter:(card|title|description|image)["\'][^>]*>\n?',
        "",
        content,
        flags=re.I,
    )

    meta_block = build_meta_block(
        title,
        description,
        canonical_url,
        og_image,
        og_type,
        has_alternate_locale,
        related.get("tags", []),
    )
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
