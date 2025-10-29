// tabs/out.js (v12.3-beta rev3)
// OUT tab with layered overlays: History (fullscreen) -> Edit (near-fullscreen) -> Picker (smallest, from shared.js)
//
// Foreground order (z-index):
//   History overlay: 1900 (fullscreen)
//   Edit overlay:    1990 (near-fullscreen modal)
//   Picker overlay:  2000 (already defined in index.html/shared.js)
//
// What’s new:
// - Fullscreen History overlay with list via out_SearchHistory
// - Clicking ✎ opens a second, larger Edit overlay (above History)
// - Edit overlay shows material lines with qty; clicking material opens the existing picker (materials)
// - Save closes the Edit overlay and refreshes History list
// - Desktop edit modal ~800px wide, 86vh tall; Mobile edit modal is fullscreen

import {
  $, $$, STR, bindPickerInputs, openPicker,
  apiGet, apiPost, setBtnLoading, esc, toast, todayStr, stockBadge, clampList
} from '../js/shared.js';

/* ---------------- LINE BUILDER (for the main OUT form) ---------------- */
function OutLine(lang){
  const card=document.createElement('div');
  card.className='line';

  const name=document.createElement('input');
  name.placeholder=(lang==='th'?'พิมพ์เพื่อค้นหา…':'Type to search…');
  name.readOnly=true;
  name.setAttribute('data-picker','materials');

  const qty=document.createElement('input');
  qty.type='number'; qty.min='0'; qty.step='any'; qty.placeholder='0'; qty.inputMode='decimal';

  const note=document.createElement('input');
  note.placeholder=(lang==='th'?'หมายเหตุ (ถ้ามี)':'Note (optional)');

  const grid=document.createElement('div'); grid.className='grid';
  grid.appendChild(name); grid.appendChild(qty); grid.appendChild(note);

  const meta=document.createElement('div'); meta.className='rowitem'; meta.style.justifyContent='flex-start';
  const label=document.createElement('span'); label.className='meta'; label.textContent=(lang==='th'?'คงเหลือ: ':'Stock: ');
  let badge=document.createElement('span'); badge.className='badge'; badge.textContent='-';
  meta.appendChild(label); meta.appendChild(badge);

  const actions=document.createElement('div'); actions.className='actions';
  const rm=document.createElement('button'); rm.type='button'; rm.className='btn small'; rm.textContent='×'; rm.onclick=()=>card.remove();
  actions.appendChild(rm);

  card.appendChild(grid); card.appendChild(meta); card.appendChild(actions);

  name.addEventListener('click', ()=>openPicker(name,'materials', lang));

  name.addEventListener('change', async ()=>{
    const v=name.value.trim();
    if(!v){
      const bNew=document.createElement('span');
      bNew.className='badge'; bNew.textContent='-';
      meta.replaceChild(bNew,badge); badge=bNew; return;
    }
    const spin=document.createElement('span');
    spin.className='badge';
    spin.innerHTML='<span class="spinner" style="width:14px;height:14px;border-width:2px"></span>';
    meta.replaceChild(spin,badge); badge=spin;
    try{
      const res=await apiGet('getCurrentStock',{material:v});
      const n=(res&&res.ok)?Number(res.stock):null;
      const mn=(res&&res.ok)?Number(res.min||0):null;
      const bNew=stockBadge(n,mn);
      meta.replaceChild(bNew,badge); badge=bNew;
    }catch(e){
      const bErr=document.createElement('span');
      bErr.className='badge red'; bErr.textContent='!';
      meta.replaceChild(bErr,badge); badge=bErr;
    }
  });
  return card;
}

function collectLines(rootSel){
  const out=[];
  $$(rootSel+' .line').forEach(c=>{
    const nameEl=c.querySelector('input[data-picker="materials"]');
    const qtyEl=c.querySelector('input[type="number"]');
    const noteEl=c.querySelector('input[placeholder^="หมายเหตุ"],input[placeholder^="Note"]');
    const name=nameEl?nameEl.value.trim():'';
    const qty=Number(qtyEl?qtyEl.value:0)||0;
    const note=noteEl?noteEl.value.trim():'';
    if(name) out.push({name,qty,note});
  });
  return out;
}

