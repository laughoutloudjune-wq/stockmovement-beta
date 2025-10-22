// js/shared.js
export const API_URL = (window.API_URL || '').trim();

export const $  = (q, r = document) => r.querySelector(q);
export const $$ = (q, r = document) => Array.from(r.querySelectorAll(q));
export const esc = (v) => v == null ? "" : String(v).replace(/[&<>"']/g,(m)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));

export const STR = {
  th: {
    tabs: { dash:'สรุป', out:'จ่ายออก', in:'รับเข้า', adj:'ปรับปรุง', pur:'ขอจัดซื้อ' },
    out: {
      title:'ประวัติการจ่ายออก', project:'โครงการ', contractor:'ผู้รับเหมา', requester:'ผู้ขอเบิก', material:'วัสดุ',
      from:'จาก', to:'ถึง', search:'ค้นหา', reset:'ล้าง', result:'ผลลัพธ์',
      doc:'เลขที่เอกสาร', date:'วันที่', qty:'จำนวน', unit:'หน่วย', location:'สถานที่', note:'หมายเหตุ',
      actions:'การทำงาน', edit:'แก้ไข', save:'บันทึก', cancel:'ยกเลิก', noData:'ไม่พบข้อมูล', invalid:'กรุณากรอกข้อมูลให้ครบ', edited:'บันทึกการแก้ไขแล้ว'
    },
    in: { title:'รับเข้า', save:'บันทึก', material:'วัสดุ', qty:'จำนวน', unit:'หน่วย', date:'วันที่', project:'โครงการ', location:'สถานที่', note:'หมายเหตุ' },
    adj:{ title:'ปรับปรุงสต็อก', apply:'ปรับยอด', material:'วัสดุ', qty:'จำนวน', unit:'หน่วย', reason:'เหตุผล', date:'วันที่' },
    pur:{ title:'ขอจัดซื้อ', create:'สร้างคำขอ', status:'สถานะ', pending:'รออนุมัติ', approved:'อนุมัติ', rejected:'ปฏิเสธ' },
    ui: { refresh:'รีเฟรชข้อมูลแล้ว', failed:'ผิดพลาด' }
  },
  en: {
    tabs: { dash:'Dashboard', out:'Out', in:'In', adj:'Adjust', pur:'Purchase' },
    out: {
      title:'Material Out History', project:'Project', contractor:'Contractor', requester:'Requester', material:'Material',
      from:'From', to:'To', search:'Search', reset:'Reset', result:'Results',
      doc:'Doc No', date:'Date', qty:'Qty', unit:'Unit', location:'Location', note:'Note',
      actions:'Actions', edit:'Edit', save:'Save', cancel:'Cancel', noData:'No data', invalid:'Please complete required fields', edited:'Saved'
    },
    in: { title:'Receive In', save:'Save', material:'Material', qty:'Qty', unit:'Unit', date:'Date', project:'Project', location:'Location', note:'Note' },
    adj:{ title:'Adjust Stock', apply:'Apply', material:'Material', qty:'Qty', unit:'Unit', reason:'Reason', date:'Date' },
    pur:{ title:'Purchase', create:'Create', status:'Status', pending:'Pending', approved:'Approved', rejected:'Rejected' },
    ui: { refresh:'Data refreshed', failed:'Failed' }
  }
};

export function toast(msg){
  let el = document.getElementById('toast');
  if (!el){ el = document.createElement('div'); el.id='toast'; el.className='toast'; document.body.appendChild(el); }
  el.textContent = msg; el.classList.add('show'); clearTimeout(el._t); el._t=setTimeout(()=>el.classList.remove('show'), 2000);
}
export function currentLang(){ const s=localStorage.getItem('lang'); return s || (navigator.language?.startsWith('th')?'th':'th'); }
export function applyLangTexts(lang){ localStorage.setItem('lang', lang); }
export function setBtnLoading(btn, on){ if (!btn) return; btn.disabled=!!on; btn.classList.toggle('loading', !!on); }
export function cleanOldCache(){}

export function openModal(html, { onOpen } = {}){
  const ov = document.createElement('div');
  ov.className = 'modal-ov';
  ov.innerHTML = `<div class="modal glass">${html}</div>`;
  Object.assign(ov.style,{position:'fixed',inset:'0',background:'rgba(0,0,0,.35)',zIndex:4100,display:'grid',placeItems:'center'});
  document.body.appendChild(ov);
  const close = ()=>ov.remove();
  ov.addEventListener('click', e=>{ if (e.target===ov) close(); });
  onOpen && onOpen(ov, close);
  return { close, el: ov };
}

export function bindPickerInputs(root=document, lang='th'){
  root.querySelectorAll('input[data-src]').forEach(inp => {
    inp.addEventListener('focus', () => showPicker(inp.getAttribute('data-src'), inp, lang));
  });
  function showPicker(source, target, lang){
    const list = (LOOKUPS[source]) || [];
    const ov = document.getElementById('pickerOverlay');
    const listBox = document.getElementById('pickerList');
    const search = document.getElementById('pickerSearch');
    const addBtn = document.getElementById('pickerAdd');
    const addText = document.getElementById('pickerAddText');
    ov.classList.add('open'); ov.setAttribute('aria-hidden','false');
    const render = (q='') => {
      listBox.innerHTML = '';
      const qn = q.trim().toLowerCase();
      (qn? list.filter(x=>x.toLowerCase().includes(qn)) : list).slice(0,300).forEach((name)=>{
        const btn = document.createElement('button');
        btn.type='button'; btn.className='list-btn'; btn.textContent = name;
        btn.addEventListener('click', () => { setValue(target, name); close(); });
        listBox.appendChild(btn);
      });
      addText.textContent = q.trim();
      addBtn.style.display = q.trim()? 'block':'none';
    };
    const close = () => { ov.classList.remove('open'); ov.setAttribute('aria-hidden','true'); search.value=''; };
    render();
    search.oninput = (e)=>render(e.target.value);
    document.getElementById('pickerCancel').onclick = close;
    addBtn.onclick = () => { const v = search.value.trim(); if(!v) return; pushLookup(source, v); setValue(target, v); close(); };
    setTimeout(()=>search.focus(), 50);
  }
  function setValue(target, value){
    if (target.tagName === 'INPUT') target.value = value;
    else target.textContent = value;
    target.dispatchEvent(new Event('change'));
  }
}

/* ===== Backend client ===== */
function withTimeout(promise, ms = 20000){
  return new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('timeout')), ms);
    promise.then(v => { clearTimeout(t); res(v); }, e => { clearTimeout(t); rej(e); });
  });
}
async function fetchJson(url, body){
  if (!API_URL) throw new Error('API_URL not configured');
  const r = await withTimeout(fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body||{})
  }));
  if (!r.ok) throw new Error('HTTP '+r.status);
  const tx = await r.text();
  try { return JSON.parse(tx); } catch(e){ console.error('Bad JSON', tx); throw e; }
}
async function call(fn, payload){
  const res = await fetchJson(API_URL, { fn, payload });
  if (res && res.ok) return res.data ?? res;
  if (res && res.error) throw new Error(res.error);
  return res;
}

