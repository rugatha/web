// Prices are per person; both event dates share the noon discount.
export function d3BasePrice(slotId) {
  return /^2026-12-(12|13)-12$/.test(slotId) ? 400 : 500;
}
export function d3Total(slotId, miniature, partySize = 1) {
  return (d3BasePrice(slotId) + (miniature ? 500 : 0)) * partySize;
}
