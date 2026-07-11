const VERSION = 1;
const PROFILE_PREFIX = 'aegeanPlanningProfile:';
const BOOKING_KEY = 'aegeanPlanningBookings:v1';
const LEGACY_KEY = 'aegeanPlanningLounge';

const profiles = {
  'cousin-a': { label: 'Cousin A', symbol: '●', markClass: 'mark-a' },
  'cousin-b': { label: 'Cousin B', symbol: '◆', markClass: 'mark-b' },
  'cousin-c': { label: 'Cousin C', symbol: '■', markClass: 'mark-c' }
};

const questions = [
  { key: 'stay', label: 'Stay style', question: 'What should each base prioritise?', options: [
    ['central', 'Central and walkable', 'Easy evenings, simple sightseeing and less reliance on transport.'],
    ['space', 'More space and a villa atmosphere', 'Shared living space, parking and somewhere comfortable to return to.'],
    ['mix', 'A mix by location', 'Athens central, Chania spacious, Heraklion practical.']
  ]},
  { key: 'pace', label: 'Daily pace', question: 'How full should the days feel?', options: [
    ['wander', 'Leave room to wander', 'Fewer fixed stops and more time wherever the day is working.'],
    ['balanced', 'Balanced', 'One main plan, a few highlights and breathing room around them.'],
    ['full', 'Make the most of every day', 'Earlier starts and more stops, without deliberately creating airport-level stress.']
  ]},
  { key: 'west', label: 'West Crete', question: 'Which western day deserves the longer journey?', options: [
    ['elafonisi', 'Elafonisi', 'Mountain roads, shallow turquoise water and pink-tinted sand.'],
    ['balos', 'Balos', 'Dramatic lagoon scenery, subject to final seasonal access and transport.'],
    ['chania', 'Chania and the nearby coast', 'Less driving, more harbour time and a beach closer to the base.']
  ]},
  { key: 'santorini', label: 'Santorini', question: 'How should we organise the island day?', note: 'Santorini remains part of the core itinerary. This choice concerns how the day is organised.', options: [
    ['organised', 'Organised day trip', 'The most structured option, with transfers and timings handled together.'],
    ['transfers', 'Ferry with pre-booked transfers', 'Independent ferry booking with transport between Athinios, Oia and Fira arranged in advance.'],
    ['local', 'Ferry and local transport', 'The most flexible option, with more responsibility for timing and connections.']
  ]},
  { key: 'weather', label: 'Weather fallback', question: 'What should still feel like a good day if the coast or ferries do not cooperate?', options: [
    ['history', 'History and museums', 'Knossos, Heraklion Archaeological Museum or another cultural route.'],
    ['drive', 'Another town or scenic drive', 'Rethymno, Agios Nikolaos or an inland village route.'],
    ['food', 'Slow food and café day', 'Markets, tavernas, coffee and considerably less concern about the forecast.']
  ]}
];

const bookingItems = [
  ['flights', 'Flights', 'Athens arrivals and Heraklion departures.', 'Confirm individual departure airports, arrival times, baggage and the multi-city fare.'],
  ['ferry', 'Overnight ferry', 'Piraeus to Souda, private cabin and boarding details.', 'Confirm the sailing, three-berth cabin, luggage arrangements and transfer to Piraeus.'],
  ['accommodation', 'Accommodation', 'Athens, Chania and Heraklion stays.', 'Prioritise two bedrooms, suitable room arrangements, useful locations and parking where needed.'],
  ['car', 'Rental car', 'Souda pickup, registered drivers, insurance and Heraklion return.', 'Confirm the driver requirements, one-way return terms, coverage and airport drop-off.'],
  ['santorini', 'Santorini day trip', 'Ferry, island transfers and confirmed October schedule.', 'Confirm the Heraklion return sailing, Athinios transfers and sufficient port buffer time.'],
  ['tickets', 'Tickets and reservations', 'Acropolis entry and priority meals.', 'Secure any timed entry and reserve only the restaurants where timing genuinely matters.']
];