/* ===== Lookups cache ===== */
let LOOKUPS = { projects:[], contractors:[], requesters:[], materials:[], units:[] };
export function getLookups(){ return LOOKUPS; }
export function pushLookup(key, value){
  LOOKUPS[key] = Array.from(new Set([...(LOOKUPS[key]||[]), value]));
  try{ localStorage.setItem('cache:lookups', JSON.stringify(LOOKUPS)); }catch{}
}
export async function preloadLookups(){
  try{
    const data = await call('lookups', {});
    LOOKUPS = { ...LOOKUPS, ...data };
    localStorage.setItem('cache:lookups', JSON.stringify(LOOKUPS));
    return LOOKUPS;
  }catch(e){
    const raw = localStorage.getItem('cache:lookups');
    LOOKUPS = raw ? JSON.parse(raw) : LOOKUPS;
    return LOOKUPS;
  }
}

/* ===== Out endpoints ===== */
export async function outSearch(filters, page, per){ return await call('out.search', { filters, page, per }); }
export async function outUpdate(patch){ return await call('out.update', patch); }

/* ===== In / Adjust / Purchase endpoints ===== */
export async function inCreate(payload){ return await call('in.create', payload); }
export async function adjApply(payload){ return await call('adjust.apply', payload); }
export async function purSearch(filters, page, per){ return await call('purchase.search', { filters, page, per }); }
export async function purCreate(payload){ return await call('purchase.create', payload); }
export async function purUpdate(patch){ return await call('purchase.update', patch); }
