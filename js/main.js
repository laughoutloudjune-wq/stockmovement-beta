/**
 * Inventory Frontend Main Controller
 * Version: v12.4 (2025-11-12)
 *
 * Added: OUT History tab (table view + overlay detail/edit)
 * Works with out_history.js
 */

import mountDashboard from '../tabs/dashboard.js';
import mountIn from '../tabs/in.js';
import mountOut from '../tabs/out.js';
import mountPurchase from '../tabs/purchase.js';
import mountAdjust from '../tabs/adjust.js';
import mountOutHistory from '../tabs/out_history.js';

import { $, $$, STR } from '../js/shared.js';

const APP_VERSION = "v12.4 (2025-11-12)";
const TZ = "Asia/Bangkok";

const SHEET = {
  MATERIALS: "MaterialMaster",
  PROJECTS: "Projects",
  CONTRACTORS: "Contractors",
  REQUESTERS: "Requesters",
  MOVES: "Movements",
  PURCHASES: "Purchases",
};

// Tab modules mapping
const TABS = {
  dashboard: mountDashboard,
  in: mountIn,
  out: mountOut,
  purchase: mountPurchase,
  adjust: mountAdjust,
  out_history: mountOutHistory, // ✅ new tab
};

let currentTab = null;
let currentLang = "th"; // default Thai

// ---------- UI helpers ----------
function setActiveTab(tab){
  $$("[data-tab]").forEach(b => b.classList.remove("active"));
  const btn = $(`[data-tab="${tab}"]`);
  if(btn) btn.classList.add("active");
}

// ---------- Tab Loader ----------
export async function loadTab(tab){
  try {
    const mountFn = TABS[tab];
    if (!mountFn) throw new Error(`Unknown tab: ${tab}`);

    const view = $("#view");
    setActiveTab(tab);
    view.innerHTML = `<div class="meta" style="padding:1rem;">กำลังโหลด...</div>`;

    await mountFn({ root: view, lang: currentLang });
    currentTab = tab;
    localStorage.setItem("lastTab", tab);
  } catch (err) {
    console.error("loadTab error:", err);
    $("#view").innerHTML = `<div class="meta" style="color:#b91c1c;padding:1rem;">Error loading tab: ${err.message}</div>`;
  }
}

// ---------- Navigation Setup ----------
export function initNav(){
  $$("[data-tab]").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const name = btn.getAttribute("data-tab");
      loadTab(name);
    });
  });

  const last = localStorage.getItem("lastTab");
  const startTab = last && TABS[last] ? last : "dashboard";
  loadTab(startTab);
}

// ---------- Footer info ----------
function showVersion(){
  const el = $("#appVersion");
  if(!el) return;
  el.textContent = APP_VERSION;
}

// ---------- Initialize ----------
document.addEventListener("DOMContentLoaded",()=>{
  showVersion();
  initNav();
});
