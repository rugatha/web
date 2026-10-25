// Fixed site information and shared parsing for the page and publisher.
export function parseExperienceInfo(info) {
  if (!info || !['y', 'n'].includes(info.active)) throw new Error('active must be y or n');
  if (info.active === 'n') return { ...info, active: 'n' };
  const date = (value) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)
      || !Number.isFinite(Date.parse(`${value}T00:00:00Z`))
      || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value) throw new Error('Invalid date');
    return value;
  };
  const time = (value) => {
    if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error('Invalid time');
    return value;
  };
  const startsAt = `${date(info.startDate)}T${time(info.startTime)}:00+08:00`;
  const endsAt = `${date(info.endDate)}T${time(info.endTime)}:00+08:00`;
  // The entire last minute remains open, in Taiwan time.
  const deadline = `${date(info.deadline)}T23:59:59.999+08:00`;
  if (!/^[a-zA-Z0-9-]{1,100}$/.test(info.eventId)
    || ![info.scriptName, info.dm, info.location].every(value => typeof value === 'string' && value.trim())
    || !Number.isInteger(info.maxPlayers) || info.maxPlayers < 1 || info.maxPlayers > 100
    || !Number.isInteger(info.minPlayers) || info.minPlayers < 1 || info.minPlayers > info.maxPlayers
    || Date.parse(endsAt) <= Date.parse(startsAt) || Date.parse(deadline) > Date.parse(startsAt)
    || !Number.isFinite(info.fee) || info.fee < 0
    || ![true, false, null].includes(info.characterCreation)) throw new Error('Invalid registration configuration');
  return {
    ...info, startsAt, endsAt, deadline,
    contactEmail: 'rugathadnd@gmail.com',
    system: '龍與地下城第五版（D&D 5e）',
    world: 'Rugatha（原創）',
  };
}
