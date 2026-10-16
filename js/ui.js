// UI helpers shared by several screens.

// Every button tap gets a quick ring animation and a tiny vibration, so a press always feels registered.
document.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  navigator.vibrate?.(12);
  b.classList.remove("pulse"); void b.offsetWidth; b.classList.add("pulse");
}, true);

// Press-and-hold: runs fn only if the button stays pressed for ms, so a stray tap can't trigger it.
export function hold(btn, ms, fn) {
  let timer;
  const stop = () => { clearTimeout(timer); btn.classList.remove("on"); };
  btn.oncontextmenu = (e) => e.preventDefault();
  btn.onpointerdown = () => { btn.classList.add("on"); timer = setTimeout(() => { stop(); navigator.vibrate?.(60); fn(); }, ms); };
  btn.onpointerup = btn.onpointerleave = btn.onpointercancel = stop;
}

// Bottom sheet. bind(sheetElement, close) wires up the buttons inside it.
export function openSheet(html, bind) {
  const pad = document.getElementById("pad");
  pad.className = "open";
  pad.innerHTML = `<div class="sheet glass">${html}</div>`;
  const close = () => { pad.className = ""; pad.innerHTML = ""; pad.onclick = null; };
  pad.onclick = (e) => { if (e.target === pad) close(); };
  bind(pad.firstElementChild, close);
}

// Line icons (24x24) used in headers.
const ICONS = {
  list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  dots: '<circle cx="5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="19" cy="12" r="1.3" fill="currentColor"/>',
};
export const icon = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[n]}</svg>`;
