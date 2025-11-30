window.RugathaRender = (function () {
  const ROOT_ICON_URL =
    "https://rugatha.wordpress.com/wp-content/uploads/2025/05/cropped-e69caae591bde5908d-1_e5b7a5e4bd9ce58d80e59f9f-1-1.png";

  function getRectSize(n) {
    const len = n.label ? n.label.length : 0;
    let baseW, baseH, perChar;

    if (n.level === 1) {
      baseW = 140; baseH = 140; perChar = 5;
    } else if (n.level === 2) {
      baseW = 170; baseH = 50; perChar = 7;
    } else {
      baseW = 160; baseH = 44; perChar = 6;
    }

    const width = Math.max(baseW, 40 + len * perChar);
    const height = baseH;
    return { width, height };
  }

  function getNodeBounds(n) {
    if (n.level === 1) {
      return { width: 90, height: 90 };
    }
    return getRectSize(n);
  }

  function appendLink(selection, node) {
    return selection.append("a")
      .attr("class", "node-label-link")
      .attr("target", "_blank")
      .attr("rel", "noopener noreferrer")
      .attr("href", node.url)
      .on("click", event => event.stopPropagation());
  }

  function renderNodeControls(g, node, bounds, handlers) {
    if (node.level > 2) return;

    const halfW = bounds.width / 2;
    const buttonOffsetX = 14; // 距離邊緣一點，避免貼邊
    const buttons = [
      {
        type: "expand",
        label: "+",
        offsetX: -halfW + buttonOffsetX,
        offsetY: 0,
        handler: handlers.onExpand
      },
      {
        type: "collapse",
        label: "-",
        offsetX: halfW - buttonOffsetX,
        offsetY: 0,
        handler: handlers.onCollapse
      }
    ];

    const controls = g.append("g")
      .attr("class", "node-controls");

    const btnSel = controls.selectAll("g")
      .data(buttons)
      .enter()
      .append("g")
      .attr("class", d => "node-btn node-btn-" + d.type)
      .attr("transform", d => `translate(${d.offsetX},${d.offsetY})`)
      .on("click", (event, data) => {
        event.stopPropagation();
        if (typeof data.handler === "function") {
          data.handler(event, node);
        }
      });

    btnSel.append("rect")
      .attr("x", -10)
      .attr("y", -10)
      .attr("width", 20)
      .attr("height", 20)
      .attr("rx", 4)
      .attr("ry", 4);

    btnSel.append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .text(d => d.label);
  }

  function renderNodes(viewport, nodeSel, simulation, handlers = {}) {
    const enter = nodeSel.enter()
      .append("g")
      .attr("class", d => "level-" + d.level);

    // 畫節點本體（root = icon，其他 = 圓角矩形）
    enter.each(function (d) {
      const g = d3.select(this);
      const bounds = getNodeBounds(d);
      if (d.level === 1) {
        const imageParent = d.url ? appendLink(g, d) : g;
        imageParent.append("image")
          .attr("href", ROOT_ICON_URL)
          .attr("width", bounds.width)
          .attr("height", bounds.height)
          .attr("x", -bounds.width / 2)
          .attr("y", -bounds.height / 2);
      } else {
        g.append("rect")
          .attr("class", "node-rect")
          .attr("x", -bounds.width / 2)
          .attr("y", -bounds.height / 2)
          .attr("width", bounds.width)
          .attr("height", bounds.height)
          .attr("rx", 18)
          .attr("ry", 18);
      }

      renderNodeControls(g, d, bounds, handlers);

      if (d.level !== 1) {
        const labelParent = d.url ? appendLink(g, d) : g;
        labelParent.append("text")
          .attr("class", "node-label")
          .text(d.label || "");
      }
    });

    // 拖曳（D3 v7 正確寫法，用 event 參數）
    enter.call(
      d3.drag()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.1).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
    );

    // 點擊（展開 / 收合行為從 main.js 傳進來）
    enter.on("click", (event, d) => {
      if (typeof handlers.onToggle === "function") {
        handlers.onToggle(event, d);
      }
    });

    return enter.merge(nodeSel);
  }

  return {
    renderNodes
  };
})();
