// graph-data.js
// Builds CAMPAIGN_GRAPH_DATA from the shared Rugatha config.

(function () {
  const config = window.RUGATHA_CONFIG;
  if (!config || !config.graph || !Array.isArray(config.graph.nodes)) {
    console.warn("RUGATHA_CONFIG.graph.nodes is missing; graph data not loaded.");
    window.CAMPAIGN_GRAPH_DATA = [];
    return;
  }

  const defaultUrl =
    (config.graph && config.graph.defaultNodeUrl) || "https://rugatha.com";
  const overrides = config.graph.urlOverrides || {};

  window.CAMPAIGN_GRAPH_DATA = config.graph.nodes.map((node) => {
    const hasOverride = Object.prototype.hasOwnProperty.call(overrides, node.id);
    const overrideUrl = hasOverride ? overrides[node.id] : undefined;
    return Object.assign({}, node, {
      url: overrideUrl === undefined ? defaultUrl : overrideUrl
    });
  });
})();
