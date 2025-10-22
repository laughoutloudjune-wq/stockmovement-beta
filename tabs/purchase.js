// tabs/purchase.js
import { STR, purSearch, purCreate, purUpdate, toast, esc } from '../js/shared.js';
const el = (h)=>{const t=document.createElement('template'); t.innerHTML=h.trim(); return t.content.firstElementChild;};
export default async function mountPurchase({ root, lang }){
  const L = STR[lang];
  const S = L.pur;
  root.innerHTML = '';
  root.appendChild(el(`
    <section class="purchase-stack">
      <div class="glass-panel">
        <h2>${S.title}</h2>
        <div class="purchase-summary">
          <span class="chip">${S.pending}</span>
          <span class="chip">${S.approved}</span>
          <span class="chip">${S.rejected}</span>
        </div>
        <form id="purchaseForm" class="glass-form">
          <div class="form-grid">
            <label class="form-field">
              <span>${L.out.material}</span>
              <input id="m" placeholder="${L.out.material}" autocomplete="off" />
            </label>
            <label class="form-field">
              <span>${L.out.qty}</span>
              <input id="q" type="number" step="0.01" min="0" placeholder="0" />
            </label>
            <label class="form-field">
              <span>${L.out.unit}</span>
              <input id="u" placeholder="${L.out.unit}" autocomplete="off" />
            </label>
            <label class="form-field">
              <span>${L.out.project}</span>
              <input id="p" placeholder="${L.out.project}" autocomplete="off" />
            </label>
          </div>
          <div class="form-actions">
            <button id="create" type="submit" class="btn primary">${S.create}</button>
          </div>
        </form>
      </div>
      <div class="glass-panel table-card">
        <header>
          <h3 style="margin:0">${S.status}</h3>
          <button id="reload" class="btn" type="button">Reload</button>
        </header>
        <div class="table-scroll">
          <table class="tbl" id="tbl"><thead><tr>
            <th>Date</th><th>Doc</th><th>${L.out.material}</th><th>${L.out.qty}</th><th>${L.out.unit}</th><th>${L.out.project}</th><th>${S.status}</th><th>${L.out.actions}</th>
          </tr></thead><tbody></tbody></table>
        </div>
      </div>
    </section>`));
  const tbody = root.querySelector('#tbl tbody');
  const form = root.querySelector('#purchaseForm');
  async function load(){
    const res = await purSearch({}, 1, 500);
    const rows = (res && (res.rows||res.items)) || [];
    tbody.innerHTML = rows.map(r=>{
      const statusRaw = String(r.Status||'').toLowerCase();
      const statusKey = statusRaw === 'approved' ? 'approved' : statusRaw === 'rejected' ? 'rejected' : 'pending';
      const statusLabel = statusKey === 'approved' ? S.approved : statusKey === 'rejected' ? S.rejected : S.pending;
      return `<tr data-id="${esc(r.ID||r.id)}">
        <td>${esc(r.Date||'')}</td><td>${esc(r.DocNo||'')}</td><td>${esc(r.Material||'')}</td>
        <td>${esc(r.Qty||'')}</td><td>${esc(r.Unit||'')}</td><td>${esc(r.Project||'')}</td>
        <td><span class="status-pill ${statusKey}">${esc(statusLabel)}</span></td>
        <td>
          <button class="btn small" data-status="Approved">${esc(S.approved)}</button>
          <button class="btn small" data-status="Rejected">${esc(S.rejected)}</button>
        </td></tr>`;
    }).join('');
    tbody.querySelectorAll('button[data-status]').forEach(btn=>btn.addEventListener('click', async (e)=>{
      const tr = e.currentTarget.closest('tr'); const id = tr.getAttribute('data-id');
      const status = e.currentTarget.getAttribute('data-status');
      const ok = await purUpdate({ id, status });
      toast(ok && ok.ok!==false ? 'Updated':'Failed');
      await load();
    }));
  }
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const payload = {
      material: root.querySelector('#m').value || null,
      qty: Number(root.querySelector('#q').value||0),
      unit: root.querySelector('#u').value || null,
      project: root.querySelector('#p').value || null,
    };
    const ok = await purCreate(payload);
    toast(ok && ok.ok!==false ? 'Created':'Failed');
    if (ok && ok.ok!==false){ form.reset(); }
    await load();
  });
  root.querySelector('#reload').addEventListener('click', load);
  await load();
}
