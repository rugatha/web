# NPC Browser

Lightweight static pages that list NPCs from `data/characters.json` with search, sorting, and grouping utilities. No build step or server required—open the HTML files in a browser.

## Pages
- `index.html` – main page with search, A↔Z sort, toggle between letter/race grouping.
- `npc.html` – trimmed standalone version without WordPress artifacts; same interactions as `index.html`.

## Features
- Search by name or race (updates results and count live).
- Sort A→Z / Z→A.
- Group by starting letter or by race; race mode supports entries with multiple races (comma-separated) and shows them in each race group.
- Lazy-loaded images and accessible status updates.

## Data
- Source: `data/characters.json`
- Expected shape per entry:
  ```json
  {
    "name": "Ada",
    "image": "https://example.com/ada.jpg",
    "url": "https://example.com/ada",
    "race": "Human, Elf" // comma-separated when multiple
  }
  ```

## Usage
1) Open `index.html` or `npc.html` directly in a browser (double-click or drag into a tab).
2) Optionally serve locally (helps with some browser fetch rules):
   - Python 3: `python -m http.server 8000`
   - Node (if installed): `npx serve .`  
   Then visit `http://localhost:8000`.

## Customization
- Update styles inside the `<style>` blocks of each HTML file.
- Adjust behavior in the `<script>` section; the main knobs are search, sort, grouping, and rendering logic.
- Swap the hero image URL in the header if you want a different banner.
