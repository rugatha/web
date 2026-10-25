import { commitD3Registration, cancelD3Registration, updateD3Shipping, updateD3Addon, updateD3ImageEmail } from '../experience/cons/d3/2026/registration-store.js?v=20261026-helper-1';
import { dataTable, resetTablePage } from './data-table.js?v=20261026-experience-v3';
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slotIds = ['2026-12-12','2026-12-13'].flatMap(day => Array.from({length:6},(_,i)=>`${day}-${12+i}`));
const slotLabel = id => slotIds.includes(id) ? `${id.slice(5,10).replace('-','/')} ${id.slice(-2)}:00–${Number(id.slice(-2))+1}:00` : id;
const money = value => `${Number(value || 0).toLocaleString('zh-TW')} $`;
const phoneText = value => {
  const original = String(value ?? '');
  const digits = original.replace(/[\s()\-]/g, '').replace(/^\+886/, '0');
  return /^09\d{8}$/.test(digits) ? digits.replace(/^(\d{4})(\d{3})(\d{3})$/, '$1-$2-$3') : original;
};
const addonSelect = (row, field, label, busy) => `<select data-d3-addon="${field}" data-d3-id="${esc(row.id)}" aria-label="${esc(row.name)}的${label}" ${busy?'disabled':''}><option value="false" ${!row[field]?'selected':''}>未加購</option><option value="true" ${row[field]?'selected':''}>有加購</option></select>`;
const dateText = value => value?.toDate ? value.toDate().toLocaleString('zh-TW',{timeZone:'Asia/Taipei',hour12:false}) : '未記錄';
export function createD3Dashboard(context) {
  let rows = null, slots = [], loading = false, busy = false, revision = 0;
  const valid = (ticket, generation) => context().authenticated && context().generation === generation && ticket === revision;
  async function load() {
    if (!context().authenticated || loading || busy) return;
    const {db,sdk,generation} = context(), ticket = ++revision;
    loading = true;
    $('d3-status').textContent = '正在讀取 2026 D3 報名資料…';
    try {
      const results = await Promise.all(['d3Slots','d3Registrations'].map(name=>sdk.getDocs(sdk.collection(db,name))));
      if (!valid(ticket,generation)) return;
      slots = results[0].docs.map(doc=>({...doc.data(),id:doc.id})).filter(slot=>slotIds.includes(slot.id));
      rows = results[1].docs.map(doc=>({...doc.data(),id:doc.id})).filter(row=>slotIds.includes(row.slotId));
      $('d3-status').textContent = `已讀取 ${rows.length} 筆報名，更新於 ${new Date().toLocaleString('zh-TW',{timeZone:'Asia/Taipei'})}`;
      render();
    } catch {
      if (!valid(ticket,generation)) return;
      rows = null;
      for (const id of ['d3-slots','d3-summary','d3-table']) $(id).replaceChildren();
      $('d3-status').textContent = '無法讀取報名資料，請按「重新整理報名資料」重試。';
    } finally { if (valid(ticket,generation)) loading = false; }
  }
  function render() {
    if (!context().authenticated) return;
    if (rows === null) { if (!loading) void load(); return; }
    const selected = $('d3-slot').value;
    const search = $('d3-search').value.trim().toLowerCase();
    const active = rows.filter(row=>row.status!=='cancelled');
    const scoped = rows.filter(row=>selected==='all' || row.slotId===selected);
    const filtered = scoped.filter(row=>[row.id,row.name,row.phone,phoneText(row.phone),slotLabel(row.slotId)].join(' ').toLowerCase().includes(search));
    const visibleSlots = slotIds.filter(id=>selected==='all' || id===selected);
    $('d3-slots').innerHTML = ['2026-12-12','2026-12-13'].filter(day=>visibleSlots.some(id=>id.startsWith(day))).map(day=>`<section class="d3-day"><h3>${day==='2026-12-12'?'12/12（六）':'12/13（日）'}</h3>${visibleSlots.filter(id=>id.startsWith(day)).map(id=>{
      const slot = slots.find(slot=>slot.id===id);
      const bookedAt = row => row.createdAt?.toMillis?.() ?? row.createdAt?.toDate?.().getTime() ?? Infinity;
      const bookings = active.filter(row=>row.slotId===id).sort((a,b)=>{
        const difference = bookedAt(a)-bookedAt(b);
        return (Number.isNaN(difference)?0:difference) || a.id.localeCompare(b.id);
      });
      const people = bookings.reduce((n,row)=>n+row.partySize,0);
      const count = slot?.registeredPlayers;
      const known = Number.isInteger(count) && count>=0 && count<=2;
      const seats = bookings.flatMap(row=>Array.from({length:row.partySize},(_,i)=>`<div class="d3-booked-seat" aria-label="${esc(row.name)}，本筆 ${row.partySize} 人報名，第 ${i+1} 位"><div class="d3-seat-info"><strong>${esc(row.name)}</strong><p>${esc(phoneText(row.phone))}</p><p>${[row.miniature?'3D':'',row.portrait?'肖像':''].filter(Boolean).join('、')||'無加價'}</p><p title="本筆 ${row.partySize} 人總費用">${esc(money(row.total))}</p></div><button type="button" class="button" data-d3-cancel="${esc(row.id)}" ${busy?'disabled':''}>取消報名</button></div>`));
      const open = slot?.registrationOpen && slot.deadline?.toMillis?.()>Date.now();
      if (known) for(let i=0;i<2-count;i++) seats.push(`<div class="d3-empty-seat"><span>空位</span><button type="button" class="button" data-d3-add="${id}" ${busy || !open?'disabled':''}>登記報名</button></div>`);
      return `<article class="d3-slot-card"><h4>${esc(slotLabel(id).split(' ')[1])}</h4>${known?`<p>${count} 人報名 · 剩餘 ${2-count} 位</p><div class="d3-seats">${seats.join('')}</div><p class="hint">${open?'報名開放':'報名已關閉／截止'}</p>${count!==people?'<p class="form-error">船位統計與報名人數不一致，請確認資料。</p>':''}`:'<p class="form-error">此時段未設定或名額資料異常。</p>'}</article>`;
    }).join('')}</section>`).join('');
    const validFiltered = filtered.filter(row=>row.status!=='cancelled');
    $('d3-summary').textContent = `符合 ${filtered.length} 筆報名（含取消 ${filtered.length-validFiltered.length} 筆） · ${validFiltered.reduce((n,r)=>n+r.partySize,0)} 人 · 3D 公仔 ${validFiltered.reduce((n,r)=>n+(r.miniature?r.partySize:0),0)} 份 · 角色肖像 ${validFiltered.reduce((n,r)=>n+(r.portrait?r.partySize:0),0)} 份 · 報名總金額 ${money(validFiltered.reduce((n,r)=>n+r.total,0))}（非收款紀錄）`;
    dataTable('d3-table',[
      {id:'slotId',label:'體驗時段',value:r=>slotLabel(r.slotId)},
      {id:'createdAt',label:'報名時間',type:'date',value:r=>r.createdAt,html:r=>esc(dateText(r.createdAt))},
      {id:'name',label:'稱呼',value:r=>r.name},
      {id:'phone',label:'手機',value:r=>r.phone,html:r=>esc(phoneText(r.phone))},
      {id:'imageRecipientEmail',label:'收件人 email',value:r=>r.imageRecipientEmail || '',html:r=>`<form data-d3-image-email="${esc(r.id)}"><input type="email" name="imageEmail" maxlength="254" value="${esc(r.imageRecipientEmail || '')}" aria-label="${esc(r.name)}的圖檔收件 email" placeholder="接收圖檔的 email" ${busy?'disabled':''}><button class="button" type="submit" ${busy?'disabled':''}>儲存</button></form>`},
      {id:'partySize',label:'報名人數',type:'number',value:r=>r.partySize},
      {id:'miniature',label:'3D 公仔印製',type:'category',value:r=>r.miniature?'有加購':'未加購',html:r=>addonSelect(r,'miniature','3D 公仔印製',busy)},
      {id:'portrait',label:'角色肖像繪製',type:'category',value:r=>r.portrait?'有加購':'未加購',html:r=>addonSelect(r,'portrait','角色肖像繪製',busy)},
      {id:'total',label:'報名金額',type:'number',value:r=>r.total,html:r=>esc(money(r.total))},
      {id:'status',label:'狀態',type:'category',value:r=>r.status==='cancelled'?'已取消':'有效'},
      {id:'recipientName',label:'收件人姓名',value:r=>r.recipientName || '',html:r=>`${esc(r.recipientName || '')}<button type="button" class="button" data-d3-shipping="${esc(r.id)}" ${busy || !r.miniature?'disabled':''} title="${r.miniature?'編輯寄送資料':'須先加購 3D 公仔印製'}">編輯寄送資料</button>`},
      {id:'recipientPhone',label:'收件人電話',value:r=>r.recipientPhone || '',html:r=>esc(phoneText(r.recipientPhone))},
      {id:'recipientEmail',label:'寄送 email',value:r=>r.recipientEmail || ''},
      {id:'sevenElevenStore',label:'7-11 店名',value:r=>r.sevenElevenStore || ''},
    ],filtered,{defaultSort:{id:'createdAt',direction:'desc'},lockOrder:true});
  }
  slotIds.forEach(id=>$('d3-slot').add(new Option(slotLabel(id),id)));
  $('d3-slot').addEventListener('change',()=>{resetTablePage('d3-table');render();});
  $('d3-search').addEventListener('input',()=>{resetTablePage('d3-table');render();});
  $('d3-refresh').addEventListener('click',()=>void load());
  const editor = $('d3-editor');
  let addingId = null;
  function total() { return (300+($('d3-add-miniature').checked?500:0)+($('d3-add-portrait').checked?200:0))*Number($('d3-add-party').value); }
  function updateTotal() { $('d3-add-total').textContent = `總費用：${money(total())}`; }
  function updatePartyOptions() {
    const slot = slots.find(slot=>slot.id===$('d3-add-slot').value);
    const remaining = slot && slot.registrationOpen && slot.deadline?.toMillis?.()>Date.now()
      ? Math.max(0,Math.min(2,2-slot.registeredPlayers)) : 0;
    const previous = $('d3-add-party').value;
    $('d3-add-party').replaceChildren();
    for(let count=1;count<=remaining;count++) $('d3-add-party').add(new Option(`${count} 人`,String(count)));
    if(Number(previous)<=remaining && Number(previous)>=1) $('d3-add-party').value=previous;
    $('d3-add-party').disabled=remaining===0;
    $('d3-add-save').disabled=busy || remaining===0;
    updateTotal();
  }
  function openAdd(id) {
    if (busy || loading || !context().authenticated) return;
    $('d3-add-form').reset();$('d3-add-save').disabled=false;$('d3-add-close').disabled=false;
    $('d3-add-slot').replaceChildren();
    slots.filter(slot=>slot.registeredPlayers<2 && slot.registrationOpen && slot.deadline?.toMillis?.()>Date.now()).sort((a,b)=>a.id.localeCompare(b.id)).forEach(slot=>$('d3-add-slot').add(new Option(`${slotLabel(slot.id)}（剩餘 ${2-slot.registeredPlayers} 位）`,slot.id)));
    if (!$('d3-add-slot').options.length) { $('d3-status').textContent='目前沒有可登記的時段。';return; }
    if(id) $('d3-add-slot').value=id;
    const {db,sdk}=context();addingId=sdk.doc(sdk.collection(db,'d3Registrations')).id;
    $('d3-add-error').textContent='';updatePartyOptions();editor.showModal();
  }
  $('d3-add-form').addEventListener('change',event=>{if(event.target===$('d3-add-slot'))updatePartyOptions();else updateTotal();});
  $('d3-add-close').addEventListener('click',()=>{if(!busy)editor.close();});
  editor.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
  $('d3-add').addEventListener('click',()=>openAdd($('d3-slot').value==='all'?null:$('d3-slot').value));
  $('d3-add-form').addEventListener('submit',async event=>{
    event.preventDefault();
    if(busy || !context().authenticated || !$('d3-add-form').reportValidity())return;
    const slot=slots.find(slot=>slot.id===$('d3-add-slot').value);
    const partySize=Number($('d3-add-party').value);
    if(!slot || ![1,2].includes(partySize) || partySize>2-slot.registeredPlayers){updatePartyOptions();$('d3-add-error').textContent='人數超過剩餘名額，請重新選擇。';return;}
    const name=$('d3-add-name').value.trim();if(!name){$('d3-add-error').textContent='請輸入名稱。';return;}
    const {db,sdk,generation}=context(),ticket=revision;
    busy=true;$('d3-add-save').disabled=true;$('d3-add-close').disabled=true;$('d3-add-error').textContent='正在登記…';
    try {
      await commitD3Registration(db,addingId,{slotId:$('d3-add-slot').value,name,phone:$('d3-add-phone').value.trim(),partySize:Number($('d3-add-party').value),miniature:$('d3-add-miniature').checked,portrait:$('d3-add-portrait').checked,total:total()},sdk);
      if(!valid(ticket,generation))return;
      editor.close();busy=false;$('d3-add-save').disabled=false;$('d3-add-close').disabled=false;await load();
    }catch(error){if(valid(ticket,generation))$('d3-add-error').textContent=`登記失敗：${error.message}。請確認剩餘名額後重試。`;}
    finally{if(valid(ticket,generation)){busy=false;$('d3-add-save').disabled=false;$('d3-add-close').disabled=false;}}
  });
  $('d3-slots').addEventListener('click',async event=>{
    const add=event.target.closest('[data-d3-add]');if(add){openAdd(add.dataset.d3Add);return;}
    const cancel=event.target.closest('[data-d3-cancel]');
    if(!cancel || busy || loading || !context().authenticated)return;
    const row=rows.find(row=>row.id===cancel.dataset.d3Cancel);
    if(!row || !window.confirm(`確定取消「${row.name}」的整筆 ${row.partySize} 人報名？將保留紀錄並釋出 ${row.partySize} 個名額。`))return;
    const {db,sdk,generation}=context(),ticket=revision;
    busy=true;render();
    try{await cancelD3Registration(db,row.id,sdk);if(!valid(ticket,generation))return;busy=false;await load();}
    catch(error){if(valid(ticket,generation))$('d3-status').textContent=`取消失敗：${error.message}，請重新整理後重試。`;}
    finally{if(valid(ticket,generation)){busy=false;render();}}
  });
  $('d3-table').addEventListener('change',async event=>{
    const select=event.target.closest('[data-d3-addon]');
    if(!select || busy || loading || !context().authenticated)return;
    const row=rows.find(row=>row.id===select.dataset.d3Id);if(!row)return;
    const field=select.dataset.d3Addon,enabled=select.value==='true';
    const {db,sdk,generation}=context(),ticket=revision;
    busy=true;render();$('d3-status').textContent='正在儲存加購項目並更新總金額…';
    try {
      const patch=await updateD3Addon(db,row.id,field,enabled,sdk);
      if(!valid(ticket,generation))return;
      Object.assign(row,patch);
      $('d3-status').textContent=`${row.name}的加購項目已儲存，總金額 ${money(row.total)}。`;
    } catch(error){if(valid(ticket,generation))$('d3-status').textContent=`加購項目儲存失敗：${error.message}。已恢復原選項，請重試。`;}
    finally{if(valid(ticket,generation)){busy=false;render();}}
  });
  $('d3-table').addEventListener('submit',async event=>{
    const form=event.target.closest('[data-d3-image-email]');if(!form)return;
    event.preventDefault();
    if(busy || loading || !context().authenticated || !form.reportValidity())return;
    const row=rows.find(row=>row.id===form.dataset.d3ImageEmail);if(!row)return;
    const email=form.elements.imageEmail.value;
    const {db,sdk,generation}=context(),ticket=revision;
    busy=true;render();$('d3-status').textContent='正在儲存圖檔收件 email…';
    try {
      const saved=await updateD3ImageEmail(db,row.id,email,sdk);
      if(!valid(ticket,generation))return;
      row.imageRecipientEmail=saved;
      $('d3-status').textContent=`${row.name}的圖檔收件 email 已儲存。`;
    } catch(error){if(valid(ticket,generation))$('d3-status').textContent=`email 儲存失敗：${error.message}，請重試。`;}
    finally{if(valid(ticket,generation)){busy=false;render();}}
  });
  const shippingEditor=$('d3-shipping-editor');
  let shippingId=null;
  const shippingInputs={recipientName:'d3-recipient-name',recipientPhone:'d3-recipient-phone',recipientEmail:'d3-recipient-email',sevenElevenStore:'d3-store'};
  $('d3-table').addEventListener('click',event=>{
    const button=event.target.closest('[data-d3-shipping]');
    if(!button || busy || loading || !context().authenticated)return;
    const row=rows.find(row=>row.id===button.dataset.d3Shipping);if(!row || !row.miniature)return;
    shippingId=row.id;
    const defaults={recipientPhone:phoneText(row.phone),recipientEmail:row.imageRecipientEmail || ''};
    Object.entries(shippingInputs).forEach(([field,id])=>$(id).value=row[field] || defaults[field] || '');
    $('d3-shipping-booking').textContent=`${row.name} · ${slotLabel(row.slotId)}`;
    $('d3-shipping-error').textContent='';$('d3-shipping-save').disabled=false;$('d3-shipping-close').disabled=false;
    shippingEditor.showModal();
  });
  function closeShipping() {
    if(busy)return;
    const complete=Object.values(shippingInputs).every(id=>$(id).value.trim()) && $('d3-shipping-form').checkValidity();
    if(!complete && !window.confirm('寄送資料尚未填寫完整或格式不正確。確定關閉並放棄本次編輯？'))return;
    shippingEditor.close();
  }
  $('d3-shipping-close').addEventListener('click',closeShipping);
  shippingEditor.addEventListener('cancel',event=>{event.preventDefault();closeShipping();});
  $('d3-shipping-form').addEventListener('submit',async event=>{
    event.preventDefault();
    if(busy || !shippingId || !context().authenticated || !$('d3-shipping-form').reportValidity())return;
    const {db,sdk,generation}=context(),ticket=revision;
    const row=rows.find(row=>row.id===shippingId);
    if(!row?.miniature){$('d3-shipping-error').textContent='須先加購 3D 公仔印製，才能填寫寄送資訊。';return;}
    if(!Object.values(shippingInputs).every(id=>$(id).value.trim())){$('d3-shipping-error').textContent='四項寄送資料皆為必填，請完整填寫。';return;}
    const shipping={};
    Object.entries(shippingInputs).forEach(([field,id])=>shipping[field]=$(id).value);
    busy=true;$('d3-shipping-save').disabled=true;$('d3-shipping-close').disabled=true;$('d3-shipping-error').textContent='正在儲存…';
    try {
      await updateD3Shipping(db,shippingId,shipping,sdk);
      if(!valid(ticket,generation))return;
      shippingEditor.close();busy=false;await load();
    } catch(error){if(valid(ticket,generation))$('d3-shipping-error').textContent=error.code==='permission-denied'?'無法儲存：請確認此筆仍有加購 3D、四項寄送資料完整且格式正確，再重新整理後重試。':`儲存失敗：${error.message}。`;}
    finally{if(valid(ticket,generation)){busy=false;$('d3-shipping-save').disabled=false;$('d3-shipping-close').disabled=false;}}
  });
  return {render,reset(){shippingEditor.close();shippingId=null;$('d3-shipping-form').reset();$('d3-shipping-booking').textContent='';$('d3-shipping-error').textContent='';editor.close();addingId=null;busy=false;$('d3-add-form').reset();$('d3-add-error').textContent='';$('d3-add-save').disabled=false;$('d3-add-close').disabled=false;revision++;rows=null;slots=[];loading=false;for(const id of ['d3-slots','d3-summary','d3-table','d3-status'])$(id).replaceChildren();$('d3-slot').value='all';$('d3-search').value='';}};
}
