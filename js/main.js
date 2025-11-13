// main.js (Public v1.0) — Optimized router and tab system
import mountDashboard from '../tabs/dashboard.js';
import mountIn from '../tabs/in.js';
import mountOut from '../tabs/out.js';
import mountPurchase from '../tabs/purchase.js';
import mountAdjust from '../tabs/adjust.js';
import mountOutHistory from '../tabs/out_history.js';
import { $, $$ } from '../js/shared.js';

const TABS={
  dashboard:mountDashboard,
  in:mountIn,
  out:mountOut,
  purchase:mountPurchase,
  adjust:mountAdjust,
  out_history:mountOutHistory
};

let currentTab=null;
let lang='th';

export async function loadTab(tab){
  try{
    const fn=TABS[tab]; if(!fn) throw new Error(`Unknown tab: ${tab}`);
    $$('[data-tab]').forEach(b=>b.classList.remove('active'));
    const btn=$(`[data-tab="${tab}"]`); if(btn) btn.classList.add('active');
    const view=$('#view');
    view.innerHTML='<div class="meta" style="padding:1rem;">Loading...</div>';
    await fn({root:view,lang});
    currentTab=tab;
    localStorage.setItem('lastTab',tab);
  }catch(err){
    console.error(err);
    $('#view').innerHTML=`<div class="meta" style="color:red;padding:1rem;">Error: ${err.message}</div>`;
  }
}

export function initNav(){
  $$('[data-tab]').forEach(btn=>{
    btn.addEventListener('click',()=>loadTab(btn.dataset.tab));
  });
  const last=localStorage.getItem('lastTab');
  loadTab(last&&TABS[last]?last:'dashboard');
}

// listen for cross-tab switch
window.addEventListener('switch-tab',e=>{
  const name=e.detail; if(name) loadTab(name);
});

document.addEventListener('DOMContentLoaded',initNav);
