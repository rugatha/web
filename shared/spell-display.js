// Display helpers for the 2014 catalog. Keep spell identifiers and rules data intact.
export function stripSpellTags(value, language = 'en') {
  let text = String(value);
  // Resolve inner tags first (e.g. a note containing a filter).
  for (let pass = 0; pass < 12 && /\{@/.test(text); pass += 1) {
    text = text.replace(/\{@(\w+)\s+([^{}]*)\}/g, (_, tag, body) => {
      const parts = body.split('|');
      const name = parts[0];
      if (tag === 'chance') return `${name}%`;
      if (tag === 'filter' && language === 'zh' && /^\d+(?:\/\d+)? or lower$/.test(name)) {
        return name.replace(' or lower', ' 或更低');
      }
      if (['filter', 'book', 'classFeature'].includes(tag)) return name;
      if (tag === 'quickref') return parts[4] || name;
      if (['scaledice', 'scaledamage'].includes(tag)) return parts[3] || parts[2] || name;
      // Existing Chinese references sometimes use the second field for display.
      if (parts.length === 2 && /[\u3400-\u9fff]/.test(parts[1])) return parts[1];
      return parts[2] || (['dice', 'damage', 'd20'].includes(tag) ? parts[1] : '') || name;
    });
  }
  return text;
}

const unitNames = {
  action: ['動作', 'action'], 動作: ['動作', 'action'],
  bonus: ['附贈動作', 'bonus action'], 附贈動作: ['附贈動作', 'bonus action'],
  reaction: ['反應', 'reaction'], 反應: ['反應', 'reaction'],
  minute: ['分鐘', 'minute'], 分鐘: ['分鐘', 'minute'],
  hour: ['小時', 'hour'], 小時: ['小時', 'hour'],
  day: ['日', 'day'], 日: ['日', 'day'],
  round: ['輪', 'round'], 輪: ['輪', 'round'],
  feet: ['呎', 'foot'], 呎: ['呎', 'foot'],
  miles: ['哩', 'mile'], 哩: ['哩', 'mile'],
};
function quantity(amount, unit, language) {
  const english = language === 'en';
  const label = unitNames[unit]?.[english ? 1 : 0] || unit || '';
  const plural = english && amount !== 1 ? (label === 'foot' ? 'feet' : `${label}s`) : label;
  return `${amount} ${plural}`;
}
export function formatSpellTime(time, language = 'zh') {
  if (!Array.isArray(time) || !time.length) return '—';
  return time.map(item => {
    const condition = item.condition ? (language === 'en' ? ` (${stripSpellTags(item.condition)})` : `（${stripSpellTags(item.condition)}）`) : '';
    return quantity(item.number ?? 1, item.unit, language) + condition;
  }).join(language === 'en' ? ' or ' : ' 或 ');
}
export function formatSpellRange(range, language = 'zh') {
  if (!range) return '—';
  const english = language === 'en';
  const simple = {
    self: ['自身', 'Self'], 自身: ['自身', 'Self'], touch: ['觸及', 'Touch'], 觸及: ['觸及', 'Touch'],
    sight: ['視線', 'Sight'], 視線: ['視線', 'Sight'], unlimited: ['無限', 'Unlimited'], 無限: ['無限', 'Unlimited'],
    special: ['特殊', 'Special'], 特殊: ['特殊', 'Special'],
  };
  const distance = range.distance;
  if (!distance) return simple[range.type]?.[english ? 1 : 0] || range.type || '—';
  if (simple[distance.type]) return simple[distance.type][english ? 1 : 0];
  const size = quantity(distance.amount, distance.type, language);
  const shapes = {
    radius: ['半徑', 'radius'], 半徑: ['半徑', 'radius'], sphere: ['半徑球體', 'radius sphere'], 球體: ['半徑球體', 'radius sphere'],
    cone: ['錐形', 'cone'], 錐形: ['錐形', 'cone'], line: ['線形', 'line'], 線形: ['線形', 'line'],
    cube: ['立方體', 'cube'], 立方體: ['立方體', 'cube'], hemisphere: ['半徑半球', 'radius hemisphere'], 半球: ['半徑半球', 'radius hemisphere'],
  };
  const shape = shapes[range.type];
  if (!shape) return size;
  if (!english) return `自身（${size}${shape[0]}）`;
  const unit = unitNames[distance.type]?.[1] || distance.type;
  return `Self (${distance.amount}-${unit}${shape[1].startsWith('radius ') ? '-' : ' '}${shape[1]})`;
}
export function formatSpellDuration(duration, language = 'zh') {
  if (!Array.isArray(duration) || !duration.length) return '—';
  const english = language === 'en';
  return duration.map(item => {
    if (item.duration) {
      const text = quantity(item.duration.amount, item.duration.type, language);
      const upTo = item.concentration || item.duration.upTo;
      return (item.concentration ? (english ? 'Concentration, ' : '專注，') : '')
        + (upTo ? (english ? 'up to ' : '至多 ') : '') + text;
    }
    if (item.type === 'permanent' || item.type === '永久') {
      return item.ends?.includes('trigger')
        ? (english ? 'Until dispelled or triggered' : '直到被解除或觸發')
        : (english ? 'Until dispelled' : '直到被解除');
    }
    if (item.type === 'instant' || item.type === '立即') return english ? 'Instantaneous' : '立即';
    return english ? 'Special' : '特殊';
  }).join(english ? ' or ' : ' 或 ');
}
export function spellTableCellText(cell) {
  if (typeof cell === 'string' || typeof cell === 'number') return String(cell);
  const roll = cell?.roll;
  if (!roll) return '';
  const number = n => roll.pad ? String(n).padStart(2, '0') : String(n);
  if (roll.exact !== undefined) return number(roll.exact);
  return `${number(roll.min)}–${number(roll.max)}`;
}
