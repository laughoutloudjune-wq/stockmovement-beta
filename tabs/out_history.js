// tabs/out_history.js
// OUT History tab (table view) + detail/edit overlay
// Reuses the same line layout/stock badge logic as the OUT form.

import {
  $, $$, STR, bindPickerInputs, openPicker,
  apiGet, apiPost, setBtnLoading, esc, toast, stockBadge
} from '../js/shared.js';

// Reuse line UI & stock behavior from OUT tab (copied to keep modules independent)
function OutLine(lang){
  const card=document.createElement('div'); 
  card.className='line';

  const name=document.createElement('input');
  name.placeholder=(lang==='th' ? 'พิมพ์เพื่อค้นหา…' : 'Type to search…');
  name.readOnly=true; 
  name.setAttribute('data-picker','materials');

  const qty=document.createElement('input');
  qty.type='number'; qty.min='0'; qty.step='any'; qty.placeholder='0'; qty.inputMode='decimal';

  const meta=document.createElement('div'); 
  meta.className='rowitem'; meta.style.justifyContent='flex-start';

  const label=document.createElement('span'); 
  label.className='meta'; label.textContent=(lang==='th'?'คงเหลือ: ':'Stock: ');

  let badge=document.createElement('span'); 
  badge.className='badge'; badge.textContent='-';

  meta.appendChild(label); meta.appendChild(badge);

  const actions=document.createElement('div'); actions.className='actions';
  const rm=document.createElement('button'); rm.type='button'; rm.className='btn small'; rm.textContent='×'; rm.onclick=()=>card.remove();
  actions.appendChild(rm);

  // Compose
  const grid=document.createElement('div'); grid.className='grid';
  grid.appendChild(name); grid.appendChild(qty);
  card.appendChild(grid); card.appendChild(meta); card.appendChild(actions);

  // Picker + Stock
  name.addEventListener('click', ()=>openPicker(name,'materials', lang));
  name.addEventListener('change', async ()=>{
    const v=name.value.trim();
    const old=badge;
    const spin=document.createElement('span'); spin.className='badge';
    spin.innerHTML='<span class="spinner" style="width:14px;height:14px;border-width:2px"></span>';
    meta.replaceChild(spin, old); badge=spin;
    try{
      const res=await apiGet('getCurrentStock',{material:v});
      const n=(res&&res.ok)?Number(res.stock):null;
      const mn=(res&&res.ok)?Number(res.min||0):null;
      const bNew=stockBadge(n,mn);
      meta.replaceChild(bNew, badge); badge=bNew;
    }catch{
      const bErr=document.createElement('span'); bErr.className='badge red'; bErr.textContent='!';
      meta.replaceChild(bErr, badge); badge=bErr;
    }
  });
  return card;
}