let activeProfile = localStorage.getItem('aegeanActiveProfile') || 'cousin-a';
let activeView = localStorage.getItem('aegeanPlanningView') || 'mine';
if (!profiles[activeProfile]) activeProfile = 'cousin-a';
if (!['mine', 'group'].includes(activeView)) activeView = 'mine';

const blankProfile = (profile) => ({ version: VERSION, profile, preferences: {}, wildcard: '' });
const loadProfile = (profile) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(PROFILE_PREFIX + profile));
    return parsed?.version === VERSION && parsed.profile === profile ? parsed : blankProfile(profile);
  } catch { return blankProfile(profile); }
};
const saveProfile = (data) => localStorage.setItem(PROFILE_PREFIX + data.profile, JSON.stringify(data));
const allProfiles = () => Object.keys(profiles).reduce((result, key) => ({ ...result, [key]: loadProfile(key) }), {});
const loadBookings = () => {
  try { return JSON.parse(localStorage.getItem(BOOKING_KEY)) || {}; }
  catch { return {}; }
};
let bookings = loadBookings();
const saveBookings = () => localStorage.setItem(BOOKING_KEY, JSON.stringify(bookings));

const profileMark = (key, includeLabel = true) => {
  const profile = profiles[key];
  return `<span class="marker-chip"><span class="profile-mark ${profile.markClass}" aria-hidden="true">${profile.symbol}</span>${includeLabel ? profile.label : ''}</span>`;
};
const optionLabel = (question, value) => question.options.find((option) => option[0] === value)?.[1] || 'No selection';

function renderProfileControls() {
  document.querySelectorAll('[data-profile]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.profile === activeProfile)));
  document.querySelectorAll('[data-view]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.view === activeView)));
  document.querySelector('#answering-label').textContent = `Answering as ${profiles[activeProfile].label}`;
  document.querySelector('#wildcard-profile-label').textContent = `${profiles[activeProfile].label}’s idea`;
}

function resultFor(question, data) {
  const choices = Object.keys(profiles).map((key) => data[key].preferences[question.key]).filter(Boolean);
  if (choices.length < 2) return '';
  const counts = choices.reduce((result, value) => ({ ...result, [value]: (result[value] || 0) + 1 }), {});
  const top = Math.max(...Object.values(counts));
  if (choices.length === 3 && top === 3) return 'Agreement';
  if (top === 2) return 'Majority';
  if (choices.length === 3 && Object.keys(counts).length === 3) return 'Three good arguments';
  return '';
}

function renderGroupState(data) {
  const answered = Object.keys(profiles).filter((key) => Object.keys(data[key].preferences).length || data[key].wildcard.trim()).length;
  const hasSplit = questions.some((question) => resultFor(question, data) === 'Three good arguments');
  let message = 'No opinions recorded yet. The diplomacy remains theoretical.';
  if (answered === 1) message = 'First opinion recorded. Two cousins remain diplomatically uncommitted.';
  if (answered === 2) message = 'Two opinions are in. A majority may already be forming.';
  if (answered === 3) message = hasSplit ? 'Three different choices. No crisis—just something worth discussing.' : 'All three profiles are here. Group View is ready.';
  document.querySelector('#group-state').textContent = message;
}

function renderPreferences() {
  const data = allProfiles();
  const mine = data[activeProfile];
  const grid = document.querySelector('#preference-grid');
  grid.innerHTML = questions.map((question, index) => {
    const options = question.options.map(([value, title, note]) => {
      const selectedProfiles = Object.keys(profiles).filter((key) => data[key].preferences[question.key] === value);
      const visibleProfiles = activeView === 'group' ? selectedProfiles : selectedProfiles.filter((key) => key === activeProfile);
      return `<button type="button" class="option-button" data-question="${question.key}" data-option="${value}" aria-pressed="${mine.preferences[question.key] === value}"><span><strong>${title}</strong><small>${note}</small></span><span class="marker-list">${visibleProfiles.map((key) => profileMark(key)).join('')}</span></button>`;
    }).join('');
    const result = activeView === 'group' ? resultFor(question, data) : '';
    return `<article class="preference-card"><span class="question-index">${String(index + 1).padStart(2, '0')} / ${question.label}</span><h3>${question.question}</h3>${question.note ? `<p class="question-note">${question.note}</p>` : ''}<div class="option-list">${options}</div>${result ? `<span class="result-badge">${result}</span>` : ''}</article>`;
  }).join('');
  grid.querySelectorAll('.option-button').forEach((button) => button.addEventListener('click', () => {
    const profile = loadProfile(activeProfile);
    profile.preferences[button.dataset.question] = button.dataset.option;
    saveProfile(profile);
    renderAll();
  }));
  renderGroupState(data);
}

function renderWildcard() {
  const data = allProfiles();
  const input = document.querySelector('#wildcard-input');
  input.value = data[activeProfile].wildcard;
  document.querySelector('#wildcard-count').textContent = input.value.length;
  const visibleKeys = activeView === 'group' ? Object.keys(profiles) : [activeProfile];
  document.querySelector('#wildcard-group').innerHTML = visibleKeys.filter((key) => data[key].wildcard.trim()).map((key) => `<div class="wildcard-idea">${profileMark(key)}<span>${escapeHtml(data[key].wildcard)}</span></div>`).join('');
}

function escapeHtml(value) {
  const element = document.createElement('div');
  element.textContent = value;
  return element.innerHTML;
}

function renderAll() {
  renderProfileControls();
  renderPreferences();
  renderWildcard();
}

document.querySelectorAll('[data-profile]').forEach((button) => button.addEventListener('click', () => {
  activeProfile = button.dataset.profile;
  localStorage.setItem('aegeanActiveProfile', activeProfile);
  renderAll();
}));
document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => {
  activeView = button.dataset.view;
  localStorage.setItem('aegeanPlanningView', activeView);
  renderAll();
}));

