// tabs/out.js (Public v1.0)
// OUT form tab — can record new OUT transactions and link to OUT History tab.

import {
  $, $$, STR, bindPickerInputs, openPicker,
  apiGet, apiPost, setBtnLoading, esc, toast, todayStr, stockBadge
} from '../js/shared.js';

function OutLine(lang){
  const card=document.createElement('div');
  card.className='line';

  const name=document.createElement('input');
  name.placeholder=(lang==='th'?'พิมพ์เพื่อค้นหา…':'Type to search…');
  name.readOnly=true;
  name.setAttribute('data-picker','materials');

  const qty=document.createElement('input');
  qty.type='number'; qty.min='0'; qty.step='any'; qty.placeholder='0'; qty.inputMode='decimal';

  const meta=document.createElement('div');
  meta.className='meta'; meta.innerHTML=`${lang==='th'?'คงเหลือ:':'Stock:'} <span class="badge">-</span>`;

  const rm=document.createElement('button');
  rm.type='button'; rm.className='btn small red'; rm.textContent='×'; rm.onclick=()=>card.remove();

  card.append(name, qty, meta, rm);

  name.addEventListener('click',()=>openPicker(name,'materials',lang));
  name.addEventListener('change', async ()=>{
    const badge=meta.querySelector('.badge');
    badge.innerHTML='<span class="spinner"></span>';
    try{
      const res=await apiGet('getCurrentStock',{material:name.value.trim()});
      const n=(res&&res.ok)?Number(res.stock):null;
      const mn=(res&&res.ok)?Number(res.min||0):null;
      const newBadge=stockBadge(n,mn);
      meta.replaceChild(newBadge,badge);
    }catch{ badge.textContent='!'; badge.className='badge red'; }
  });

  return card;
}

function collectLines(rootSel){
  const arr=[];
  $$(rootSel+' .line').forEach(c=>{
    const name=c.querySelector('input[data-picker="materials"]').value.trim();
    const qty=Number(c.querySelector('input[type="number"]').value)||0;
    if(name) arr.push({name,qty});
  });
  return arr;
}

export default async function mount({root,lang}){
  const S=STR[lang];
  root.innerHTML=`
    <section class="card glass">
      <h3>${S.outTitle}</h3>
      <div class="row">
        <div><label>${S.outDate}</label><input id="OutDate" type="date"/></div>
        <div><label>${S.proj}</label><input id="ProjectInput" data-picker="projects" readonly placeholder="${S.pick}"/></div>
      </div>
      <div class="row">
        <div><label>${S.contractor}</label><input id="ContractorInput" data-picker="contractors" readonly placeholder="${S.pickAdd}"/></div>
        <div><label>${S.requester}</label><input id="RequesterInput" data-picker="requesters" readonly placeholder="${S.pickAdd}"/></div>
      </div>
      <div class="row"><label>${S.note}</label><input id="Note" placeholder="${lang==='th'?'ถ้ามี':'Optional'}"/></div>
      <div class="lines" id="outLines"></div>
      <div style="text-align:right;margin-top:.5rem;">
        <button class="btn small" id="openOutHistoryBtn">📜 ${lang==='th'?'ประวัติการจ่ายออก':'OUT History'}</button>
      </div>
    </section>

    <div class="fab" id="fab">
      <button class="fab-main" id="fabMain" aria-expanded="false"><span class="icon">＋</span></button>
      <div class="mini" id="fabSubmitWrap">
        <div class="label">${S.btnSubmit}</div>
        <button class="btn small primary" id="fabSubmitBtn"><span class="btn-label">💾</span></button>
      </div>
      <div class="mini" id="fabAddWrap">
        <div class="label">${S.btnAdd}</div>
        <button class="btn small" id="fabAddBtn"><span class="btn-label">＋</span></button>
      </div>
    </div>
  `;

  const lines=$('#outLines');
  function addLine(){ lines.appendChild(OutLine(lang)); bindPickerInputs(root,lang); }
  function clearForm(){
    lines.innerHTML=''; addLine();
    $('#Note').value=''; $('#OutDate').value=todayStr();
    $('#ProjectInput').value=''; $('#ContractorInput').value=''; $('#RequesterInput').value='';
  }

  addLine();
  $('#OutDate').value=todayStr();

  $('#ProjectInput').addEventListener('click',()=>openPicker($('#ProjectInput'),'projects',lang));
  $('#ContractorInput').addEventListener('click',()=>openPicker($('#ContractorInput'),'contractors',lang));
  $('#RequesterInput').addEventListener('click',()=>openPicker($('#RequesterInput'),'requesters',lang));

  $('#fabAddBtn').onclick=addLine;
  $('#fabSubmitBtn').onclick=async()=>{
    setBtnLoading($('#fabSubmitBtn'),true);
    const p={
      type:'OUT',
      project:$('#ProjectInput').value.trim(),
      contractor:$('#ContractorInput').value.trim(),
      requester:$('#RequesterInput').value.trim(),
      note:$('#Note').value.trim(),
      date:$('#OutDate').value.trim(),
      lines:collectLines('#outLines')
    };
    if(!p.lines.length){ toast(lang==='th'?'กรุณาเพิ่มรายการ':'Add at least one line'); setBtnLoading($('#fabSubmitBtn'),false); return;}
    try{
      const res=await apiPost('submitMovementBulk',p);
      if(res&&res.ok){ toast('✅ '+(lang==='th'?'บันทึกแล้ว':'Saved')+' '+(res.docNo||'')); clearForm(); }
      else toast(res?.message||'Error');
    }catch{ toast('❌ '+(lang==='th'?'เกิดข้อผิดพลาด':'Failed')); }
    finally{ setBtnLoading($('#fabSubmitBtn'),false); }
  };

  // link to OUT History tab
  $('#openOutHistoryBtn').onclick=()=>{
    const evt=new CustomEvent('switch-tab',{detail:'out_history'});
    window.dispatchEvent(evt);
  };
}
