export const icons = {
  help: '<circle cx="12" cy="12" r="8.5"/><path d="M10 9.4a2.1 2.1 0 0 1 4.2.4c0 1.5-2.2 1.7-2.2 3.25m0 3h.01"/>',
  expand: '<path d="M8 4H4v4m12-4h4v4M4 16v4h4m12-4v4h-4"/>',
  collapse: '<path d="M4 8h4V4m8 0v4h4M8 20v-4H4m16 0h-4v4"/>',
  play: '<path d="M8 5.9a.7.7 0 0 1 1.1-.6l9.2 6.1a.7.7 0 0 1 0 1.2l-9.2 6.1a.7.7 0 0 1-1.1-.6z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M9 6v12m6-12v12" stroke-width="2.8"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  pin: '<path d="M18 10c0 4.8-6 9.6-6 9.6S6 14.8 6 10a6 6 0 1 1 12 0Z"/><circle cx="12" cy="10" r="1.85"/>',
  mouse: '<rect x="6.5" y="3.5" width="11" height="17" rx="5.5"/><path d="M12 7.5v3"/>',
  wave: '<path d="M2.5 12h3l2.1-5 3.4 11 3.2-13 2.5 9 1.4-2H22"/>',
  download: '<path d="M12 4v11m-4-4 4 4 4-4M5 16v4h14v-4"/>',
  sound: '<path d="M4 10v4h3.5L12 18V6L7.5 10zm11.4-.6a3.8 3.8 0 0 1 0 5.2m2.6-7.8a7.4 7.4 0 0 1 0 10.4"/>',
  mute: '<path d="M4 10v4h3.5L12 18V6L7.5 10zm11.5-.5 5 5m0-5-5 5"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  compass: '<circle cx="12" cy="12" r="8.5"/><path d="m15.8 8.2-2 5.6-5.6 2 2-5.6z"/>',
  reset: '<path d="M5 9.5A7 7 0 1 1 5.6 16M4.8 4.9v4.8h4.8"/>',
}

export function drawIcon(slot: HTMLElement, name: keyof typeof icons) {
  slot.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`
}
