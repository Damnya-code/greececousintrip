const STORAGE_KEY = 'aegeanPlanningLounge';
const states = ['open', 'preferred', 'confirmed'];

const saved = (() => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
})();

saved.preferences ||= {};
saved.confirmations ||= {};

const persist = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));

document.querySelectorAll('[data-preference]').forEach((card) => {
  const key = card.dataset.preference;
  const buttons = card.querySelectorAll('[data-value]');
  const render = () => buttons.forEach((button) => button.setAttribute('aria-pressed', String(saved.preferences[key] === button.dataset.value)));
  buttons.forEach((button) => button.addEventListener('click', () => {
    saved.preferences[key] = saved.preferences[key] === button.dataset.value ? null : button.dataset.value;
    persist();
    render();
  }));
  render();
});

document.querySelectorAll('[data-confirmation]').forEach((item) => {
  const key = item.dataset.confirmation;
  const button = item.querySelector('.status-control');
  button.setAttribute('aria-live', 'polite');
  const render = () => {
    const state = saved.confirmations[key] || 'open';
    button.dataset.state = state;
    button.textContent = state[0].toUpperCase() + state.slice(1);
  };
  button.addEventListener('click', () => {
    const current = saved.confirmations[key] || 'open';
    saved.confirmations[key] = states[(states.indexOf(current) + 1) % states.length];
    persist();
    render();
  });
  render();
});
