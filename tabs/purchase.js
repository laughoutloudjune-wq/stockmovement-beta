// tabs/purchase.js
import { STR, purSearch, purCreate, purUpdate, toast, esc } from '../js/shared.js';
const el = (h)=>{const t=document.createElement('template'); t.innerHTML=h.trim(); return t.content.firstElementChild;};
export default async function mountPurchase({ root, lang }){
  const S = STR[lang].pur;
  root.innerHTML = '';
  root.appendChild(el(`
    <section>
      <h2>${S.title}</h2>
      <div style="display:flex; gap:.5rem; align-items:end">
        <label>Material <input id="m"></label>
        <label>Qty <input id="q" type="number"></label>
        <label>Unit <input id="u"></label>
        <label>Project <input id="p"></label>
        <button id="create" class="btn primary">${S.create}</button>
      </div>
      <div style="margin-top:1rem">
        <button id="reload" class="btn">Reload</button>
      </div>
      <div style="overflow:auto; margin-top:.5rem">
        <table class="tbl" id="tbl"><thead><tr>
          <th>Date</th><th>Doc</th><th>Material</th><th>Qty</th><th>Unit</th><th>Project</th><th>${S.status}</th><th>Action</th>
        </tr></thead><tbody></tbody></table>
      </div>
    </section>`));
  const tbody = root.querySelector('#tbl tbody');
  async function load(){
    const res = await purSearch({}, 1, 500);
    const rows = (res && (res.rows||res.items)) || [];
    tbody.innerHTML = rows.map(r=>`<tr data-id="${esc(r.ID||r.id)}">
      <td>${esc(r.Date||'')}</td><td>${esc(r.DocNo||'')}</td><td>${esc(r.Material||'')}</td>
      <td>${esc(r.Qty||'')}</td><td>${esc(r.Unit||'')}</td><td>${esc(r.Project||'')}</td>
      <td>${esc(r.Status||'')}</td>
      <td>
        <button class="btn small" data-status="Approved">Approve</button>
        <button class="btn small" data-status="Rejected">Reject</button>
      </td></tr>`).join('');
    tbody.querySelectorAll('button[data-status]').forEach(btn=>btn.addEventListener('click', async (e)=>{
      const tr = e.currentTarget.closest('tr'); const id = tr.getAttribute('data-id');
      const status = e.currentTarget.getAttribute('data-status');
      const ok = await purUpdate({ id, status });
      toast(ok && ok.ok!==false ? 'Updated':'Failed');
      await load();
    }));
  }
  root.querySelector('#create').addEventListener('click', async ()=>{
    const payload = {
      material: root.querySelector('#m').value || null,
      qty: Number(root.querySelector('#q').value||0),
      unit: root.querySelector('#u').value || null,
      project: root.querySelector('#p').value || null,
    };
    const ok = await purCreate(payload);
    toast(ok && ok.ok!==false ? 'Created':'Failed');
    await load();
  });
  root.querySelector('#reload').addEventListener('click', load);
  await load();
}
