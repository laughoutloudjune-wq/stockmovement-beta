// tabs/out.js (v12.3-beta rev2)
// Material OUT screen with FAB + OUT History overlay (hybrid modal)
// - Fixed: edit document now loads correctly (trimmed docNo, safe handling)
// - Larger modal on desktop (640px wide, 80vh height)

import {
  $, $$, STR, bindPickerInputs, openPicker,
  apiGet, apiPost, setBtnLoading, esc, toast, todayStr, stockBadge, clampList
} from '../js/shared.js';

/* ---------------- LINE BUILDER ---------------- */
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
      <div style="text-align:right;">
        <button class="btn small" id="openOutHistoryBtn" type="button">📜 ${lang==='th'?'ประวัติการจ่ายออก':'OUT History'}</button>
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

    <!-- OUT History Overlay -->
    <div id="outHistoryOverlay" aria-hidden="true"
         style="position:fixed;inset:0;z-index:2000;display:none;align-items:center;justify-content:center;
                background:rgba(15,18,23,0.15);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);pointer-events:none;">
      <div id="outHistoryBox" class="glass" role="dialog" aria-modal="true"
           style="border-radius:18px;box-shadow:var(--shadow-l);display:flex;flex-direction:column;
                  width:100%;height:100%;overflow:hidden;max-width:640px;max-height:80vh;">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:.75rem 1rem;
                    border-bottom:1px solid var(--border-weak);background:#fff;">
          <h3 style="margin:0;font-size:1rem;">📜 ${lang==='th'?'ประวัติการจ่ายออก':'OUT History'}</h3>
          <button class="btn small" id="closeOutHistory" type="button">${lang==='th'?'ปิด':'Close'}</button>
        </div>
        <div id="outHistList" class="picker-list" style="flex:1;overflow:auto;padding:.6rem .75rem;"></div>
        <div id="outEditCard" style="padding:.75rem .75rem 1rem;"></div>
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
        clearForm(); await loadOutHistory();
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

  /* ---------------- OUT HISTORY OVERLAY ---------------- */
  const openBtn=$('#openOutHistoryBtn',root);
  const overlay=$('#outHistoryOverlay',root);
  const box=$('#outHistoryBox',root);
  const listEl=$('#outHistList',root);
  const editCard=$('#outEditCard',root);
  const closeBtn=$('#closeOutHistory',root);

  function openOverlay(){
    overlay.style.display='flex';
    overlay.style.pointerEvents='auto';
    overlay.setAttribute('aria-hidden','false');

    if(window.innerWidth<769){
      box.style.width='100%';
      box.style.height='100%';
      box.style.maxWidth='none';
      box.style.maxHeight='none';
      box.style.borderRadius='0';
    }else{
      box.style.width='640px';
      box.style.maxHeight='80vh';
      box.style.borderRadius='18px';
    }
    loadOutHistory();
  }
  function closeOverlay(){
    overlay.style.display='none';
    overlay.style.pointerEvents='none';
    overlay.setAttribute('aria-hidden','true');
    editCard.innerHTML='';
  }

  openBtn.addEventListener('click',openOverlay);
  closeBtn.addEventListener('click',closeOverlay);
  overlay.addEventListener('click',e=>{ if(e.target===overlay) closeOverlay(); });

  /* ---------------- LOAD HISTORY ---------------- */
  async function loadOutHistory(){
    listEl.innerHTML='';
    for(let i=0;i<5;i++){ const r=document.createElement('div'); r.className='skeleton-row'; listEl.appendChild(r); }
    try{
      const res=await apiPost('out_SearchHistory',{limit:50});
      listEl.innerHTML='';
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
        listEl.appendChild(item);
      });
      clampList(listEl);
      listEl.querySelectorAll('button[data-doc]').forEach(btn=>{
        btn.addEventListener('click',()=>openOutDoc(btn.dataset.doc));
      });
    }catch{
      listEl.innerHTML=`<div class="rowitem"><div class="meta" style="color:#b91c1c">${lang==='th'?'โหลดข้อมูลไม่สำเร็จ':'Failed to load data'}</div></div>`;
    }
  }

  /* ---------------- OPEN DOCUMENT FOR EDIT ---------------- */
  async function openOutDoc(docNo){
    const docTrimmed=(docNo||'').toString().trim();
    if(!docTrimmed) return toast(lang==='th'?'ไม่พบเลขที่เอกสาร':'Missing document number');
    editCard.innerHTML='<div class="meta">'+(lang==='th'?'กำลังโหลด...':'Loading...')+'</div>';

    try{
      const res=await apiPost('out_GetDoc',{docNo:docTrimmed});
      if(!res||!res.ok||!res.doc) throw new Error(res?.message||'Not found');

      const d=res.doc;
      const linesHtml=d.lines.map(li=>
        `<div class="row" data-item="${esc(li.item)}" style="display:flex;gap:.5rem;align-items:center;">
          <input value="${esc(li.item)}" readonly style="flex:1"/>
          <input type="number" step="any" value="${esc(li.qty)}" style="width:6rem"/>
          <button class="btn small red" type="button">×</button>
        </div>`
      ).join('');

      editCard.innerHTML=`
        <h3>${lang==='th'?'แก้ไขเอกสาร':'Edit Document'} ${esc(d.docNo)}</h3>
        <div class="meta">${esc(d.ts)} • ${esc(d.project||'-')}</div>
        <div class="lines">${linesHtml}</div>
        <div class="row" style="margin-top:1rem;justify-content:flex-end;gap:.5rem;">
          <button class="btn primary" id="saveOutEdit">${S.save}</button>
        </div>
      `;

      $$('#outEditCard .row button').forEach(b=>b.onclick=()=>b.closest('.row').remove());

      $('#saveOutEdit').onclick=async()=>{
        const lines=[];
        $$('#outEditCard .row[data-item]').forEach(r=>{
          const item=r.querySelector('input[readonly]').value.trim();
          const qty=Number(r.querySelector('input[type="number"]').value)||0;
          if(item) lines.push({name:item,qty});
        });
        if(!lines.length) return toast(lang==='th'?'ต้องมีอย่างน้อย 1 รายการ':'At least one line required');
        setBtnLoading($('#saveOutEdit'),true);
        try{
          const res2=await apiPost('out_UpdateDoc',{docNo:d.docNo.trim(),lines});
          if(res2.ok){
            toast(lang==='th'?'บันทึกแล้ว':'Saved');
            await loadOutHistory();
            editCard.innerHTML='';
          }else toast(res2.message||'Error');
        }catch{
          toast(lang==='th'?'บันทึกไม่สำเร็จ':'Save failed');
        }finally{
          setBtnLoading($('#saveOutEdit'),false);
        }
      };
    }catch(err){
      console.warn('openOutDoc error:',err);
      editCard.innerHTML=`<div class="meta" style="color:#b91c1c">${lang==='th'?'โหลดไม่สำเร็จ':'Failed to load document'}</div>`;
    }
  }
}
