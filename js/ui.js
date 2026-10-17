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
  springIn(pad.firstElementChild, tapped());
}

// Line icons (24x24) used in headers.
const ICONS = {
  list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  dots: '<circle cx="5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="19" cy="12" r="1.3" fill="currentColor"/>',
};
export const icon = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[n]}</svg>`;

// ---- motion ----
let lastBtn = null; // the button most recently pressed, so a popup can grow out of it
document.addEventListener("pointerdown", (e) => { lastBtn = e.target.closest("button"); }, true);
export const tapped = () => lastBtn;
const calm = matchMedia("(prefers-reduced-motion: reduce)");

// Spring/morph popup: the sheet grows out of the button you tapped and overshoots slightly before settling.
export function springIn(sheet, origin) {
  if (calm.matches || !sheet.animate) return;
  const f = sheet.getBoundingClientRect(), o = origin?.isConnected ? origin.getBoundingClientRect() : null;
  const from = o && o.width
    ? `translate(${o.left - f.left}px, ${o.top - f.top}px) scale(${o.width / f.width}, ${Math.max(o.height / f.height, 0.05)})`
    : "translateY(70px) scale(.96)";
  sheet.style.transformOrigin = "top left";
  sheet.animate([{ transform: from, borderRadius: "40px", opacity: 0.4 }, { transform: "none", borderRadius: "26px 26px 0 0", opacity: 1 }],
    { duration: 480, easing: "cubic-bezier(.34,1.45,.5,1)" });
  [...sheet.children].forEach((c, i) => c.animate([{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }],
    { duration: 300, delay: 120 + i * 30, fill: "backwards", easing: "ease-out" }));
}

// Page transition: the new screen slides in from the side you are moving towards (dir = -1, 0 or 1).
export function enter(dir = 0) {
  const a = document.getElementById("app");
  a.style.setProperty("--dx", dir * 28 + "px");
  a.classList.remove("enter"); void a.offsetWidth; a.classList.add("enter");
}

// Scroll reveal: cards, tiles and headings that start below the fold fade up as you scroll to them.
const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.1 });
new MutationObserver(() => {
  let n = 0;
  document.querySelectorAll("#app .card:not(.rv), #app .tile:not(.rv), #app h3:not(.rv)").forEach((el) => {
    el.classList.add("rv");
    if (el.getBoundingClientRect().top < innerHeight * 0.95) el.classList.add("in"); // already visible: no animation
    else { el.style.transitionDelay = (n++ % 3) * 70 + "ms"; io.observe(el); }
  });
}).observe(document.getElementById("app"), { childList: true });

// Hearth: a flame that grows with your streak and goes to cold embers when it is 0.
export function hearth(n) {
  const s = n ? 0.8 + Math.min(n, 10) * 0.05 : 0.7;
  return `<div class="hearth ${n ? "lit" : ""}"><svg viewBox="0 0 24 24" style="--s:${s}"><path class="f1" d="M12 2c.8 3.6 5.2 5.6 5.2 11a5.2 5.2 0 0 1-10.4 0c0-2 1-3.4 2.2-4.4.1 1.8 1 2.8 2 2.8-.2-3.4-.4-6 1-9.4z"/><path class="f2" d="M12 11c.5 1.6 2.4 2.5 2.4 4.6a2.4 2.4 0 0 1-4.8 0c0-1 .5-1.8 1.2-2.4.4 1 .9 1.3 1.2 1.3z"/></svg>
    <div><b>${n ? `${n} workout streak` : "The hearth is cold"}</b><span>${n ? "Keep the fire fed." : "Light it with a workout today."}</span></div></div>`;
}
