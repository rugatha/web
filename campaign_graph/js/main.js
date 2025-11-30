// js/main.js
(function () {
  const rawData = window.CAMPAIGN_GRAPH_DATA || [];

  const svg = d3.select("#rugatha-graph-svg");
  if (svg.empty()) return;

  const width = svg.node().clientWidth;
  const height = svg.node().clientHeight;

  // 建 nodeMap + 基本屬性
  const nodeMap = new Map();
  rawData.forEach(d => {
    const node = Object.assign({}, d);
    node.x = width / 2;
    node.y = height / 2;
    node.fx = null;
    node.fy = null;
    node.children = [];
    node.visible = false;
    node.expanded = node.level === 1; // 只 root 預設展開
    nodeMap.set(node.id, node);
  });

  RugathaLayout.buildHierarchy(nodeMap);

  /**
   * 起始位置排版：
   * - Root 放在畫面左側 20% 的位置
   * - 第二層在畫面中央偏右（約 50% 寬度），垂直排開，彼此間距 120
   * - 第三層先不用特別排，展開時由 layout 做扇形
   */
  function initPositions() {
    let root = null;
    nodeMap.forEach(n => {
      if (n.level === 1 && !n.parent) root = n;
    });
    if (!root) return;

    const rootX = width * 0.2;
    const rootY = height * 0.5;

    root.x = rootX;
    root.y = rootY;

    // 第二層節點
    const level2Nodes = [];
    nodeMap.forEach(n => {
      if (n.level === 2 && n.parent === root.id) {
        level2Nodes.push(n);
      }
    });

    const gapY2 = 120;
    const x2 = width * 0.5; // 中央偏右
    const startY2 = rootY - (level2Nodes.length - 1) * gapY2 / 2;

    level2Nodes.forEach((n, i) => {
      n.x = x2;
      n.y = startY2 + i * gapY2;
    });

    // 第三層位置不用強制排，展開時再由 layout 補上初始扇形位置
  }

  // ⭐ 一開始安排合理初始位置，避免線超長與重疊
  initPositions();

  const viewport = svg.append("g").attr("id", "rugatha-viewport");
  const graphState = {
    focusedLevel: 2
  };

  function getCollisionRadius(node) {
    const childCount = Array.isArray(node.children)
      ? node.children.filter(c => c.visible).length
      : 0;
    const extra = childCount * 6;

    if (node.level === 1) return 160 + extra;
    if (node.level === 2) return 110 + extra;
    if (node.level === 3) return 90 + extra;
    return 80 + extra;
  }

  let pendingCenter = null;
  let nodes = [];
  let links = [];

  const zoomApi = RugathaZoom.applyZoom(svg, viewport, width, height);

  ({ nodes, links } = RugathaLayout.buildGraph(nodeMap));

  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links)
      .id(d => d.id)
      .distance(d => {
        // 根據來源層級調整線距離，避免一下太長
        const srcLevel = d.source.level || 2;
        if (srcLevel === 1) return 220;
        if (srcLevel === 2) return 180;
        return 140;
      })
      .strength(0.4))
    .force("charge", d3.forceManyBody().strength(-220))
    .force("collide", d3.forceCollide().radius(d => getCollisionRadius(d)).iterations(2))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .alphaTarget(0.08)
    .on("tick", ticked);

  function changeNodeExpanded(event, node, desiredState) {
    if (event && typeof event.stopPropagation === "function") {
      event.stopPropagation();
    }

    pendingCenter = node;

    if (!node.children || node.children.length === 0) return;

    const nextState = typeof desiredState === "boolean"
      ? desiredState
      : !node.expanded;

    if (node.expanded === nextState) return;

    node.expanded = nextState;
    if (node.level === 2) {
      graphState.focusedLevel = nextState ? 3 : 2;
    }
    update();
  }

  let linkSel = viewport.append("g").attr("class", "edges").selectAll("line");
  let nodeSel = viewport.append("g").attr("class", "nodes").selectAll("g");

  function update() {
    const built = RugathaLayout.buildGraph(nodeMap);
    nodes = built.nodes;
    links = built.links;

    simulation.nodes(nodes);
    simulation.force("link").links(links);
    simulation.alpha(0.3).restart();

    // Edge
    linkSel = linkSel.data(links, d => d.source.id + "-" + d.target.id);
    linkSel.exit().remove();
    linkSel = linkSel.enter()
      .append("line")
      .attr("class", "rugatha-edge")
      .merge(linkSel);

    // Node
    nodeSel = nodeSel.data(nodes, d => d.id);
    nodeSel.exit().remove();

    viewport
      .attr("data-focused-level", graphState.focusedLevel);

    nodeSel = RugathaRender.renderNodes(viewport, nodeSel, simulation, {
      onToggle: (event, d) => changeNodeExpanded(event, d),
      onExpand: (event, d) => changeNodeExpanded(event, d, true),
      onCollapse: (event, d) => changeNodeExpanded(event, d, false)
    });
  }

  function ticked() {
    linkSel
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

    nodeSel.attr("transform", d => `translate(${d.x},${d.y})`);

    if (pendingCenter) {
      zoomApi.centerOnNode(pendingCenter, 350);
      pendingCenter = null;
    }
  }

  // 初始 render
  update();

  // 一進頁面後稍微等 layout 穩定，再做一次 fitToView
  setTimeout(() => {
    zoomApi.fitTo(nodes);
  }, 400);

  // 控制按鈕
  document.getElementById("btn-zoom-in").onclick = e => {
    e.stopPropagation();
    zoomApi.zoomByFactor(1.2);
  };

  document.getElementById("btn-zoom-out").onclick = e => {
    e.stopPropagation();
    zoomApi.zoomByFactor(1 / 1.2);
  };

  document.getElementById("btn-fit").onclick = e => {
    e.stopPropagation();
    zoomApi.fitTo(nodes);
  };

  document.getElementById("btn-home").onclick = e => {
    e.stopPropagation();
    pendingCenter = null;
    graphState.focusedLevel = 2;

    // Home：回到只顯示第一、第二層
    nodeMap.forEach(n => {
      if (n.level === 1) n.expanded = true;
      else if (n.level === 2) n.expanded = false;
      else n.expanded = false;
    });

    // 重新設一次初始位置，讓 layout 回到乾淨的樹狀
    initPositions();
    update();
    zoomApi.reset();
  };
})();
