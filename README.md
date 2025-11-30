# Rugatha Web Toolkit

Combined static package that bundles the Rugatha campaign graph, campaign cards, and NPC explorer. Campaign metadata now lives in one place so updates propagate to every mini-site. All assets are local; no dependency on the original GitHub repos.

## Layout
- `index.html` – landing page linking to every tool.
- `shared/rugatha.config.js` – single source for shared settings (campaign list + graph links).
- `campaign_graph/` – D3 collapsible hierarchy viewer, now powered by the shared config.
- `campaigns/` – campaign cards, now powered by the shared config.
- `npc/` – NPC gallery (data still lives in `npc/data/characters.json`).

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
