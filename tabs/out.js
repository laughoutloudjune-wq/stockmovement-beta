// tabs/out.js (v12.3-beta rev4)
// OUT tab with a single medium-sized modal used for History and Edit pages (page-switching inside one overlay)
// Flow:
//   - Click 📜 History -> open modal (History page, not fullscreen).
//   - Click ✎ on a row -> switch modal content to Edit page.
//   - Click Save -> return to History page and refresh list.
// UX sizing:
//   - Desktop modal ~760px wide, ~84vh height (not full screen).
//   - Mobile modal ~96vw x ~92vh (still not full screen).
//   - Material picker (from shared.js) remains the smallest modal and stays on top (higher z-index).

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
        <span class="meta">${lang==='th'?'หน้าต่างจะไม่เต็มจอ':'Modal is not fullscreen'}</span>
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

    <!-- SINGLE MODAL OVERLAY (used for both History and Edit by page-switching) -->
    <div id="outModalOverlay" aria-hidden="true"
         style="position:fixed;inset:0;z-index:1950;display:none;align-items:center;justify-content:center;
                background:rgba(15,18,23,0.12);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);pointer-events:none;">
      <div id="outModalBox" class="glass" role="dialog" aria-modal="true"
           style="border-radius:18px;box-shadow:var(--shadow-l);display:flex;flex-direction:column;overflow:hidden;
                  width:96vw;max-width:760px;height:92vh;max-height:84vh;background:#fff;">
        <div id="outModalHeader" style="display:flex;gap:.5rem;align-items:center;justify-content:space-between;padding:.75rem 1rem;border-bottom:1px solid var(--border-weak);">
          <div style="display:flex;gap:.5rem;align-items:center;">
            <button class="btn small" id="outModalBackBtn" type="button" style="display:none">←</button>
            <h3 id="outModalTitle" style="margin:0;font-size:1rem;">📜 ${lang==='th'?'ประวัติการจ่ายออก':'OUT History'}</h3>
          </div>
          <button class="btn small" id="outModalCloseBtn" type="button">${lang==='th'?'ปิด':'Close'}</button>
        </div>
        <div id="outModalBody" style="flex:1;overflow:auto;padding:.75rem;"></div>
        <div id="outModalFooter" style="display:flex;justify-content:flex-end;gap:.5rem;padding:.75rem;border-top:1px solid var(--border-weak);background:#fff;"></div>
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
        clearForm(); if(modalState.page==='history') await loadHistoryIntoModal();
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

  /* ---------------- MODAL (ONE OVERLAY, TWO PAGES) ---------------- */
  const openHistoryBtn=$('#openOutHistoryBtn',root);
  const overlay=$('#outModalOverlay',root);
  const box=$('#outModalBox',root);
  const hdrBack=$('#outModalBackBtn',root);
  const hdrTitle=$('#outModalTitle',root);
  const hdrClose=$('#outModalCloseBtn',root);
  const body=$('#outModalBody',root);
  const ftr=$('#outModalFooter',root);

  const modalState = { page:'history', currentDocNo:null };

  function openModal(){
    // Responsive sizing (not fullscreen)
    if(window.innerWidth<769){
      box.style.width='96vw';
      box.style.height='92vh';
      box.style.maxWidth='96vw';
      box.style.maxHeight='92vh';
      box.style.borderRadius='14px';
    }else{
      box.style.width='760px';
      box.style.height='84vh';
      box.style.maxWidth='760px';
      box.style.maxHeight='84vh';
      box.style.borderRadius='18px';
    }
    overlay.style.display='flex';
    overlay.style.pointerEvents='auto';
    overlay.setAttribute('aria-hidden','false');
  }
  function closeModal(){
    overlay.style.display='none';
    overlay.style.pointerEvents='none';
    overlay.setAttribute('aria-hidden','true');
    modalState.page='history';
    modalState.currentDocNo=null;
    body.innerHTML='';
    ftr.innerHTML='';
    hdrBack.style.display='none';
    hdrTitle.textContent = (lang==='th'?'ประวัติการจ่ายออก':'OUT History');
  }

  overlay.addEventListener('click',e=>{ if(e.target===overlay) closeModal(); });
  hdrClose.addEventListener('click',closeModal);
  hdrBack.addEventListener('click',async()=>{
    // Back to history page
    modalState.page='history';
    modalState.currentDocNo=null;
    hdrBack.style.display='none';
    hdrTitle.textContent = (lang==='th'?'ประวัติการจ่ายออก':'OUT History');
    await loadHistoryIntoModal();
  });

  openHistoryBtn.addEventListener('click', async ()=>{
    modalState.page='history';
    openModal();
    await loadHistoryIntoModal();
  });

  async function loadHistoryIntoModal(){
    // Header/footer for history page
    ftr.innerHTML='';
    body.innerHTML='';
    for(let i=0;i<6;i++){
      const r=document.createElement('div'); r.className='skeleton-row';
      r.style.height='38px'; r.style.margin='4px 0';
      body.appendChild(r);
    }
    try{
      const res=await apiPost('out_SearchHistory',{limit:80});
      body.innerHTML='';
      const listWrap=document.createElement('div');
      listWrap.className='picker-list';
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
        listWrap.appendChild(item);
      });
      body.appendChild(listWrap);
      clampList(listWrap);
      body.querySelectorAll('button[data-doc]').forEach(btn=>{
        btn.addEventListener('click',()=>openEditPage(btn.dataset.doc));
      });
    }catch{
      body.innerHTML=`<div class="rowitem"><div class="meta" style="color:#b91c1c">${lang==='th'?'โหลดข้อมูลไม่สำเร็จ':'Failed to load data'}</div></div>`;
    }
  }

  async function openEditPage(docNo){
    const docTrimmed=(docNo||'').toString().trim();
    if(!docTrimmed) return toast(lang==='th'?'ไม่พบเลขที่เอกสาร':'Missing document number');

    // Switch header for edit page
    modalState.page='edit';
    modalState.currentDocNo=docTrimmed;
    hdrBack.style.display='inline-block';
    hdrTitle.textContent = (lang==='th'?'แก้ไขเอกสาร ':'Edit Document ') + docTrimmed;

    // Prepare body
    body.innerHTML = `<div class="meta">${lang==='th'?'กำลังโหลด...':'Loading...'}</div>`;
    ftr.innerHTML = `
      <button class="btn primary" id="saveOutEdit">${S.save}</button>
    `;

    try{
      const res=await apiPost('out_GetDoc',{ docNo: docTrimmed });
      if(!res||!res.ok||!res.doc) throw new Error(res?.message||'Not found');
      const d=res.doc;

      const linesHtml=d.lines.map(li=>{
        // Proportional sizing: item (flex:1), qty (fixed small), delete (smallest)
        const itemEsc=esc(li.item);
        const qtyEsc=esc(li.qty);
        return `
          <div class="row" data-item="${itemEsc}" style="display:flex;gap:.5rem;align-items:center;">
            <input value="${itemEsc}" data-picker="materials" readonly style="flex:1;min-width:12rem"/>
            <input type="number" step="any" value="${qtyEsc}" style="width:7rem"/>
            <button class="btn small red" type="button" title="${lang==='th'?'ลบแถว':'Delete line'}">×</button>
          </div>`;
      }).join('');

      body.innerHTML = `
        <div class="meta" style="margin-bottom:.5rem;">${esc(d.ts)} • ${esc(d.project||'-')}</div>
        <div class="lines" id="outEditLines">${linesHtml}</div>
        <div class="row" style="margin-top:.75rem;justify-content:flex-start;">
          <button class="btn small" id="addEditLine" type="button">＋ ${lang==='th'?'เพิ่มแถว':'Add line'}</button>
        </div>
      `;

      // Bind pickers and actions
      bindPickerInputs(box, lang);
      $$('#outEditLines [data-picker="materials"]', box).forEach(inp=>{
        inp.addEventListener('click', ()=>openPicker(inp,'materials', lang));
      });
      $$('#outEditLines .row button.red', box).forEach(b=>b.onclick=()=>b.closest('.row').remove());

      $('#addEditLine', box).onclick = () => {
        const wrap = $('#outEditLines', box);
        const row = document.createElement('div');
        row.className = 'row';
        row.style.cssText = 'display:flex;gap:.5rem;align-items:center;';
        row.setAttribute('data-item','');
        row.innerHTML = `
          <input value="" data-picker="materials" readonly style="flex:1;min-width:12rem"/>
          <input type="number" step="any" value="0" style="width:7rem"/>
          <button class="btn small red" type="button" title="${lang==='th'?'ลบแถว':'Delete line'}">×</button>
        `;
        wrap.appendChild(row);
        bindPickerInputs(box, lang);
        const itemInput = row.querySelector('[data-picker="materials"]');
        itemInput.addEventListener('click', ()=>openPicker(itemInput,'materials', lang));
        row.querySelector('button.red').onclick = () => row.remove();
        itemInput.click(); // open picker immediately
      };

      // Save handler
      $('#saveOutEdit', ftr.parentElement).onclick = async ()=>{
        const rows = $$('#outEditLines .row', box);
        const lines = [];
        rows.forEach(r=>{
          const item = (r.querySelector('[data-picker="materials"]')?.value || '').trim();
          const qty  = Number(r.querySelector('input[type="number"]')?.value || 0) || 0;
          if(item) lines.push({ name:item, qty });
        });
        if(!lines.length) return toast(lang==='th'?'ต้องมีอย่างน้อย 1 รายการ':'At least one line required');

        const btn=$('#saveOutEdit', ftr.parentElement);
        setBtnLoading(btn, true);
        try{
          const res2=await apiPost('out_UpdateDoc',{ docNo: docTrimmed, lines });
          if(res2 && res2.ok){
            toast(lang==='th'?'บันทึกแล้ว':'Saved');
            // Return to history page and refresh
            modalState.page='history';
            modalState.currentDocNo=null;
            hdrBack.style.display='none';
            hdrTitle.textContent = (lang==='th'?'ประวัติการจ่ายออก':'OUT History');
            await loadHistoryIntoModal();
          }else{
            toast(res2?.message || 'Error');
          }
        }catch{
          toast(lang==='th'?'บันทึกไม่สำเร็จ':'Save failed');
        }finally{
          setBtnLoading(btn, false);
        }
      };

    }catch(err){
      console.warn('openEditPage error:', err);
      body.innerHTML = `<div class="meta" style="color:#b91c1c">${lang==='th'?'โหลดไม่สำเร็จ':'Failed to load document'}</div>`;
      ftr.innerHTML = '';
    }
  }
}