document.querySelector('#wildcard-input').addEventListener('input', (event) => {
  const profile = loadProfile(activeProfile);
  profile.wildcard = event.target.value;
  saveProfile(profile);
  document.querySelector('#wildcard-count').textContent = event.target.value.length;
  renderGroupState(allProfiles());
  if (activeView === 'group') renderWildcard();
});

function summaryFor(profileKey) {
  const data = loadProfile(profileKey);
  const lines = questions.map((question) => `${question.label}: ${optionLabel(question, data.preferences[question.key])}`);
  lines.push(`Wildcard idea: ${data.wildcard.trim() || 'None yet'}`);
  return `MY GREECE TRIP PICKS — ${profiles[profileKey].label.toUpperCase()}\n\n${lines.join('\n')}`;
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const textarea = document.createElement('textarea');
  textarea.value = text; document.body.appendChild(textarea); textarea.select(); document.execCommand('copy'); textarea.remove();
}
const feedback = (message) => { document.querySelector('#action-feedback').textContent = message; };

document.querySelector('#copy-summary').addEventListener('click', async () => {
  try { await copyText(summaryFor(activeProfile)); feedback('Readable summary copied for the group chat.'); }
  catch { feedback('Copy failed. Use Export My Choices and copy the text manually.'); }
});

const encode = (data) => btoa(unescape(encodeURIComponent(JSON.stringify(data)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const decode = (text) => JSON.parse(decodeURIComponent(escape(atob(text.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(text.length / 4) * 4, '=')))));

document.querySelector('#export-choices').addEventListener('click', async () => {
  const encoded = encode(loadProfile(activeProfile));
  const exportText = `CT1:${encoded}`;
  document.querySelector('#share-output').value = exportText;
  history.replaceState(null, '', `#choices=${encoded}`);
  try { await copyText(exportText); feedback(`${profiles[activeProfile].label} export copied.`); }
  catch { feedback('Export created. Copy it from the field above.'); }
});

const importDialog = document.querySelector('#import-dialog');
document.querySelector('#open-import').addEventListener('click', () => { document.querySelector('#import-feedback').textContent = ''; importDialog.showModal(); });
document.querySelector('#confirm-import').addEventListener('click', () => {
  const field = document.querySelector('#import-input');
  const raw = field.value.trim().replace(/^CT1:/, '').replace(/^.*#choices=/, '');
  try {
    const incoming = decode(raw);
    if (incoming.version !== VERSION || !profiles[incoming.profile] || typeof incoming.preferences !== 'object' || typeof incoming.wildcard !== 'string') throw new Error('format');
    const existing = loadProfile(incoming.profile);
    const hasExisting = Object.keys(existing.preferences).length || existing.wildcard.trim();
    if (hasExisting && !window.confirm(`Replace the existing choices for ${profiles[incoming.profile].label}? Other profiles will not be changed.`)) return;
    saveProfile({ version: VERSION, profile: incoming.profile, preferences: incoming.preferences, wildcard: incoming.wildcard.slice(0, 160) });
    field.value = '';
    document.querySelector('#import-feedback').textContent = `${profiles[incoming.profile].label} imported successfully.`;
    renderAll();
  } catch { document.querySelector('#import-feedback').textContent = 'That export could not be read. Check that the complete CT1 string was pasted.'; }
});

document.querySelector('#reset-choices').addEventListener('click', () => {
  if (!window.confirm(`Reset all saved choices for ${profiles[activeProfile].label}? This cannot be undone.`)) return;
  localStorage.removeItem(PROFILE_PREFIX + activeProfile);
  history.replaceState(null, '', location.pathname);
  document.querySelector('#share-output').value = '';
  feedback(`${profiles[activeProfile].label} choices reset.`);
  renderAll();
});

function renderBookings() {
  const list = document.querySelector('#booking-list');
  list.innerHTML = bookingItems.map(([key, title, description, details], index) => {
    const stored = bookings[key] || {};
    const item = {
      status: ['open', 'ready', 'confirmed'].includes(stored.status) ? stored.status : 'open',
      lead: ['shared', ...Object.keys(profiles)].includes(stored.lead) ? stored.lead : 'shared'
    };
    bookings[key] = item;
    const leadOptions = [['shared', 'Shared'], ...Object.entries(profiles).map(([value, profile]) => [value, profile.label])].map(([value, label]) => `<option value="${value}" ${item.lead === value ? 'selected' : ''}>${label}</option>`).join('');
    return `<article class="booking-card" data-booking="${key}"><span class="question-index">${String(index + 1).padStart(2, '0')}</span><div><h3>${title}</h3><p>${description}</p><details><summary>View details</summary><p>${details}</p></details></div><div class="booking-controls"><button type="button" class="status-control" data-state="${item.status}" aria-label="Change booking status for ${title}" aria-live="polite">${item.status === 'ready' ? 'Ready to book' : item.status[0].toUpperCase() + item.status.slice(1)}</button><div class="lead-control"><label for="lead-${key}">Lead</label><select id="lead-${key}" aria-label="Lead for ${title}">${leadOptions}</select></div></div></article>`;
  }).join('');
  list.querySelectorAll('.booking-card').forEach((card) => {
    const key = card.dataset.booking;
    const statusButton = card.querySelector('.status-control');
    statusButton.addEventListener('click', () => {
      bookings[key] ||= { status: 'open', lead: 'shared' };
      const states = ['open', 'ready', 'confirmed'];
      bookings[key].status = states[(states.indexOf(bookings[key].status) + 1) % states.length];
      saveBookings(); renderBookings();
    });
    card.querySelector('select').addEventListener('change', (event) => {
      bookings[key] ||= { status: 'open', lead: 'shared' };
      bookings[key].lead = event.target.value; saveBookings();
    });
  });
}

if (localStorage.getItem(LEGACY_KEY) && !localStorage.getItem('aegeanLegacyNoticeDismissed')) {
  feedback('The lounge now uses separate cousin profiles. Previous group-wide picks were left untouched in local storage.');
  localStorage.setItem('aegeanLegacyNoticeDismissed', 'true');
}

const hashChoices = location.hash.match(/^#choices=(.+)$/)?.[1];
if (hashChoices) { document.querySelector('#import-input').value = `CT1:${hashChoices}`; importDialog.showModal(); }

renderAll();
renderBookings();
