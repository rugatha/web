const chart = document.getElementById('feedback-ratings');
const status = document.getElementById('feedback-ratings-status');

try {
  const response = await fetch('./feedback-ratings.json', { cache: 'no-cache' });
  if (!response.ok) throw new Error('Ratings unavailable');
  const summary = await response.json();
  if (!Number.isInteger(summary.responseCount) || summary.responseCount < 0
    || !Array.isArray(summary.ratings) || summary.ratings.length !== 5
    || !Number.isFinite(Date.parse(summary.updatedAt))) throw new Error('Invalid summary');
  const bars = document.createElement('ol');
  bars.className = 'feedback-ratings__bars';
  for (const rating of summary.ratings) {
    if (typeof rating.label !== 'string' || !Number.isInteger(rating.count) || rating.count < 0
      || rating.count > summary.responseCount
      || (rating.count === 0 ? rating.average !== null
        : !Number.isFinite(rating.average) || rating.average < 1 || rating.average > 5)) throw new Error('Invalid rating');
    const item = document.createElement('li');
    item.className = 'feedback-ratings__item';
    item.style.setProperty('--rating-fill', `${(rating.average ?? 0) / 5 * 100}%`);
    const label = document.createElement('span');
    label.className = 'feedback-ratings__label';
    label.textContent = rating.label;
    const score = document.createElement('strong');
    score.className = 'feedback-ratings__score';
    score.append(rating.average === null ? '—' : rating.average.toFixed(2));
    const max = document.createElement('small');
    max.textContent = ' / 5';
    score.append(max);
    const track = document.createElement('div');
    track.className = 'feedback-ratings__track';
    track.setAttribute('aria-hidden', 'true');
    track.append(document.createElement('span'));
    const count = document.createElement('span');
    count.className = 'feedback-ratings__count';
    count.textContent = `${rating.count} 筆評分`;
    item.append(label, score, track, count);
    bars.append(item);
  }
  status.textContent = '';
  status.hidden = true;
  chart.replaceChildren(bars);
} catch {
  status.textContent = '評分統計暫時無法載入，歡迎先看看玩家的文字回饋。';
}