/* ---------------- MAIN MOUNT ---------------- */
export default async function mount({ root, lang }){
  const S=STR[lang];

  root.innerHTML=`
    <section class="card glass">
      <h3>${S.outTitle}</h3>
      <div class="row">
        <div><label>${S.outDate}</label><input id="OutDate" type="date" /></div>
        <div><label>${S.proj}</label><input id="ProjectInput" data-picker="projects" placeholder="${S.pick}" readonly /></div>
      </div>
      <div class="row">
        <div><label>${S.contractor}</label><input id="ContractorInput" data-picker="contractors" placeholder="${S.pickAdd}" readonly /></div>
        <div><label>${S.requester}</label><input id="RequesterInput" data-picker="requesters" placeholder="${S.pickAdd}" readonly /></div>
      </div>
      <div class="row"><div><label>${S.note}</label><input id="Note" placeholder="${lang==='th'?'ถ้ามี':'Optional'}" /></div></div>
      <div class="lines" id="outLines"></div>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:.5rem;margin-top:.25rem;">
        <button class="btn small" id="openOutHistoryBtn" type="button">📜 ${lang==='th'?'ประวัติการจ่ายออก':'OUT History'}</button>
        <span class="meta">${lang==='th'?'ประวัติเป็นหน้าจอเต็ม':'History is full screen'}</span>
      </div>
    </section>

    <div class="fab" id="fab">
      <div class="mini" id="fabSubmitWrap" aria-hidden="true">
        <div class="label">${S.btnSubmit}</div>
        <button class="btn small primary" id="fabSubmitBtn" type="button">
          <span class="btn-label">💾</span>
          <span class="btn-spinner"><span class="spinner"></span></span>
        </button>
      </div>
      <div class="mini" id="fabAddWrap" aria-hidden="true">
        <div class="label">${S.btnAdd}</div>
        <button class="btn small" id="fabAddBtn" type="button">
          <span class="btn-label">＋</span>
          <span class="btn-spinner"><span class="spinner"></span></span>
        </button>
      </div>
      <button class="fab-main" id="fabMain" aria-expanded="false" aria-controls="fab">
        <span class="icon">＋</span>
      </button>
    </div>

    <!-- HISTORY OVERLAY (BOTTOM LAYER, FULLSCREEN) -->
    <div id="outHistoryOverlay" aria-hidden="true"
         style="position:fixed;inset:0;z-index:1900;display:none;align-items:stretch;justify-content:stretch;
                background:rgba(15,18,23,0.15);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);pointer-events:none;">
      <div id="outHistoryBox" class="glass" role="dialog" aria-modal="true"
           style="border-radius:0;box-shadow:var(--shadow-l);display:flex;flex-direction:column;width:100%;height:100%;overflow:hidden;">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:.75rem 1rem;
                    border-bottom:1px solid var(--border-weak);background:#fff;">
          <h3 style="margin:0;font-size:1rem;">📜 ${lang==='th'?'ประวัติการจ่ายออก':'OUT History'}</h3>
          <button class="btn small" id="closeOutHistory" type="button">${lang==='th'?'ปิด':'Close'}</button>
        </div>
        <div id="outHistList" class="picker-list" style="flex:1;overflow:auto;padding:.6rem .75rem;"></div>
      </div>
    </div>

    <!-- EDIT OVERLAY (MIDDLE LAYER, NEAR-FULLSCREEN ON DESKTOP, FULLSCREEN ON MOBILE) -->
    <div id="outEditOverlay" aria-hidden="true"
         style="position:fixed;inset:0;z-index:1990;display:none;align-items:center;justify-content:center;
                background:rgba(15,18,23,0.12);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);pointer-events:none;">
      <div id="outEditBox" class="glass" role="dialog" aria-modal="true"
           style="border-radius:18px;box-shadow:var(--shadow-l);display:flex;flex-direction:column;
                  width:100%;height:100%;overflow:hidden;max-width:800px;max-height:86vh;">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:.75rem 1rem;
                    border-bottom:1px solid var(--border-weak);background:#fff;">
          <h3 id="outEditTitle" style="margin:0;font-size:1rem;">${lang==='th'?'แก้ไขเอกสาร':'Edit Document'}</h3>
          <button class="btn small" id="closeOutEdit" type="button">${lang==='th'?'ปิด':'Close'}</button>
        </div>
        <div id="outEditBody" style="flex:1;overflow:auto;padding:.75rem;"></div>
        <div style="display:flex;justify-content:flex-end;gap:.5rem;padding:.75rem;border-top:1px solid var(--border-weak);background:#fff;">
          <button class="btn primary" id="saveOutEdit">${S.save}</button>
        </div>
      </div>
    </div>
  `;

  /* ---------------- BASIC FORM ---------------- */
  const lines=$('#outLines',root);
  function addLine(){ lines.appendChild(OutLine(lang)); bindPickerInputs(root,lang); }
  function clearForm(){
    lines.innerHTML=''; addLine();
    $('#Note',root).value=''; $('#OutDate',root).value=todayStr();
    $('#ProjectInput',root).value=''; $('#ContractorInput',root).value=''; $('#RequesterInput',root).value='';
  }

  const fab=$('#fab',root); const fabMain=$('#fabMain',root);
  const fabAdd=$('#fabAddBtn',root); const fabSubmit=$('#fabSubmitBtn',root);

  function toggleFab(){
    const expanded=fab.classList.toggle('expanded');
    fabMain.setAttribute('aria-expanded',expanded?'true':'false');
  }
  fabMain.addEventListener('click',toggleFab);
  fabAdd.addEventListener('click',addLine);

  fabSubmit.addEventListener('click',async()=>{
    setBtnLoading(fabSubmit,true);
    const p={
      type:'OUT',
      project:$('#ProjectInput',root).value.trim(),
      contractor:$('#ContractorInput',root).value.trim(),
      requester:$('#RequesterInput',root).value.trim(),
      note:$('#Note',root).value.trim(),
      date:$('#OutDate',root).value.trim(),
      lines:collectLines('#outLines')
    };
    if(!p.lines.length){
      setBtnLoading(fabSubmit,false);
      return toast(lang==='th'?'กรุณาเพิ่มรายการ':'Add at least one line');
    }
    try{
      const res=await apiPost('submitMovementBulk',p);
      if(res&&res.ok){
        toast((lang==='th'?'บันทึกแล้ว • เอกสาร ':'Saved • Doc ')+(res.docNo||''));
        clearForm(); if(historyOpen) await loadOutHistory();
      }else toast((res&&res.message)||'Error');
    }catch{
      toast(lang==='th'?'เกิดข้อผิดพลาดในการบันทึก':'Failed to submit');
    }finally{
      setBtnLoading(fabSubmit,false);
      fab.classList.remove('expanded');
      fabMain.setAttribute('aria-expanded','false');
    }
  });

  $('#ProjectInput',root).addEventListener('click',()=>openPicker($('#ProjectInput',root),'projects',lang));
  $('#ContractorInput',root).addEventListener('click',()=>openPicker($('#ContractorInput',root),'contractors',lang));
  $('#RequesterInput',root).addEventListener('click',()=>openPicker($('#RequesterInput',root),'requesters',lang));

  $('#OutDate',root).value=todayStr();
  addLine();

  /* ---------------- OVERLAYS & STATE ---------------- */
  const openHistoryBtn=$('#openOutHistoryBtn',root);
  const historyOverlay=$('#outHistoryOverlay',root);
  const historyBox=$('#outHistoryBox',root);
  const histList=$('#outHistList',root);
  const closeHistoryBtn=$('#closeOutHistory',root);

  const editOverlay=$('#outEditOverlay',root);
  const editBox=$('#outEditBox',root);
  const editTitle=$('#outEditTitle',root);
  const editBody=$('#outEditBody',root);
  const closeEditBtn=$('#closeOutEdit',root);
  const saveEditBtn=$('#saveOutEdit',root);

  let historyOpen=false;
  let editOpen=false;
  let currentEditDocNo=null;

  function openHistory(){
    historyOverlay.style.display='flex';
    historyOverlay.style.pointerEvents='auto';
    historyOverlay.setAttribute('aria-hidden','false');
    historyOpen=true;
    loadOutHistory();
  }
  function closeHistory(){
    historyOverlay.style.display='none';
    historyOverlay.style.pointerEvents='none';
    historyOverlay.setAttribute('aria-hidden','true');
    historyOpen=false;
  }
  openHistoryBtn.addEventListener('click',openHistory);
  closeHistoryBtn.addEventListener('click',()=>{ if(!editOpen) closeHistory(); });

  // Clicking dark area will close only the topmost overlay:
  historyOverlay.addEventListener('click',e=>{
    if(e.target===historyOverlay && !editOpen) closeHistory();
  });

  function openEdit(){
    editOverlay.style.display='flex';
    editOverlay.style.pointerEvents='auto';
    editOverlay.setAttribute('aria-hidden','false');
    editOpen=true;
    // Responsive sizing
    if(window.innerWidth<769){
      editBox.style.width='100%';
      editBox.style.height='100%';
      editBox.style.maxWidth='none';
      editBox.style.maxHeight='none';
      editBox.style.borderRadius='0';
    }else{
      editBox.style.width='800px';
      editBox.style.maxHeight='86vh';
      editBox.style.borderRadius='18px';
    }
  }
  function closeEdit(){
    editOverlay.style.display='none';
    editOverlay.style.pointerEvents='none';
    editOverlay.setAttribute('aria-hidden','true');
    editOpen=false;
    currentEditDocNo=null;
    editBody.innerHTML='';
  }
  closeEditBtn.addEventListener('click',closeEdit);
  editOverlay.addEventListener('click',e=>{ if(e.target===editOverlay) closeEdit(); });

  /* ---------------- HISTORY: LOAD & INTERACT ---------------- */
  async function loadOutHistory(){
    histList.innerHTML='';
    for(let i=0;i<6;i++){ const r=document.createElement('div'); r.className='skeleton-row'; histList.appendChild(r); }
    try{
      const res=await apiPost('out_SearchHistory',{limit:80});
      histList.innerHTML='';
      (res.rows||[]).forEach(r=>{
        const item=document.createElement('div');
        item.className='rowitem';
        item.style.flexDirection='column';
        item.innerHTML=`
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.3rem;">
            <strong>${esc(r.doc)} • ${esc(r.project||'-')}</strong>
            <button class="btn small" data-doc="${esc(r.doc)}">✎</button>
          </div>
          <div class="meta">${esc(r.ts)} • 👷 ${esc(r.contractor||'-')} • 🙋 ${esc(r.requester||'-')}</div>
          <div class="meta">${lang==='th'?'รายการ':'Item'}: ${esc(r.item)} (${esc(r.qty)})</div>
        `;
        histList.appendChild(item);
      });
      clampList(histList);
      histList.querySelectorAll('button[data-doc]').forEach(btn=>{
        btn.addEventListener('click',()=>openOutDoc(btn.dataset.doc));
      });
    }catch{
      histList.innerHTML=`<div class="rowitem"><div class="meta" style="color:#b91c1c">${lang==='th'?'โหลดข้อมูลไม่สำเร็จ':'Failed to load data'}</div></div>`;
    }
  }

  /* ---------------- EDIT DOC (ABOVE HISTORY) ---------------- */
  async function openOutDoc(docNo){
    const docTrimmed=(docNo||'').toString().trim();
    if(!docTrimmed) return toast(lang==='th'?'ไม่พบเลขที่เอกสาร':'Missing document number');

    // Show the edit overlay above the still-open history
    openEdit();
    editTitle.textContent = (lang==='th'?'แก้ไขเอกสาร ':'Edit Document ') + docTrimmed;
    editBody.innerHTML = `<div class="meta">${lang==='th'?'กำลังโหลด...':'Loading...'}</div>`;
    currentEditDocNo = docTrimmed;

    try{
      const res=await apiPost('out_GetDoc',{docNo:docTrimmed});
      if(!res||!res.ok||!res.doc) throw new Error(res?.message||'Not found');
      const d=res.doc;

      const linesHtml=d.lines.map(li=>{
        const itemEsc=esc(li.item);
        const qtyEsc=esc(li.qty);
        return `
          <div class="row" data-item="${itemEsc}" style="display:flex;gap:.5rem;align-items:center;">
            <input value="${itemEsc}" data-picker="materials" readonly style="flex:1" />
            <input type="number" step="any" value="${qtyEsc}" style="width:6rem"/>
            <button class="btn small red" type="button">×</button>
          </div>`;
      }).join('');

      editBody.innerHTML = `
        <div class="meta" style="margin-bottom:.5rem;">${esc(d.ts)} • ${esc(d.project||'-')}</div>
        <div class="lines" id="outEditLines">${linesHtml}</div>
        <div class="row" style="margin-top:.75rem;">
          <button class="btn small" id="addEditLine" type="button">＋ ${lang==='th'?'เพิ่มแถว':'Add line'}</button>
        </div>
      `;

      // Bind picker to the item inputs inside edit overlay
      bindPickerInputs(editBox, lang);
      // Also allow clicking to open picker (in case)
      $$('#outEditLines [data-picker="materials"]', editBox).forEach(inp=>{
        inp.addEventListener('click', ()=>openPicker(inp,'materials', lang));
      });
      // Remove line
      $$('#outEditLines .row button.red', editBox).forEach(b=>b.onclick=()=>b.closest('.row').remove());

      // Add line
      $('#addEditLine', editBox).onclick = () => {
        const wrap = $('#outEditLines', editBox);
        const row = document.createElement('div');
        row.className = 'row';
        row.style.cssText = 'display:flex;gap:.5rem;align-items:center;';
        row.setAttribute('data-item','');
        row.innerHTML = `
          <input value="" data-picker="materials" readonly style="flex:1" />
          <input type="number" step="any" value="0" style="width:6rem"/>
          <button class="btn small red" type="button">×</button>
        `;
        wrap.appendChild(row);
        bindPickerInputs(editBox, lang);
        const itemInput = row.querySelector('[data-picker="materials"]');
        itemInput.addEventListener('click', ()=>openPicker(itemInput,'materials', lang));
        row.querySelector('button.red').onclick = () => row.remove();
        itemInput.click(); // open picker immediately for convenience
      };

    }catch(err){
      console.warn('openOutDoc error:', err);
      editBody.innerHTML = `<div class="meta" style="color:#b91c1c">${lang==='th'?'โหลดไม่สำเร็จ':'Failed to load document'}</div>`;
    }
  }

  // Save edit
  saveEditBtn.addEventListener('click', async ()=>{
    if(!currentEditDocNo) return;
    const rows = $$('#outEditLines .row', editBox);
    const lines = [];
    rows.forEach(r=>{
      const item = (r.querySelector('[data-picker="materials"]')?.value || '').trim();
      const qty  = Number(r.querySelector('input[type="number"]')?.value || 0) || 0;
      if(item) lines.push({ name:item, qty });
    });
    if(!lines.length) return toast(lang==='th'?'ต้องมีอย่างน้อย 1 รายการ':'At least one line required');

    setBtnLoading(saveEditBtn, true);
    try{
      const res=await apiPost('out_UpdateDoc',{ docNo: currentEditDocNo.trim(), lines });
      if(res && res.ok){
        toast(lang==='th'?'บันทึกแล้ว':'Saved');
        await loadOutHistory();
        closeEdit(); // close only the edit modal; history stays open
      }else{
        toast(res?.message || 'Error');
      }
    }catch{
      toast(lang==='th'?'บันทึกไม่สำเร็จ':'Save failed');
    }finally{
      setBtnLoading(saveEditBtn, false);
    }
  });
}
