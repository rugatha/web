export const dates = { '2026-12-12': '12/12（六）', '2026-12-13': '12/13（日）' };
export const startHours = [12, 14, 16];
export const times = startHours.map(hour => `${hour}:00-${hour + 2}:00`);
export const slotIds = Object.keys(dates).flatMap(day => startHours.map(hour => `${day}-${hour}`));
export const slotId = (day, index) => `${day}-${startHours[index]}`;
export const slotLabel = id => {
  if (!/^2026-12-(12|13)-(12|13|14|15|16|17)$/.test(id)) return id;
  const hour = Number(id.slice(-2));
  return `${id.slice(5, 10).replace('-', '/')} ${hour}:00–${hour + (slotIds.includes(id) ? 2 : 1)}:00${slotIds.includes(id) ? '' : '（舊時段）'}`;
};
