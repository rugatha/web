import { MIN_DATE,dayKey,toDate } from './dashboard-model.js?v=20261025-admin-v5';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function moveColumn(order, from, to) {
  if(!order.includes(from)||!order.includes(to)||from===to)return [...order];
  const next=order.filter(id=>id!==from);next.splice(order.indexOf(to),0,from);return next;
}
export function filterTableRows(rows,columns,filters={}) {
  return rows.filter(row=>columns.every(col=>{
    const filter=filters[col.id];if(!filter)return true;
    const value=col.value(row);
    if(col.type==='number')return (filter.min===''||filter.min==null||(value!=null&&Number(value)>=Number(filter.min)))&&(filter.max===''||filter.max==null||(value!=null&&Number(value)<=Number(filter.max)));
    if(col.type==='date'){
      const day=dayKey(value);return (!filter.min||(day&&day>=filter.min))&&(!filter.max||(day&&day<=filter.max));
    }
    if(col.type==='category')return !filter.text||(Array.isArray(value)?value:[value]).includes(filter.text);
    return !filter.text||String(Array.isArray(value)?value.join('、'):value??'').normalize('NFKC').toLowerCase().includes(filter.text.normalize('NFKC').toLowerCase());
  }));
}
export function sortTableRows(rows,columns,sort) {
  if(!sort)return [...rows];
  const column=columns.find(col=>col.id===sort.id);if(!column)return [...rows];
  return [...rows].sort((a,b)=>{
    let av=(column.sortValue||column.value)(a),bv=(column.sortValue||column.value)(b);
    if(column.type==='date'){av=toDate(av)?.getTime()??null;bv=toDate(bv)?.getTime()??null;}
    if(av==null||av==='')return bv==null||bv===''?0:1;
    if(bv==null||bv==='')return -1;
    const diff=column.type==='number'||column.type==='date'?Number(av)-Number(bv):String(av).localeCompare(String(bv),'zh-Hant',{numeric:true});
    return diff*(sort.direction==='desc'?-1:1);
  });
}
const registry=new Map();
export function resetTablePages(){registry.forEach(grid=>grid.page=1);}
export function resetTablePage(id){const grid=registry.get(id);if(grid)grid.page=1;}
export function clearTableData(){registry.forEach(grid=>{grid.rows=[];grid.onResult=null;});}
export function dataTable(id,columns,rows,options={}) {
  let grid=registry.get(id);
  if(!grid){grid=new DataTable(id,columns);registry.set(id,grid);}
  grid.columns=columns;grid.rows=rows;grid.options=options;grid.onResult=options.onResult;grid.render();
}
class DataTable {
  constructor(id,columns){
    this.id=id;this.container=document.getElementById(id);this.columns=columns;this.rows=[];this.filters={};this.sort=null;this.page=1;this.order=columns.map(col=>col.id);this.dragged=null;
    try{const saved=JSON.parse(localStorage.getItem('rugatha-admin-columns:'+id));if(Array.isArray(saved))this.order=[...new Set(saved.filter(key=>this.order.includes(key))),...this.order.filter(key=>!saved.includes(key))];}catch{}
    this.container.classList.add('data-grid');
    this.container.addEventListener('input',event=>{if(event.target.matches('input[data-filter]:not([type=date])'))this.changeFilter(event.target);});
    this.container.addEventListener('change',event=>{if(event.target.matches('select[data-filter],input[type=date][data-filter]'))this.changeFilter(event.target);});
    this.container.addEventListener('click',event=>{
      const button=event.target.closest('button');if(!button)return;
      if(button.dataset.sort){const key=button.dataset.sort;this.sort={id:key,direction:this.sort?.id===key&&this.sort.direction==='asc'?'desc':'asc'};this.page=1;this.render();this.container.querySelector(`[data-sort="${key}"]`).focus({preventScroll:true});}
      if(button.dataset.gridStep){this.page+=Number(button.dataset.gridStep);this.render();}
      if(button.hasAttribute('data-clear-filters')){this.filters={};this.sort=null;this.page=1;this.render();}
      if(button.hasAttribute('data-reset-order')){this.order=this.columns.map(col=>col.id);this.save();this.render();}
    });
    this.container.addEventListener('dragstart',event=>{
      const handle=event.target.closest('[data-drag]');if(!handle)return;
      this.dragged=handle.dataset.drag;event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',this.dragged);this.container.classList.add('is-dragging');
    });
    this.container.addEventListener('dragover',event=>{if(this.dragged&&event.target.closest('th[data-column]')){event.preventDefault();event.dataTransfer.dropEffect='move';}});
    this.container.addEventListener('drop',event=>{
      const th=event.target.closest('th[data-column]');if(!th||!this.dragged)return;
      event.preventDefault();this.order=moveColumn(this.order,this.dragged,th.dataset.column);this.dragged=null;this.save();this.render();
    });
    this.container.addEventListener('dragend',()=>{this.dragged=null;this.container.classList.remove('is-dragging');});
    this.container.addEventListener('keydown',event=>{
      const handle=event.target.closest('[data-drag]');if(!handle||!event.altKey||!['ArrowLeft','ArrowRight'].includes(event.key))return;
      const index=this.order.indexOf(handle.dataset.drag),next=index+(event.key==='ArrowLeft'?-1:1);
      if(next<0||next>=this.order.length)return;
      event.preventDefault();const key=handle.dataset.drag;this.order=moveColumn(this.order,key,this.order[next]);this.save();this.render();this.container.querySelector(`[data-drag="${key}"]`).focus();
    });
  }
  save(){try{localStorage.setItem('rugatha-admin-columns:'+this.id,JSON.stringify(this.order));}catch{}}
  changeFilter(input){
    const key=input.dataset.filter;this.filters[key]??={};this.filters[key][input.dataset.bound||'text']=input.value;this.page=1;
    const focus={key,bound:input.dataset.bound||'',start:input.selectionStart,end:input.selectionEnd};this.render();
    const next=this.container.querySelector(`[data-filter="${focus.key}"][data-bound="${focus.bound}"]`);
    next?.focus({preventScroll:true});if(next&&focus.start!=null&&next.type==='search')next.setSelectionRange(focus.start,focus.end);
  }
  headerFilter(col){
    const filter=this.filters[col.id]||{};
    if(col.type==='category'){
      const values=[...new Set(this.rows.flatMap(row=>{const value=col.value(row);return Array.isArray(value)?value:[value];}).filter(value=>value!=null&&value!==''))].sort((a,b)=>String(a).localeCompare(String(b),'zh-Hant'));
      if(filter.text&&!values.includes(filter.text))values.unshift(filter.text);
      return `<select data-filter="${col.id}" data-bound="" aria-label="篩選${esc(col.label)}"><option value="">全部</option>${values.map(value=>`<option ${filter.text===value?'selected':''} value="${esc(value)}">${esc(value)}</option>`).join('')}</select>`;
    }
    if(['number','date'].includes(col.type))return `<div class="column-bounds">${['min','max'].map((key,index)=>`<input type="${col.type==='date'?'date':'number'}" ${col.type==='number'?'step="any"':`min="${MIN_DATE}" max="${dayKey(new Date())}"`} data-filter="${col.id}" data-bound="${key}" value="${esc(filter[key]||'')}" placeholder="${index?'最大':'最小'}" aria-label="${esc(col.label)}${index?'上限':'下限'}">`).join('')}</div>`;
    return `<input type="search" data-filter="${col.id}" data-bound="" value="${esc(filter.text||'')}" placeholder="篩選…" aria-label="篩選${esc(col.label)}">`;
  }
  render(){
    this.container.classList.remove('is-dragging');
    const filtered=sortTableRows(filterTableRows(this.rows,this.columns,this.filters),this.columns,this.sort);
    const size=this.options.pageSize||25,paginate=this.options.paginate!==false,totalPages=Math.max(1,Math.ceil(filtered.length/size));this.page=Math.min(this.page,totalPages);
    const visible=paginate?filtered.slice((this.page-1)*size,this.page*size):filtered;
    const columns=this.order.map(id=>this.columns.find(col=>col.id===id)).filter(Boolean);
    this.container.innerHTML=`<div class="table-tools"><span>點欄名排序 · 欄下方篩選 · 拖曳 ⠿ 調整欄序</span><div><button type="button" data-clear-filters>清除欄位條件</button><button type="button" data-reset-order>還原欄序</button></div></div><div class="grid-scroll"><table><thead><tr>${columns.map(col=>`<th scope="col" data-column="${col.id}" aria-sort="${this.sort?.id===col.id?(this.sort.direction==='asc'?'ascending':'descending'):'none'}"><div class="column-heading"><button type="button" class="drag-handle" draggable="true" data-drag="${col.id}" aria-label="拖曳${esc(col.label)}欄位" title="拖曳換序，或按 Alt＋左右方向鍵">⠿</button><button type="button" class="column-sort" data-sort="${col.id}">${esc(col.label)} <span>${this.sort?.id===col.id?(this.sort.direction==='asc'?'↑':'↓'):'↕'}</span></button></div>${this.headerFilter(col)}</th>`).join('')}</tr></thead><tbody>${visible.map(row=>`<tr>${columns.map(col=>`<td class="${col.className||''}" data-column="${col.id}">${col.html?col.html(row):esc(Array.isArray(col.value(row))?col.value(row).join('、'):col.value(row)??'—')}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${columns.length}" class="grid-empty">沒有符合欄位條件的資料。</td></tr>`}</tbody></table></div><div class="pagination"><span>符合 ${filtered.length} 筆${paginate?` · 每頁 ${size} 筆`:''}</span>${paginate?`<div><button data-grid-step="-1" ${this.page===1?'disabled':''}>上一頁</button> <span>${this.page} / ${totalPages}</span> <button data-grid-step="1" ${this.page===totalPages?'disabled':''}>下一頁</button></div>`:''}</div>`;
    this.onResult?.(filtered);
  }
}
