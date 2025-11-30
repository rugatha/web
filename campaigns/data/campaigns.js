// Thin wrapper to expose the shared campaign list as an ES module.
export const campaigns =
  window.RUGATHA_CONFIG && Array.isArray(window.RUGATHA_CONFIG.campaigns)
    ? window.RUGATHA_CONFIG.campaigns
    : [];

if (!campaigns.length) {
  console.warn("RUGATHA_CONFIG.campaigns not found; campaigns list is empty.");
}
