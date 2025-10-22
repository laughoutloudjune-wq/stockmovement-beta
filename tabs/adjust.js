// tabs/adjust.js
import { STR, adjApply, toast } from '../js/shared.js';
const el = (h)=>{const t=document.createElement('template'); t.innerHTML=h.trim(); return t.content.firstElementChild;};
export default async function mountAdjust({ root, lang }){
  const S = STR[lang].adj;
  root.innerHTML = '';
  root.appendChild(el(`
    <section>
      <h2>${S.title}</h2>
      <div class="grid2">
        <label>${S.date}<input id="d" type="date"></label>
        <label>${S.material}<input id="m"></label>
        <label>${S.qty}<input id="q" type="number"></label>
        <label>${S.unit}<input id="u"></label>
        <label style="grid-column:1/3">${S.reason}<input id="r"></label>
      </div>
      <div style="margin-top:.75rem">
        <button id="apply" class="btn primary">${S.apply}</button>
      </div>
    </section>`));
  root.querySelector('#apply').addEventListener('click', async ()=>{
    const payload = {
      date: root.querySelector('#d').value || null,
      material: root.querySelector('#m').value || null,
      qty: Number(root.querySelector('#q').value||0),
      unit: root.querySelector('#u').value || null,
      reason: root.querySelector('#r').value || null,
    };
    const res = await adjApply(payload);
    toast(res && res.ok!==false ? 'Applied' : 'Failed');
  });
}
