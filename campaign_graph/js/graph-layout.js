// js/graph-layout.js
window.RugathaLayout = (function () {
  /**
   * 初始化階層關係、預設屬性
   */
  function buildHierarchy(rawMap) {
    rawMap.forEach(n => {
      n.children = [];
      n.visible = false;
      n.expanded = n.level === 1; // 只有 root 預設展開
      n.fx = null;
      n.fy = null;
    });

    // 建 parent → children 關係
    rawMap.forEach(n => {
      if (n.parent && rawMap.has(n.parent)) {
        rawMap.get(n.parent).children.push(n);
      }
    });
  }

  function estimateNodeRadius(node) {
    if (!node) return 80;
    if (node.level === 1) return 160;
    if (node.level === 2) return 120;
    if (node.level === 3) return 90;
    return 80;
  }

  function findAvailableSlot(targetX, targetY, node, occupied, parentNode) {
    const padding = 18;
    const selfRadius = estimateNodeRadius(node);

    function isFree(x, y) {
      for (const other of occupied) {
        if (other === node) continue;
        if (other === parentNode) continue; // 可與父節點維持既定距離，不用再避讓
        if (!other.visible) continue;
        if (!isFinite(other.x) || !isFinite(other.y)) continue;
        const minDist = selfRadius + estimateNodeRadius(other) + padding;
        const dx = other.x - x;
        const dy = other.y - y;
        if (Math.hypot(dx, dy) < minDist) {
          return false;
        }
      }
      return true;
    }

    if (isFree(targetX, targetY)) {
      return { x: targetX, y: targetY };
    }

    const axisStep = 36;
    for (let m = 1; m <= 5; m++) {
      const dist = axisStep * m;
      const candidates = [
        { x: targetX, y: targetY - dist },
        { x: targetX, y: targetY + dist },
        { x: targetX + dist, y: targetY },
        { x: targetX - dist, y: targetY }
      ];
      for (const c of candidates) {
        if (isFree(c.x, c.y)) return c;
      }
    }

    const spiralStep = 28;
    for (let ring = 1; ring <= 8; ring++) {
      const radius = ring * spiralStep;
      const samples = Math.max(8, ring * 6);
      for (let i = 0; i < samples; i++) {
        const angle = (i / samples) * Math.PI * 2;
        const x = targetX + Math.cos(angle) * radius;
        const y = targetY + Math.sin(angle) * radius;
        if (isFree(x, y)) {
          return { x, y };
        }
      }
    }

    return { x: targetX, y: targetY };
  }

  /**
   * 根據 expanded 狀態，決定哪些節點要顯示
   */
  function computeVisibility(rawMap) {
    rawMap.forEach(n => (n.visible = false));

    // 先讓 root 可見
    rawMap.forEach(n => {
      if (!n.parent) n.visible = true;
    });

    // 一路往下展開
    let changed = true;
    while (changed) {
      changed = false;
      rawMap.forEach(n => {
        if (!n.parent) return;
        const p = rawMap.get(n.parent);
        const should = p && p.visible && p.expanded;
        if (should && !n.visible) {
          n.visible = true;
          changed = true;
        }
      });
    }
  }

  /**
   * 子節點依「母節點相對父層的反方向」扇形展開（只設 initial x/y，不再使用 fx/fy）
   */
  function getFanCenter(parent, rawMap) {
    // parent 或祖先資料不足就回傳 0，保持原方向
    if (!parent || !parent.parent || !rawMap) return 0;
    // 找到本節點的父層（祖先）座標
    const grand = rawMap.get(parent.parent);
    if (!grand || !isFinite(grand.x) || !isFinite(grand.y)) return 0;
    if (!isFinite(parent.x) || !isFinite(parent.y)) return 0;

    // 計算「從目前節點指向父層」的向量
    const dxAway = parent.x - grand.x;
    const dyAway = parent.y - grand.y;
    if (Math.abs(dxAway) < 1e-2 && Math.abs(dyAway) < 1e-2) return 0;

    // 以前一層指向目前節點的方向當作扇形中心，再轉 180 度讓下一層持續背離父層
    let centerAngle = Math.atan2(dyAway, dxAway);

    return centerAngle;
  }

  function placeChildrenLine(parent, kids, directionAngle, occupiedNodes) {
    if (!kids || kids.length === 0) return;

    const baseRadius =
      parent.level === 1 ? 220 :
      parent.level === 2 ? 190 :
      160;

    const gap = 140;
    const dirX = Math.cos(directionAngle);
    const dirY = Math.sin(directionAngle);

    kids.forEach((c, i) => {
      const distance = baseRadius + i * gap;
      const targetX = parent.x + dirX * distance;
      const targetY = parent.y + dirY * distance;

      const slot = findAvailableSlot(targetX, targetY, c, occupiedNodes || kids, parent);
      const finalX = slot.x;
      const finalY = slot.y;

      if (!isFinite(c.x) || !isFinite(c.y)) {
        c.x = finalX;
        c.y = finalY;
      } else {
        c.x = (c.x * 2 + finalX) / 3;
        c.y = (c.y * 2 + finalY) / 3;
      }
    });
  }

  function placeChildrenFan(parent, kids, occupiedNodes, rawMap) {
    if (!kids || kids.length === 0) return;

    let fan = Math.PI * 0.95;     // 約 170 度扇形，展開時有更大垂直間距
    const center = getFanCenter(parent, rawMap); // 依前面函式決定扇形中心角度
    if (parent.level === 2) {
      placeChildrenLine(parent, kids, center, occupiedNodes);
      return;
    }

    const start = center - fan / 2;              // 扇形起始角
    const end   = center + fan / 2;              // 扇形結束角

    // 不同層級用不同半徑，避免線太長
    const baseRadius =
      parent.level === 1 ? 220 :
      parent.level === 2 ? 190 :
      160;

    const count = kids.length;

    kids.forEach((c, i) => {
      const offset = (i - (count - 1) / 2) * 22; // 階層越多，往上下推開一些
      const t = count === 1 ? 0.5 : i / (count - 1); // 只有一個就置中，多個就平均分
      const angle = start + t * (end - start);
      const r = baseRadius + Math.min(60, count * 12); // 子數越多半徑越大，避免壓在一起
      const targetX = parent.x + Math.cos(angle) * r;
      const targetY = parent.y + Math.sin(angle) * r + offset;

      const slot = findAvailableSlot(targetX, targetY, c, occupiedNodes || kids, parent);
      const finalX = slot.x;
      const finalY = slot.y;

      // 只設 initial x/y，不釘死
      if (!isFinite(c.x) || !isFinite(c.y)) {
        c.x = finalX;
        c.y = finalY;
      } else {
        // 已經有位置的話，稍微往目標拉近
        c.x = (c.x * 2 + finalX) / 3;
        c.y = (c.y * 2 + finalY) / 3;
      }
    });
  }

  /**
   * 根據目前 expanded / visible 狀態產生 nodes & links
   */
  function buildGraph(rawMap) {
    computeVisibility(rawMap);

    const nodes = [];
    const links = [];

    rawMap.forEach(n => {
      if (n.visible) nodes.push(n);
    });

    rawMap.forEach(n => {
      if (!n.visible || !n.parent) return;
      const p = rawMap.get(n.parent);
      if (p && p.visible) {
        links.push({ source: p, target: n });
      }
    });

    // 對每個展開中的節點，幫它的 child 設定扇形初始位置
    rawMap.forEach(n => {
      if (n.expanded && n.children && n.children.length > 0) {
        const kids = n.children.filter(c => c.visible);
        placeChildrenFan(n, kids, nodes, rawMap);
      }
    });

    return { nodes, links };
  }

  return {
    buildHierarchy,
    buildGraph
  };
})();
