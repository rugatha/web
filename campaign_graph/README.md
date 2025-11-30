# Rugatha Campaign Graph

This project provides an interactive, collapsible, D3.js-based campaign hierarchy
viewer for the Rugatha TRPG world.

The graph features:
- Multi-level hierarchy (Root → Category → Campaign)
- Smooth expand/collapse animations
- Fan-based child expansion layout (avoid node overlap)
- Zoom / Pan / Fit / Home controls
- WordPress-safe embedding method
- Modular JS architecture for easy future maintenance

---

## 📁 Project Structure

```
campaign_graph/
│
├── index.html
│
├── README.md
│
├── css/
│   └── style.css
│
├── js/
│   ├── graph-data.js
│   ├── graph-layout.js
│   ├── graph-render.js
│   ├── graph-zoom.js
│   └── main.js
│
└── assets/
    └── rugatha-icon.png
```

---

## 🚀 Deploy on GitHub Pages

1. Push the folder to a GitHub repository.
2. Go to **Settings → Pages**.
3. Under *Build and Deployment*, set:
   - Source: **Deploy from branch**
   - Branch: `main`
   - Folder: `/ (root)` or `/docs`
4. Visit the published URL:

```
https://<your-username>.github.io/campaign_graph/
```

---

## 🧩 Embedding in WordPress (Without iframes)

Your WordPress installation may block `<script>` or `<iframe>`.  
Use this instead:

```html
<a href="https://<your-username>.github.io/campaign_graph/" target="_blank">
  Open Rugatha Campaigns Graph
</a>
```

---

## 🛠 Updating Hierarchy

Edit:

```
js/graph-data.js
```

Each row looks like:

```js
{ id:"rp-c06", label:"C06 Hand of the Lich", level:3, parent:"rp" }
```

Rules:
- `id`: unique
- `label`: display name
- `level`: 1, 2, or 3
- `parent`: id of parent node

After editing, refresh the page.

---

## 🔧 Debugging Display Issues

If the graph appears shifted or nodes overlap:
- Use **Ctrl+Shift+R** to hard refresh
- Ensure all JS files are uploaded
- Ensure your icon exists in `/assets`

---

## 📜 License

MIT License.
