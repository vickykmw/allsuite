'use strict';
const $ = id => document.getElementById(id);
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const choices = ['Keep', 'Swap', 'Skip'];
let days = [], foods = [], selected = 0;
const alternatives = {
  '1-1': 'HOKUDAI MARCHE Café & Labo · dairy dessert at Hokkaido University Centennial Hall, Kita 9 Nishi 5. Check opening and leave time for the 16:00 concert arrival.',
  '2-1': 'Sandria main shop · takeaway sandwiches at Minami 8 Nishi 9, 758-14. Leave time for the 16:00 concert arrival.'
};
const memory = new Map();
function readChoice(key) {
  if (memory.has(key)) return memory.get(key);
  try { const value = localStorage.getItem(key); return choices.includes(value) ? value : 'Keep'; }
  catch { if (!$('save-status').textContent) $('save-status').textContent = 'Device storage unavailable. Choices will last only while this page stays open.'; return 'Keep'; }
}
function flexibleItems(day) {
  return [
    ...days[day][2].flatMap(([name, status], i) => status === 'locked' ? [] : [{name, key:`allsuite-v3-${day}-${i}`, alternative:alternatives[`${day}-${i}`]}]),
    ...foods.filter(food => food.day === day).map(food => ({name:food.name, key:`allsuite-food-${food.id}`, alternative:food.alternative, note:food.suggestion}))
  ];
}
function flexibleCard(item) {
  const choice = readChoice(item.key);
  const displayed = choice === 'Swap' ? item.alternative : item.name;
  return `<article class="item ${choice === 'Skip' ? 'skipped' : ''}" data-choice-key="${escapeHTML(item.key)}"><span class="state">Optional · ${choice === 'Skip' ? 'skipped' : choice === 'Swap' ? 'alternative selected' : 'kept'}</span><b class="activity">${escapeHTML(displayed)}</b>${choice === 'Swap' ? `<p class="muted">Instead of ${escapeHTML(item.name)}</p>` : ''}${item.note ? `<p class="muted">${escapeHTML(item.note)}</p>` : ''}<div class="alt"><small>SWAP OPTION</small>${escapeHTML(item.alternative)}</div><div class="choices" role="group" aria-label="Choice for ${escapeHTML(item.name)}">${choices.map(value => `<button type="button" data-key="${escapeHTML(item.key)}" data-choice="${value}" aria-pressed="${choice === value}">${value}</button>`).join('')}</div></article>`;
}
function lockedCard(name) { return `<article class="item locked"><span class="lock">🔒 Locked booking / arrangement</span><b>${escapeHTML(name)}</b></article>`; }
function startTime(name) { const match = name.match(/\b(\d{1,2}):(\d{2})/); return match ? Number(match[1]) * 60 + Number(match[2]) : null; }
function render() {
  $('days').innerHTML = days.map((day,i) => `<button type="button" id="day-${i}" class="day" role="tab" aria-selected="${i === selected}" aria-controls="day-panel" tabindex="${i === selected ? 0 : -1}" data-day="${i}">${day[0].split(' ')[1]}<strong>${day[0].split(' ')[0]}</strong><span>${['Thu','Fri','Sat','Sun','Mon','Tue','Wed'][i]}</span></button>`).join('');
  $('day-panel').setAttribute('aria-labelledby', `day-${selected}`);
  $('heading').textContent = `${days[selected][0]} · ${days[selected][1]}`;
  const locked = days[selected][2].filter(item => item[1] === 'locked').map(item => item[0]);
  const timed = locked.filter(name => startTime(name) !== null).sort((a,b) => startTime(a)-startTime(b));
  const untimed = locked.filter(name => startTime(name) === null);
  const flexible = flexibleItems(selected);
  $('schedule').innerHTML = `${timed.length ? '<h3>Scheduled · chronological</h3>' + timed.map(lockedCard).join('') : ''}${untimed.length ? '<h3>Time unspecified / all day</h3>' + untimed.map(lockedCard).join('') : ''}${flexible.length ? '<h3>Flexible · no time reserved</h3>' + flexible.map(flexibleCard).join('') : ''}`;
}
$('days').addEventListener('click', event => { const button = event.target.closest('[data-day]'); if (button) { selected = Number(button.dataset.day); render(); $(`day-${selected}`).focus(); } });
$('days').addEventListener('keydown', event => {
  if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
  event.preventDefault(); selected = event.key === 'Home' ? 0 : event.key === 'End' ? 6 : (selected + (event.key === 'ArrowRight' ? 1 : 6)) % 7;
  render(); $(`day-${selected}`).focus();
});
$('schedule').addEventListener('click', event => {
  const button = event.target.closest('[data-choice]');
  if (!button || !choices.includes(button.dataset.choice)) return;
  const {key, choice} = button.dataset;
  // Only keys belonging to flexible records are writable. Booking records never use saved choices.
  if (!flexibleItems(selected).some(item => item.key === key)) return;
  memory.set(key, choice);
  try { localStorage.setItem(key, choice); $('save-status').textContent = 'Choice saved on this device.'; }
  catch { $('save-status').textContent = 'Could not save on this device. Choice kept for this open page only.'; }
  render();
  [...$('schedule').querySelectorAll('[data-choice]')].find(el => el.dataset.key === key && el.dataset.choice === choice)?.focus();
});
async function checkOffline() {
  $('ready').textContent = 'Checking saved files…';
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) { $('ready').textContent = 'Not ready yet. Open online over HTTPS and check again after installation.'; return; }
  const channel = new MessageChannel();
  const timer = setTimeout(() => { $('ready').textContent = 'Cache check timed out. Reopen online and try again.'; channel.port1.close(); }, 5000);
  channel.port1.onmessage = ({data}) => {
    clearTimeout(timer); channel.port1.close();
    $('ready').textContent = data.ready ? 'Ready offline · all seven days, bookings, places and core files saved. Test in airplane mode.' : 'Not ready · some core files are missing. Reopen online to repair the cache, then check again.';
  };
  navigator.serviceWorker.controller.postMessage({type:'CHECK_OFFLINE'}, [channel.port2]);
}
$('check-cache').addEventListener('click', checkOffline);
async function init() {
  try {
    [days, foods] = await Promise.all(['itinerary.json','foods.json'].map(async file => { const response = await fetch(`./${file}`); if (!response.ok) throw new Error(file); return response.json(); }));
    render();
    $('booking-list').innerHTML = days.map(day => `<h3>${escapeHTML(day[0])}</h3>${day[2].filter(item => item[1] === 'locked').map(item => lockedCard(item[0])).join('')}`).join('');
    $('foods').innerHTML = foods.map(food => `<article class="food"><b>${escapeHTML(food.name)}</b><p>${escapeHTML(food.description)}</p><p class="muted">${escapeHTML(food.address)}</p><p>${escapeHTML(food.suggestion)}</p><p class="muted">${escapeHTML(food.note)}</p><div class="links"><a target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(food.name+' '+food.address)}">Map ↗</a><a target="_blank" rel="noopener noreferrer" href="${escapeHTML(food.source)}">Source ↗</a></div></article>`).join('');
  } catch { $('schedule').textContent = 'Itinerary could not load. Reconnect and reload to save the trip for offline use.'; }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', checkOffline);
    try { await navigator.serviceWorker.register('./sw.js'); await navigator.serviceWorker.ready; checkOffline(); }
    catch { $('ready').textContent = 'Offline setup failed. Reopen online over HTTPS and try again.'; }
  } else { $('ready').textContent = 'Offline caching is unavailable in this browser.'; }
}
init();
