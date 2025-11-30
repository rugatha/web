window.RugathaZoom = (function () {

  function applyZoom(svg, viewport, width, height) {
    let currentTransform = d3.zoomIdentity;

    const zoom = d3.zoom()
      .scaleExtent([0.3, 3])
      .on("zoom", event => {
        currentTransform = event.transform;
        viewport.attr("transform", event.transform);
      });

    svg.call(zoom);

    function centerOnNode(node, duration=350) {
      if (!node || !isFinite(node.x) || !isFinite(node.y)) return;
      const t = d3.zoomIdentity
        .translate(width/2 - node.x, height/2 - node.y)
        .scale(1);

      svg.transition().duration(duration).call(zoom.transform, t);
    }

    function zoomByFactor(f) {
      const t = currentTransform;
      const cx = width/2, cy = height/2;

      const newK = Math.max(0.3, Math.min(3, t.k * f));
      const scaleFactor = newK / t.k;

      const newX = cx - (cx - t.x)*scaleFactor;
      const newY = cy - (cy - t.y)*scaleFactor;

      const nt = d3.zoomIdentity.translate(newX,newY).scale(newK);
      svg.transition().duration(200).call(zoom.transform, nt);
    }

    function fitTo(nodes) {
      if (!nodes.length) return;
      let minX=Infinity, maxX=-Infinity, minY=Infinity, maxY=-Infinity;

      nodes.forEach(n => {
        if (!isFinite(n.x) || !isFinite(n.y)) return;
        minX = Math.min(minX,n.x);
        maxX = Math.max(maxX,n.x);
        minY = Math.min(minY,n.y);
        maxY = Math.max(maxY,n.y);
      });

      const pad = 40;
      const w = maxX-minX, h=maxY-minY;
      const scale = Math.max(0.3, Math.min(3,
        0.9*Math.min(width/(w+pad*2), height/(h+pad*2))
      ));

      const cx = (minX+maxX)/2;
      const cy = (minY+maxY)/2;
      const nt = d3.zoomIdentity
        .translate(width/2 - cx*scale, height/2 - cy*scale)
        .scale(scale);

      svg.transition().duration(350).call(zoom.transform, nt);
    }

    function reset() {
      svg.transition().duration(350)
        .call(zoom.transform, d3.zoomIdentity);
    }

    return { centerOnNode, zoomByFactor, fitTo, reset };
  }

  return { applyZoom };
})();
