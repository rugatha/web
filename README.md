# Rugatha Web Toolkit

Combined static package that bundles the Rugatha campaign graph, campaign cards, NPC explorer, character card generator, and timeline. Campaign metadata now lives in one place so updates propagate to every mini-site. All assets are local; no dependency on the original GitHub repos.

## Layout
- `index.html` – landing page linking to every tool.
- `shared/rugatha.config.js` – single source for shared settings (campaign list + graph links).
- `campaign_graph/` – D3 collapsible hierarchy viewer, now powered by the shared config.
- `campaigns/` – campaign cards, now powered by the shared config.
- `npc/` – NPC gallery (data still lives in `npc/data/characters.json`).
- `npc/npc_page/` – template for individual NPC pages (content is embedded in `npc/npc_page/template.html`, selected via `?npc=id`).
- `character_card/` – PNG character card generator (click preview to open/save).
- `timeline/` – static timeline view.

## Campaign graph (campaign_graph/)
- Interactive, collapsible D3 hierarchy (root → category → campaign) with zoom/pan/fit/home controls and smooth expand/collapse.
- WordPress-safe: if scripts are blocked, link out instead of embedding.
- Structure: `index.html`, `css/style.css`, `js/graph-*.js`, `assets/`.
- Update data in `shared/rugatha.config.js` (graph section); graph reads `CAMPAIGN_GRAPH_DATA` from the shared config.

## Campaign cards (campaigns/)
- Card grid of campaigns, driven by `shared/rugatha.config.js` (no separate data file needed).
- Entry point: `campaigns/index.html`; styles in `styles/campaigns.css`; logic in `scripts/app.js`.

## Character card generator (character_card/)
- Canvas-based PNG generator; click/tap the preview to open the image for saving. In-app browsers (e.g., Messenger) show a long-press overlay instead of failing to download.
- Uses shared campaign accents to build color swatches; falls back to defaults if the shared config is unavailable.
- Entry point: `character_card/index.html`; styles in `styles/style.css`; logic in `scripts/app.js`.

## NPC browser (npc/)
- Pages: `index.html` (main), `npc.html` (trimmed standalone).
- Features: search, A↔Z sorting, grouping by letter or race (multi-race entries appear in each race), lazy-loaded images, accessible live status.
- Data source: `npc/data/characters.json` (entries shaped as `{ name, image, url, race }`).
- No build step; open in a browser or serve statically.

## Updating content
1. Edit campaigns or graph nodes in `shared/rugatha.config.js` (names, links, accents, node relationships). Both the graph and cards will pick it up.
2. NPCs remain in `npc/data/characters.json` (kept separate because the schema differs).
3. If you add a timeline tool later, place it beside the other folders and wire it to the shared config if needed.

## Running locally
This is a static bundle. Any simple server works, e.g.:
```sh
python -m http.server 8000
```
Then open `http://localhost:8000/` and navigate via `index.html`.
