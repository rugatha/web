// Membership and founding status belong to a campaign; death belongs to a character.
export const getCampaignStatus = (pc, field, campaign) => {
  const value = pc[field]?.[campaign];
  return typeof value === "boolean" ? value : null;
};

export const sortCampaignPcs = (pcs, campaign) => pcs.slice().sort((a, b) => {
  // Within each party-status group, deceased members follow all living members.
  const rank = pc => getCampaignStatus(pc, "active", campaign) === true ? 0
    : getCampaignStatus(pc, "active", campaign) === null ? 1 : 2;
  return rank(a) - rank(b)
    || Number(a.dead === true) - Number(b.dead === true)
    || Number(getCampaignStatus(b, "origin", campaign) === true) - Number(getCampaignStatus(a, "origin", campaign) === true)
    || Number(String(a.guest || "").trim() === "1") - Number(String(b.guest || "").trim() === "1")
    || String(a.name_en || "").localeCompare(String(b.name_en || ""));
});

const matchesBoolean = (value, filter) => {
  if (!filter || filter === "all") return true;
  if (filter === "unknown") return value !== true && value !== false;
  return value === (filter === "true");
};

export const matchesPcFilters = (pc, campaign, filters) => {
  if (filters.campaign && filters.campaign !== "all" && filters.campaign !== campaign) return false;
  if (!matchesBoolean(getCampaignStatus(pc, "active", campaign), filters.active)) return false;
  if (!matchesBoolean(getCampaignStatus(pc, "origin", campaign), filters.origin)) return false;
  if (!matchesBoolean(pc.dead, filters.dead)) return false;
  const guest = String(pc.guest || "").trim() === "1";
  if (filters.participation === "guest" && !guest) return false;
  if (filters.participation === "regular" && guest) return false;
  if (filters.player && filters.player !== "all" && String(pc.player || "").trim() !== filters.player) return false;
  return true;
};
