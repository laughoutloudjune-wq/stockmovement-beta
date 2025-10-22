// tabs/in.js
import { STR, inCreate, toast } from '../js/shared.js';
const el = (h)=>{const t=document.createElement('template'); t.innerHTML=h.trim(); return t.content.firstElementChild;};
export default async function mountIn({ root, lang }){
  const S = STR[lang].in;
  root.innerHTML = '';
  root.appendChild(el(`
    <section>
      <h2>${S.title}</h2>
      <div class="grid2">
        <label>${S.date}<input id="d" type="date"></label>
        <label>${S.project}<input id="p"></label>
        <label>${S.material}<input id="m"></label>
        <label>${S.qty}<input id="q" type="number"></label>
        <label>${S.unit}<input id="u"></label>
        <label>${S.location}<input id="l"></label>
        <label style="grid-column:1/3">${S.note}<input id="n"></label>
      </div>
      <div style="margin-top:.75rem">
        <button id="save" class="btn primary">${S.save}</button>
      </div>
    </section>`));
  root.querySelector('#save').addEventListener('click', async ()=>{
    const payload = {
      date: root.querySelector('#d').value || null,
      project: root.querySelector('#p').value || null,
      material: root.querySelector('#m').value || null,
      qty: Number(root.querySelector('#q').value||0),
      unit: root.querySelector('#u').value || null,
      location: root.querySelector('#l').value || null,
      note: root.querySelector('#n').value || null,
    };
    const res = await inCreate(payload);
    toast(res && res.ok!==false ? 'Saved' : 'Failed');
  });
}
