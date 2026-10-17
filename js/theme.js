// THEME: the cabin scene, a palette that drifts with the clock, falling snow, and the greeting.
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hexOf = (c) => "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

// Colours at key hours; between them everything blends smoothly.
// hour, background, text, muted, accent (ember), far ridge, near ridge, window glow (0 to 1)
const K = [
  [0,    "#0b0f0e", "#e6ebe7", "#8a9791", "#ee8a3b", "#141b1a", "#0f1514", 1],
  [6,    "#151817", "#eee9e1", "#9a9a92", "#f0a263", "#1f2523", "#181e1c", 0.7],
  [12,   "#1b2322", "#f1f5f2", "#98a6a1", "#e8803a", "#26302e", "#202927", 0.15],
  [17.5, "#1a1411", "#f2e9dd", "#a39687", "#f59a47", "#261c17", "#1e1612", 0.9],
  [21,   "#100e0d", "#ece6de", "#8f867d", "#f08c3c", "#1a1513", "#131010", 1],
  [24,   "#0b0f0e", "#e6ebe7", "#8a9791", "#ee8a3b", "#141b1a", "#0f1514", 1],
];
let previewing = false;
const hourNow = () => { const d = new Date(); return d.getHours() + d.getMinutes() / 60; };

export function applyTheme(h = hourNow()) {
  const n = K.findIndex((k, i) => i < K.length - 1 && h >= k[0] && h < K[i + 1][0]);
  const a = K[n], b = K[n + 1], t = (h - a[0]) / (b[0] - a[0]);
  const mix = (i) => hexOf(rgb(a[i]).map((v, j) => v + (rgb(b[i])[j] - v) * t));
  const r = document.documentElement.style, [tr, tg, tb] = rgb(mix(2));
  [["--bg", 1], ["--text", 2], ["--mute", 3], ["--accent", 4], ["--r1", 5], ["--r2", 6]].forEach(([v, i]) => r.setProperty(v, mix(i)));
  r.setProperty("--win", String(a[7] + (b[7] - a[7]) * t));
  r.setProperty("--panel", `rgba(${tr},${tg},${tb},.06)`);
  r.setProperty("--line", `rgba(${tr},${tg},${tb},.12)`);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", mix(1));
  // A sun by day and a moon by night, travelling across the sky.
  const day = h >= 6 && h < 18, p = (day ? h - 6 : h >= 18 ? h - 18 : h + 6) / 12, orb = document.getElementById("orb");
  orb.style.left = 8 + 80 * p + "%";
  orb.style.top = 22 - 15 * Math.sin(Math.PI * p) + "%";
  r.setProperty("--orb", day ? "#f1e3c0" : "#dfe7e3");
}

// Settings > "Watch a day pass": sweeps through 24 hours in a few seconds.
export function previewDay(ms = 9000) {
  previewing = true;
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / ms);
    applyTheme(Math.min(23.99, k * 24));
    if (k < 1) requestAnimationFrame(step); else { previewing = false; applyTheme(); }
  };
  requestAnimationFrame(step);
}

export function greeting(h = hourNow()) {
  if (h < 5) return "The cabin is asleep. Rest, then train.";
  if (h < 9) return "First light on the snow.";
  if (h < 12) return "Morning. The fire is lit.";
  if (h < 16) return "A quiet afternoon. Good for lifting.";
  if (h < 19) return "Dusk settles over the ridge.";
  if (h < 23) return "Evening. Wood stacked, fire low.";
  return "Late. Sleep is part of the work.";
}

function buildScene() {
  const tree = (x, y, s = 1) => `<path class="r2" d="M${x} ${y}l${-6 * s} ${16 * s}h${12 * s}z"/>`;
  document.getElementById("scene").innerHTML = `<svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <path class="r1" d="M0 118L60 66l50 38 62-56 70 62 58-38 60 44 40-22v118H0z"/>
    <path class="sn" d="M172 48l-15 18 9-5 6 8 6-9 8 6z"/><path class="sn" d="M60 66l-12 15 8-4 5 6 5-7z"/><path class="sn" d="M300 72l-11 14 7-3 5 6 4-6z"/>
    <path class="r2" d="M0 164l50-34 70 36 70-42 70 46 70-34 70 30v58H0z"/>
    ${tree(22, 150)}${tree(40, 146, 1.2)}${tree(62, 152, 0.9)}${tree(86, 156)}${tree(236, 170, 1.1)}${tree(256, 166)}
    <circle class="gl" cx="316" cy="163" r="20"/>
    <rect class="cb" x="300" y="152" width="34" height="22"/><path class="cb" d="M295 153l22-16 22 16z"/><rect class="cb" x="326" y="138" width="5" height="10"/>
    <rect class="wn" x="311" y="158" width="9" height="9"/>
    <circle class="sm" cx="328" cy="134" r="3"/><circle class="sm" cx="328" cy="134" r="3" style="animation-delay:2s"/><circle class="sm" cx="328" cy="134" r="3" style="animation-delay:4s"/></svg>`;
}

function startSnow(canvas) {
  const ctx = canvas.getContext("2d"), dpr = devicePixelRatio || 1;
  let W, H, flakes = [], raf = 0;
  const size = () => { W = innerWidth; H = innerHeight; canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  size(); addEventListener("resize", size);
  flakes = Array.from({ length: Math.min(60, Math.round(innerWidth / 7)) }, () =>
    ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.7 + 0.6, v: Math.random() * 0.4 + 0.15, s: Math.random() * 6.28 }));
  const frame = (t) => {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgba(236,242,239,.7)";
    for (const f of flakes) {
      f.y += f.v; f.x += Math.sin(t / 2200 + f.s) * 0.25;
      if (f.y > H + 4) { f.y = -4; f.x = Math.random() * W; }
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.283); ctx.fill();
    }
    raf = requestAnimationFrame(frame);
  };
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return frame(0), cancelAnimationFrame(raf); // one still frame
  frame(0);
  document.addEventListener("visibilitychange", () => { cancelAnimationFrame(raf); if (!document.hidden) raf = requestAnimationFrame(frame); });
}

export function initTheme() {
  buildScene(); startSnow(document.getElementById("snow")); applyTheme();
  setInterval(() => { if (!previewing) applyTheme(); }, 60000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && !previewing) applyTheme(); });
}
