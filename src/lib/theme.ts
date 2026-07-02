export type ThemePref = 'system' | 'light' | 'dark';

const KEY = 'theme';

export function getThemePref(): ThemePref {
  const v = localStorage.getItem(KEY);
  return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
}

function prefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
}

export function resolveTheme(pref: ThemePref): 'light' | 'dark' {
  if (pref === 'system') return prefersDark() ? 'dark' : 'light';
  return pref;
}

export function applyTheme(pref: ThemePref): void {
  document.documentElement.setAttribute('data-theme', resolveTheme(pref));
}

export function setThemePref(pref: ThemePref): void {
  localStorage.setItem(KEY, pref);
  applyTheme(pref);
}

let listenerAttached = false;

/** מפעיל את התמה השמורה ומאזין לשינויים בהעדפת המערכת (במצב "מערכת") */
export function initTheme(): void {
  applyTheme(getThemePref());
  if (!listenerAttached && typeof window !== 'undefined') {
    listenerAttached = true;
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', () => {
        if (getThemePref() === 'system') applyTheme('system');
      });
  }
}
