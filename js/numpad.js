// UI: custom number pad (bottom sheet). Weight can be typed in lb; it returns kg.
import { lbToKg } from "./logic.js";
const pad = document.getElementById("pad");

export function openPad({ title, value, isWeight, onDone }) {
  let v = value === "" || value == null ? "" : String(value);
  let lb = false, fresh = true; // fresh: first keypress replaces the old value

  const draw = () => {
    const unit = isWeight ? (lb ? "lb" : "kg") : "reps";
    const hint = lb && v ? `${lbToKg(parseFloat(v) || 0)} kg` : "";
    pad.innerHTML = `<div class="sheet glass">
      <div class="pad-top"><span>${title}</span>${isWeight ? `<button class="unit" data-k="u">${lb ? "lb" : "kg"}</button>` : ""}</div>
      <div class="pad-val">${v || "0"}<small>${unit}${hint ? ` = ${hint}` : ""}</small></div>
      <div class="keys">${[1,2,3,4,5,6,7,8,9,".",0,"⌫"].map(k => `<button data-k="${k}">${k}</button>`).join("")}</div>
      <button class="done" data-k="d">Done</button></div>`;
  };
  const close = () => { pad.className = ""; pad.innerHTML = ""; };

  pad.onclick = (e) => {
    if (e.target === pad) return close();
    const k = e.target.closest("[data-k]")?.dataset.k;
    if (k == null) return;
    if (k === "d") {
      const n = parseFloat(v); close();
      if (!isNaN(n)) onDone(isWeight && lb ? lbToKg(n) : n);
      return;
    }
    if (k === "u") lb = !lb;
    else {
      if (k === "⌫") v = fresh ? "" : v.slice(0, -1);
      else if (k === ".") { if (isWeight && !v.includes(".")) v = (fresh ? "0" : v || "0") + "."; }
      else if (v.length < 6 || fresh) v = (fresh ? "" : v) + k;
      fresh = false;
    }
    draw();
  };
  pad.className = "open"; draw();
}