export default async function mount({ root, lang }){
  const S=STR[lang];

  root.innerHTML = `
    <section class="card glass">
      <h3>📜 ${lang==='th'?'ประวัติการจ่ายออก (OUT)':'OUT History'}</h3>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:.5rem;">
        <input id="histSearchText" placeholder="${lang==='th'?'ค้นหา...':'Search...'}" style="min-width:14rem"/>
        <button class="btn small" id="histReload">⟲ ${lang==='th'?'โหลดใหม่':'Reload'}</button>
      </div>
      <div id="histTableWrap" class="table-wrap" style="margin-top:.5rem;">
        <div class="meta">${lang==='th'?'กำลังโหลด...':'Loading...'}</div>
      </div>
    </section>

    <!-- Overlay -->
    <div id="histOverlay" aria-hidden="true"
         style="position:fixed;inset:0;z-index:1960;display:none;align-items:center;justify-content:center;
                background:rgba(15,18,23,0.12);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);">
      <div id="histBox" class="glass"
           style="border-radius:18px;box-shadow:var(--shadow-l);display:flex;flex-direction:column;overflow:hidden;
                  width:96vw;max-width:860px;height:92vh;max-height:86vh;background:#fff;">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:.75rem 1rem;border-bottom:1px solid var(--border-weak);">
          <h3 id="histTitle" style="margin:0;font-size:1rem;">${lang==='th'?'รายละเอียด':'Details'}</h3>
          <button class="btn small" id="histClose" type="button">${lang==='th'?'ปิด':'Close'}</button>
        </div>
        <div id="histBody" style="flex:1;overflow:auto;padding:.75rem;"></div>
        <div id="histFooter" style="display:flex;justify-content:flex-end;gap:.5rem;padding:.75rem;border-top:1px solid var(--border-weak);background:#fff;">
          <button class="btn primary" id="histSave" type="button">${S.save}</button>
        </div>
      </div>
    </div>
  `;

  const tableWrap=$('#histTableWrap',root);
  const overlay=$('#histOverlay',root);
  const box=$('#histBox',root);
  const body=$('#histBody',root);
  const title=$('#histTitle',root);
  const closeBtn=$('#histClose',root);
  const saveBtn=$('#histSave',root);

  closeBtn.onclick=()=>{ overlay.style.display='none'; };

  $('#histReload',root).onclick=()=>loadHistory();
  $('#histSearchText',root).onkeydown=(e)=>{ if(e.key==='Enter') loadHistory(); };

  async function loadHistory(){
    tableWrap.innerHTML=`<div class="meta">${lang==='th'?'กำลังโหลด...':'Loading...'}</div>`;
    try{
      // Expecting grouped API (one row per DocNo). If your backend returns per-line, it’s fine too.
      const res=await apiPost('out_SearchHistory',{limit:0});
      const rows=Array.isArray(res.rows)?res.rows:[];
      const html=`
        <table class="mini" style="width:100%;border-collapse:collapse;">
          <thead><tr>
            <th>${lang==='th'?'เลขที่':'DocNo'}</th>
            <th>${lang==='th'?'เวลา':'Time'}</th>
            <th>${lang==='th'?'โครงการ':'Project'}</th>
            <th>${lang==='th'?'ผู้รับเหมา':'Contractor'}</th>
            <th>${lang==='th'?'ผู้ขอเบิก':'Requester'}</th>
            <th>${lang==='th'?'รายการ':'Items'}</th>
            <th>${lang==='th'?'รวม':'Total'}</th>
          </tr></thead>
          <tbody>${rows.map(r=>`
            <tr class="click-row" data-doc="${esc(r.doc)}" style="cursor:pointer;">
              <td><strong>${esc(r.doc)}</strong></td>
              <td>${esc(r.ts||'')}</td>
              <td>${esc(r.project||'-')}</td>
              <td>${esc(r.contractor||'-')}</td>
              <td>${esc(r.requester||'-')}</td>
              <td>${esc(r.itemSummary||'')}</td>
              <td>${esc(String(r.totalQty||0))}</td>
            </tr>`).join('')}</tbody>
        </table>`;
      tableWrap.innerHTML=html;
      $$('.click-row',tableWrap).forEach(tr=>{ tr.onclick=()=>openDoc(tr.dataset.doc); });
    }catch(err){
      console.warn('loadHistory error:',err);
      tableWrap.innerHTML=`<div class="meta" style="color:#b91c1c">${lang==='th'?'โหลดไม่สำเร็จ':'Failed to load'}</div>`;
    }
  }

  async function openDoc(docNo){
    overlay.style.display='flex';
    title.textContent=`${lang==='th'?'แก้ไขเอกสาร':'Edit Document'} ${docNo}`;
    body.innerHTML=`<div class="meta">${lang==='th'?'กำลังโหลด...':'Loading...'}</div>`;
    saveBtn.onclick=null;

    try{
      const res=await apiPost('out_GetDoc',{docNo});
      if(!res||!res.ok||!res.doc) throw new Error(res?.message||'Not found');
      const d=res.doc;

      // Build same layout as OUT tab (lines with stock badge)
      const linesWrap=document.createElement('div'); linesWrap.className='lines';
      (d.lines||[]).forEach(li=>{
        const card=OutLine(lang);
        const name=card.querySelector('input[data-picker="materials"]');
        const qty=card.querySelector('input[type="number"]');
        name.value=li.item||''; qty.value=li.qty||'';
        linesWrap.appendChild(card);
      });

      body.innerHTML=`
        <div class="row">
          <div><label>${lang==='th'?'โครงการ':'Project'}</label><input value="${esc(d.project||'')}" disabled /></div>
          <div><label>${lang==='th'?'ผู้รับเหมา':'Contractor'}</label><input value="${esc(d.contractor||'')}" disabled /></div>
        </div>
        <div class="row">
          <div><label>${lang==='th'?'ผู้ขอเบิก':'Requester'}</label><input value="${esc(d.requester||'')}" disabled /></div>
          <div><label>${lang==='th'?'เวลา':'Time'}</label><input value="${esc(d.ts||'')}" disabled /></div>
        </div>
        <div class="lines" id="outEditLines"></div>
        <div style="margin-top:.75rem;text-align:right;">
          <button class="btn small" id="addLine" type="button">＋ ${lang==='th'?'เพิ่มแถว':'Add line'}</button>
        </div>
      `;
      $('#outEditLines',body).appendChild(linesWrap);

      // Bind pickers & actions
      bindPickerInputs(box,lang);
      $$('#outEditLines [data-picker="materials"]', box).forEach(inp=>{
        inp.addEventListener('click', ()=>openPicker(inp,'materials',lang));
      });
      $('#addLine', body).onclick=()=>{
        const wrap=$('#outEditLines', body);
        const c=OutLine(lang); wrap.appendChild(c); bindPickerInputs(box,lang);
        const i=c.querySelector('input[data-picker="materials"]');
        i.addEventListener('click', ()=>openPicker(i,'materials',lang));
        i.click(); // open immediately
      };

      // Save
      saveBtn.onclick = async ()=>{
        const rows=$$('#outEditLines .line', body);
        const lines=[];
        rows.forEach(r=>{
          const item=(r.querySelector('[data-picker="materials"]')?.value||'').trim();
          const qty=Number(r.querySelector('input[type="number"]')?.value||0)||0;
          if(item) lines.push({name:item,qty});
        });
        if(!lines.length){ return toast(lang==='th'?'ต้องมีอย่างน้อย 1 รายการ':'At least one line required'); }
        setBtnLoading(saveBtn,true);
        try{
          const res2=await apiPost('out_UpdateDoc',{docNo,lines});
          if(res2&&res2.ok){
            toast(lang==='th'?'บันทึกแล้ว':'Saved');
            overlay.style.display='none';
            loadHistory();
          }else{
            toast(res2?.message||'Error');
          }
        }catch{
          toast(lang==='th'?'บันทึกไม่สำเร็จ':'Save failed');
        }finally{
          setBtnLoading(saveBtn,false);
        }
      };

    }catch(err){
      console.warn('openDoc error:',err);
      body.innerHTML=`<div class="meta" style="color:#b91c1c">${lang==='th'?'โหลดไม่สำเร็จ':'Failed to load document'}</div>`;
      saveBtn.onclick=null;
    }
  }

  loadHistory();
}
