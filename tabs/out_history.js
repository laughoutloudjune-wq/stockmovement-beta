// tabs/out_history.js (v1.0)
// New OUT History tab with table list + detail/edit overlay
// Works with either:
//   A) grouped backend (rows have itemSummary, itemCount, totalQty), OR
//   B) ungrouped backend (one row per line) — we group by DocNo on the client

import {
  $, $$, STR, apiPost, bindPickerInputs, openPicker,
  setBtnLoading, esc, clampList, toast
} from '../js/shared.js';

export default async function mount({ root, lang }){
  const S = STR[lang];

  root.innerHTML = `
    <section class="card glass">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:.5rem;">
        <h3>📜 ${lang==='th'?'ประวัติการจ่ายออก (OUT)':'OUT History'}</h3>
        <div style="display:flex;gap:.5rem;align-items:center;">
          <input id="histSearchText" placeholder="${lang==='th'?'ค้นหา...':'Search...'}" style="min-width:14rem"/>
          <button class="btn small" id="histReload">⟲ ${lang==='th'?'โหลดใหม่':'Reload'}</button>
        </div>
      </div>
      <div id="histTableWrap" class="table-wrap">
        <div class="meta">${lang==='th'?'กำลังโหลด...':'Loading...'}</div>
      </div>
    </section>

    <!-- Detail/Edit overlay -->
    <div id="histOverlay" aria-hidden="true"
         style="position:fixed;inset:0;z-index:1960;display:none;align-items:center;justify-content:center;
                background:rgba(15,18,23,0.12);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);pointer-events:none;">
      <div id="histBox" class="glass" role="dialog" aria-modal="true"
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

  // Local styles (scoped)
  const style = document.createElement('style');
  style.textContent = `
    .table-wrap { margin-top:.5rem; overflow:auto; }
    table.mini { width:100%; border-collapse:collapse; }
    table.mini th, table.mini td { padding:.5rem .6rem; border-bottom:1px solid var(--border-weak); text-align:left; }
    table.mini th { font-weight:600; background:#fafafa; position:sticky; top:0; z-index:1; }
    table.mini tr:hover { background: #f7f7f7; }

    /* Detail/edit proportions */
    #histBody .row { display:flex; align-items:center; gap:.4rem; }
    #histBody .item { flex:1 1 auto; min-width:12rem; padding:.4rem .6rem; }
    #histBody .qty { flex:0 0 6rem; width:6rem; text-align:right; padding:.4rem .3rem; }
    #histBody .icon-btn {
      flex:0 0 auto; width:2rem; height:2rem; min-width:2rem !important;
      padding:0 !important; display:flex; align-items:center; justify-content:center;
      line-height:1; font-size:1rem;
    }
    #histBody .kv { display:flex; gap:.5rem; flex-wrap:wrap; margin-bottom:.5rem; color:#444; }
    #histBody .kv div { display:flex; gap:.3rem; }
  `;
  root.appendChild(style);

  // Elements
  const tableWrap = $('#histTableWrap', root);
  const reloadBtn = $('#histReload', root);
  const searchInput = $('#histSearchText', root);

  const overlay = $('#histOverlay', root);
  const box = $('#histBox', root);
  const title = $('#histTitle', root);
  const body = $('#histBody', root);
  const footer = $('#histFooter', root);
  const closeBtn = $('#histClose', root);
  const saveBtn = $('#histSave', root);

  let docs = [];           // grouped docs for the table
  let currentDoc = null;   // currently opened doc object for edit

  // Overlay helpers
  function openOverlay(){
    if(window.innerWidth < 769){
      box.style.width='96vw'; box.style.height='92vh'; box.style.maxWidth='96vw'; box.style.maxHeight='92vh'; box.style.borderRadius='14px';
    }else{
      box.style.width='860px'; box.style.height='86vh'; box.style.maxWidth='860px'; box.style.maxHeight='86vh'; box.style.borderRadius='18px';
    }
    overlay.style.display='flex'; overlay.style.pointerEvents='auto'; overlay.setAttribute('aria-hidden','false');
  }
  function closeOverlay(){
    overlay.style.display='none'; overlay.style.pointerEvents='none'; overlay.setAttribute('aria-hidden','true');
    currentDoc = null; body.innerHTML=''; title.textContent = (lang==='th'?'รายละเอียด':'Details');
  }
  closeBtn.addEventListener('click', closeOverlay);
  overlay.addEventListener('click', e => { if(e.target===overlay) closeOverlay(); });

  // Fetch + build table
  async function loadHistory(){
    tableWrap.innerHTML = `<div class="meta">${lang==='th'?'กำลังโหลด...':'Loading...'}</div>`;
    try{
      // Try to fetch everything; backend will group by DocNo if you used the latest function.
      const res = await apiPost('out_SearchHistory', { limit: 0 });

      // If backend already grouped (itemSummary exists), use it.
      let rows = Array.isArray(res.rows) ? res.rows.slice() : [];

      // If not grouped, group on client.
      const grouped = ('itemSummary' in (rows[0] || {})) ? rows : groupClient(rows);

      // Apply quick text filter (client-side)
      const q = (searchInput.value || '').toString().trim().toLowerCase();
      docs = !q ? grouped : grouped.filter(r => {
        const blob = [
          r.doc, r.ts, r.project, r.contractor, r.requester, r.itemSummary, r.totalQty, r.itemCount
        ].join(' ').toLowerCase();
        return blob.indexOf(q) !== -1;
      });

      renderTable(docs);
    }catch(err){
      console.warn('loadHistory error:', err);
      tableWrap.innerHTML = `<div class="meta" style="color:#b91c1c">${lang==='th'?'โหลดไม่สำเร็จ':'Failed to load'}</div>`;
    }
  }

  // Client grouping fallback: expects rows with per-line shape
  function groupClient(rows){
    const map = new Map();
    for(const r of rows){
      // Expected raw keys: doc, ts, project, contractor, requester, item, qty
      const doc = (r.doc || '').toString().trim();
      const type = (r.type || 'OUT').toString().trim().toUpperCase(); // if provided
      if(!doc || type!=='OUT') continue;

      if(!map.has(doc)){
        map.set(doc, {
          doc, ts: r.ts || '', project: r.project||'', contractor: r.contractor||'',
          requester: r.requester||'', note: r.note||'',
          items: [], totalQty: 0, itemCount: 0
        });
      }
      const obj = map.get(doc);
      // Prefer latest ts string
      if(r.ts && (!obj.ts || (r.ts > obj.ts))) obj.ts = r.ts;
      if(!obj.project && r.project) obj.project = r.project;
      if(!obj.contractor && r.contractor) obj.contractor = r.contractor;
      if(!obj.requester && r.requester) obj.requester = r.requester;
      if(!obj.note && r.note) obj.note = r.note;

      const item = (r.item || '').toString();
      const qty  = Number(r.qty) || 0;
      obj.items.push({item, qty});
      obj.totalQty += qty;
      obj.itemCount += 1;
    }
    const list = Array.from(map.values()).map(o=>{
      const names = o.items.map(x=>x.item).filter(Boolean);
      const sample = names.slice(0,3).join(', ');
      const more = names.length > 3 ? ` +${names.length-3} more` : '';
      return {
        doc: o.doc, ts: o.ts, project: o.project, contractor: o.contractor, requester: o.requester,
        note: o.note, itemSummary: sample + more, totalQty: o.totalQty, itemCount: o.itemCount
      };
    });
    // sort newest first by ts string
    list.sort((a,b)=> (a.ts<b.ts?1:a.ts>b.ts?-1:0));
    return list;
  }

  function renderTable(list){
    if(!list.length){
      tableWrap.innerHTML = `<div class="meta" style="text-align:center;color:#777;padding:.75rem">${lang==='th'?'ไม่พบข้อมูล':'No data'}</div>`;
      return;
    }
    const thead = `
      <thead>
        <tr>
          <th>${lang==='th'?'เลขที่เอกสาร':'DocNo'}</th>
          <th>${lang==='th'?'เวลา':'Timestamp'}</th>
          <th>${lang==='th'?'โครงการ':'Project'}</th>
          <th>${lang==='th'?'ผู้รับเหมา':'Contractor'}</th>
          <th>${lang==='th'?'ผู้ขอเบิก':'Requester'}</th>
          <th>${lang==='th'?'สรุปรายการ':'Items'}</th>
          <th>${lang==='th'?'รวม':'Total'}</th>
          <th style="width:1%">${lang==='th'?'แก้ไข':'Edit'}</th>
        </tr>
      </thead>`;
    const tbody = `
      <tbody>
        ${list.map(r => `
          <tr data-doc="${esc(r.doc)}" class="click-row">
            <td><strong>${esc(r.doc)}</strong></td>
            <td>${esc(r.ts||'')}</td>
            <td>${esc(r.project||'-')}</td>
            <td>${esc(r.contractor||'-')}</td>
            <td>${esc(r.requester||'-')}</td>
            <td>${esc(r.itemSummary||'')}</td>
            <td>${esc(String(r.totalQty||0))} (${esc(String(r.itemCount||0))})</td>
            <td><button class="btn small" data-edit="${esc(r.doc)}">✎</button></td>
          </tr>
        `).join('')}
      </tbody>`;
    tableWrap.innerHTML = `<div style="overflow:auto"><table class="mini">${thead}${tbody}</table></div>`;

    // row click opens detail
    tableWrap.querySelectorAll('tr.click-row').forEach(tr=>{
      tr.addEventListener('click', e=>{
        // ignore clicks on the edit button (it has its own handler)
        if(e.target && e.target.closest('button[data-edit]')) return;
        const doc = tr.getAttribute('data-doc');
        openDoc(doc);
      });
    });
    // edit buttons
    tableWrap.querySelectorAll('button[data-edit]').forEach(btn=>{
      btn.addEventListener('click', e=>{
        e.stopPropagation();
        const doc = btn.getAttribute('data-edit');
        openDoc(doc, true); // true = jump to edit mode
      });
    });
  }

  async function openDoc(docNo, jumpToEdit=false){
    const doc = (docNo||'').toString().trim();
    if(!doc) return;
    title.textContent = `${lang==='th'?'รายละเอียดเอกสาร':'Document'} ${doc}`;
    body.innerHTML = `<div class="meta">${lang==='th'?'กำลังโหลด...':'Loading...'}</div>`;
    openOverlay();
    saveBtn.disabled = true; // disabled until we are in edit mode
    try{
      const res = await apiPost('out_GetDoc', { docNo: doc });
      if(!res || !res.ok || !res.doc) throw new Error(res?.message || 'Not found');
      currentDoc = res.doc; // { docNo, ts, project, contractor, requester, lines:[{item,qty}] ... }

      renderDocView(currentDoc);

      if(jumpToEdit) enterEditMode();
    }catch(err){
      console.warn('openDoc error:', err);
      body.innerHTML = `<div class="meta" style="color:#b91c1c">${lang==='th'?'โหลดไม่สำเร็จ':'Failed to load document'}</div>`;
      saveBtn.disabled = true;
    }
  }

  function renderDocView(d){
    const info = `
      <div class="kv">
        <div><strong>${lang==='th'?'เลขที่เอกสาร:':'DocNo:'}</strong> ${esc(d.docNo||'-')}</div>
        <div><strong>${lang==='th'?'เวลา:':'Time:'}</strong> ${esc(d.ts||'')}</div>
        <div><strong>${lang==='th'?'โครงการ:':'Project:'}</strong> ${esc(d.project||'-')}</div>
      </div>
      <div class="kv">
        <div><strong>${lang==='th'?'ผู้รับเหมา:':'Contractor:'}</strong> ${esc(d.contractor||'-')}</div>
        <div><strong>${lang==='th'?'ผู้ขอเบิก:':'Requester:'}</strong> ${esc(d.requester||'-')}</div>
      </div>
    `;
    const lines = (d.lines||[]).map(li=>`
      <div class="row">
        <div class="item" style="background:#f8f8f8;border-radius:.5rem;padding:.4rem .6rem">${esc(li.item)}</div>
        <div class="qty" style="text-align:left">${esc(String(li.qty))}</div>
      </div>
    `).join('');
    body.innerHTML = `
      ${info}
      <h4 style="margin:.5rem 0;">${lang==='th'?'รายการวัสดุ':'Materials'}</h4>
      <div>${lines || `<div class="meta">(${lang==='th'?'ไม่มีรายการ':'No lines'})</div>`}</div>
      <div style="display:flex;justify-content:flex-end;margin-top:1rem;">
        <button class="btn" id="btnEnterEdit">${lang==='th'?'แก้ไข':'Edit'}</button>
      </div>
    `;
    $('#btnEnterEdit', body).onclick = enterEditMode;
  }

  function enterEditMode(){
    if(!currentDoc) return;
    title.textContent = `${lang==='th'?'แก้ไขเอกสาร':'Edit Document'} ${currentDoc.docNo||''}`;
    saveBtn.disabled = false;

    const linesHtml = (currentDoc.lines||[]).map(li=>`
      <div class="row" data-item="${esc(li.item)}">
        <input value="${esc(li.item)}" data-picker="materials" readonly class="item"/>
        <input type="number" step="any" value="${esc(li.qty)}" class="qty"/>
        <button class="btn small red icon-btn" type="button" title="${lang==='th'?'ลบแถว':'Delete line'}">×</button>
      </div>
    `).join('');

    body.innerHTML = `
      <div class="kv" style="margin-bottom:.75rem;">
        <div><strong>${lang==='th'?'เลขที่เอกสาร:':'DocNo:'}</strong> ${esc(currentDoc.docNo||'-')}</div>
        <div><strong>${lang==='th'?'เวลา:':'Time:'}</strong> ${esc(currentDoc.ts||'')}</div>
        <div><strong>${lang==='th'?'โครงการ:':'Project:'}</strong> ${esc(currentDoc.project||'-')}</div>
      </div>
      <h4 style="margin:.5rem 0;">${lang==='th'?'แก้ไขรายการ':'Edit Lines'}</h4>
      <div class="lines" id="editLines">${linesHtml}</div>
      <div class="row" style="margin-top:.75rem;">
        <button class="btn small" id="addLine" type="button">＋ ${lang==='th'?'เพิ่มแถว':'Add line'}</button>
      </div>
    `;

    // bind picker + delete
    bindPickerInputs(box, lang);
    $$('#editLines [data-picker="materials"]', box).forEach(inp=>{
      inp.addEventListener('click', ()=>openPicker(inp, 'materials', lang));
    });
    $$('#editLines .icon-btn', box).forEach(b => b.onclick = () => b.closest('.row').remove());
    $('#addLine', body).onclick = () => {
      const wrap = $('#editLines', body);
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = `
        <input value="" data-picker="materials" readonly class="item"/>
        <input type="number" step="any" value="0" class="qty"/>
        <button class="btn small red icon-btn" type="button" title="${lang==='th'?'ลบแถว':'Delete line'}">×</button>
      `;
      wrap.appendChild(row);
      bindPickerInputs(box, lang);
      const itemInput = row.querySelector('[data-picker="materials"]');
      itemInput.addEventListener('click', ()=>openPicker(itemInput,'materials', lang));
      row.querySelector('.icon-btn').onclick = () => row.remove();
      itemInput.click(); // open picker immediately
    };
  }

  // Save edit
  saveBtn.onclick = async () => {
    if(!currentDoc) return;
    const docNo = (currentDoc.docNo||'').toString().trim();
    const rows = $$('#editLines .row', body);
    const lines = [];
    rows.forEach(r=>{
      const item = (r.querySelector('[data-picker="materials"]')?.value || '').trim();
      const qty  = Number(r.querySelector('input.qty')?.value || 0) || 0;
      if(item) lines.push({ name:item, qty });
    });
    if(!lines.length) return toast(lang==='th'?'ต้องมีอย่างน้อย 1 รายการ':'At least one line required');

    setBtnLoading(saveBtn, true);
    try{
      const res=await apiPost('out_UpdateDoc',{ docNo, lines });
      if(res && res.ok){
        toast(lang==='th'?'บันทึกแล้ว':'Saved');
        closeOverlay();
        await loadHistory(); // refresh table
      }else{
        toast(res?.message || 'Error');
      }
    }catch{
      toast(lang==='th'?'บันทึกไม่สำเร็จ':'Save failed');
    }finally{
      setBtnLoading(saveBtn,false);
    }
  };

  // wire search/reload
  reloadBtn.addEventListener('click', loadHistory);
  searchInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter') loadHistory(); });

  // initial load
  loadHistory();
}
