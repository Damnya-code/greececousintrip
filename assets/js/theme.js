(function () {
  const key = 'aegeanTheme';
  const root = document.documentElement;
  const saved = localStorage.getItem(key);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  function applyTheme(theme) {
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    document.querySelectorAll('.theme-toggle').forEach((button) => {
      const dark = theme === 'dark';
      button.setAttribute('aria-pressed', String(dark));
      button.setAttribute('aria-label', dark ? 'Switch to daylight theme' : 'Switch to moonlight theme');
      button.title = dark ? 'Switch to daylight theme' : 'Switch to moonlight theme';
    });
  }

  applyTheme(saved || (prefersDark ? 'dark' : 'light'));

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav').forEach((header) => {
      let tools = header.querySelector('.nav-tools');
      if (!tools) {
        tools = document.createElement('div');
        tools.className = 'nav-tools';
        const existingAction = header.querySelector(':scope > .nav-button');
        if (existingAction) tools.append(existingAction);
        header.append(tools);
      }
      const button = document.createElement('button');
      button.className = 'theme-toggle';
      button.type = 'button';
      button.innerHTML = '<span class="theme-toggle-track" aria-hidden="true"><span class="theme-icon theme-sun">☀</span><span class="theme-icon theme-moon">☾</span><span class="theme-toggle-thumb"></span></span>';
      button.addEventListener('click', () => {
        const theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
        localStorage.setItem(key, theme);
        applyTheme(theme);
      });
      tools.append(button);
    });
    applyTheme(root.dataset.theme);
  });
})();
