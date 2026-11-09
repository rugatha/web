// Coordinates use the original artwork, scaled to a 1843 × 1344 canvas.
// Borders and unrecorded positions are deliberately provisional.
const regions = {
  mattington: { color: '#e4c67e', center: [920, 905], polygon: [[490,860],[640,870],[850,830],[1040,710],[1120,560],[1155,590],[1185,620],[1210,650],[1230,650],[1250,800],[1390,850],[1418,838],[1410,866],[1370,898],[1325,900],[1305,927],[1280,980],[1240,1030],[1227,1100],[1205,1125],[1145,1135],[1120,1122],[1065,1133],[1030,1090],[1020,1045],[974,1017],[976,968],[945,961],[905,990],[914,1043],[950,1093],[946,1120],[909,1134],[884,1170],[852,1136],[816,1128],[785,1150],[761,1182],[720,1188],[700,1203],[646,1194],[646,1160],[687,1140],[716,1110],[710,1070],[671,1038],[632,1050],[602,1010],[566,993],[555,1008],[582,1042],[604,1059],[570,1083],[535,1073],[493,1100],[469,1084],[444,1137],[393,1158],[382,1110],[392,1070],[425,1040],[472,1020],[505,990],[536,984],[534,940],[525,900],[511,880]] },
  chryomen: { color: '#c1d5e4', center: [945, 480], polygon: [[490,860],[502,831],[496,785],[482,748],[494,713],[511,692],[545,670],[568,678],[588,653],[630,637],[655,610],[670,590],[665,572],[705,539],[739,506],[755,490],[770,490],[778,474],[800,467],[826,481],[844,469],[850,444],[865,427],[881,427],[893,455],[901,480],[929,489],[943,470],[951,439],[970,402],[977,364],[982,321],[975,289],[974,271],[990,246],[995,216],[1017,234],[1026,251],[1054,274],[1079,250],[1075,224],[1100,217],[1104,206],[1128,222],[1148,253],[1153,284],[1150,320],[1161,336],[1190,340],[1202,359],[1184,392],[1189,418],[1184,451],[1194,473],[1194,519],[1183,542],[1155,555],[1150,575],[1120,560],[1040,710],[850,830],[640,870]] },
  lothum: { color: '#a9dba0', center: [1462, 555], polygon: [[1230,650],[1236,610],[1228,588],[1239,565],[1269,535],[1304,533],[1330,513],[1360,490],[1394,476],[1390,455],[1376,460],[1374,435],[1385,411],[1388,386],[1377,367],[1356,360],[1364,335],[1345,303],[1344,282],[1362,258],[1360,241],[1382,218],[1390,195],[1377,180],[1386,151],[1416,162],[1437,183],[1445,213],[1434,240],[1465,249],[1482,260],[1508,255],[1528,264],[1540,260],[1568,273],[1600,298],[1631,320],[1649,348],[1652,376],[1634,399],[1606,424],[1572,438],[1560,468],[1565,495],[1550,519],[1542,552],[1532,579],[1540,610],[1535,628],[1568,641],[1600,645],[1639,650],[1671,656],[1689,638],[1710,632],[1734,640],[1751,638],[1744,656],[1732,667],[1722,696],[1686,706],[1665,709],[1645,726],[1620,749],[1597,764],[1593,792],[1602,818],[1601,838],[1564,833],[1523,840],[1481,857],[1450,850],[1433,828],[1416,836],[1390,850],[1250,800]] }
};
const home = {x:300,y:150,w:1500,h:1120};
const svg = document.querySelector('#world-map');
const territoryLayer = document.querySelector('#territories');
const markerLayer = document.querySelector('#markers');
const search = document.querySelector('#place-search');
const summary = document.querySelector('#place-summary');
const list = document.querySelector('#place-list');
const tooltip = document.querySelector('#hover-label');
const ns = 'http://www.w3.org/2000/svg';
let realm, kingdom = null, city = null, poi = null, settlementLayout, view = {...home}, animation;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const make = (tag, attrs = {}) => {const el = document.createElementNS(ns, tag); for (const [key,value] of Object.entries(attrs)) el.setAttribute(key,value); return el;};
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const name = place => escape(place.name_zh);
const poiOwners = new WeakMap();
const isUnassigned = c => c?.slug === 'unassigned-locations';
const settlements = k => k.cities.filter(c=>!isUnassigned(c));
const standalonePois = k => k.cities.filter(isUnassigned).flatMap(c=>c.pois);
function standaloneConfig(p) {return settlementLayout.standalone_pois[kingdom.slug]?.[p.slug];}
function route(place) {
  const owner=place===poi?poiOwners.get(place):null;
  return '/map/location/material-realm/' + [kingdom?.slug, city?.slug||owner?.slug, place===poi?poi.slug:null].filter(Boolean).join('/') + '/';
}
// Known settlements occupy only small parts of each kingdom; the rest is unexplored.
const cityAreas = new Map();
function inside([x,y], polygon) {
  let result = false;
  for (let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
    const [ax,ay]=polygon[i], [bx,by]=polygon[j];
    if ((ay>y)!==(by>y) && x<(bx-ax)*(y-ay)/(by-ay)+ax) result=!result;
  }
  return result;
}
function clip(polygon, a, b, limit) {
  const output=[];
  for(let i=0;i<polygon.length;i++) {
    const start=polygon[i], end=polygon[(i+1)%polygon.length];
    const ds=a*start[0]+b*start[1]-limit, de=a*end[0]+b*end[1]-limit;
    if(ds<=0) output.push(start);
    if((ds<=0)!==(de<=0)) {const t=ds/(ds-de);output.push([start[0]+t*(end[0]-start[0]),start[1]+t*(end[1]-start[1])]);}
  }
  return output;
}
function bounds(points, padding=45) {
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  const x=Math.min(...xs)-padding,y=Math.min(...ys)-padding;
  return {x,y,w:Math.max(...xs)-x+padding,h:Math.max(...ys)-y+padding};
}
function prepareCityAreas(k) {
  const land=regions[k.slug].polygon;
  for(const c of k.cities) {
    c.pois.forEach(p=>poiOwners.set(p,c));
    if(isUnassigned(c)) {
      for(const p of c.pois) if(!settlementLayout.standalone_pois[k.slug]?.[p.slug]) throw new Error(`缺少獨立地標位置：${p.slug}`);
      continue;
    }
    const config=settlementLayout.kingdoms[k.slug][c.slug];
    if(!config) throw new Error(`缺少城鎮配置：${k.slug}/${c.slug}`);
    const cell=config.polygon;
    let visible=config.kind==='island'?cell:land;
    if(config.kind!=='island')cell.forEach(([x,y],j)=>{const [nx,ny]=cell[(j+1)%cell.length];const a=ny-y,b=x-nx;visible=clip(visible,a,b,a*x+b*y);});
    cityAreas.set(c,{...config,visible,index:k.cities.indexOf(c),kingdom:k});
  }
}
const poiPositions = new WeakMap();
function poiPoint(p,index) {
  if(poiPositions.has(city)) return poiPositions.get(city)[index];
  const area=cityAreas.get(city), [x,y]=area.center;
  const usable=area.visible.filter(p=>(area.kind==='island'||inside(p,regions[kingdom.slug].polygon)));
  const box=bounds(usable.length?usable:area.polygon,0);
  const candidates=[];
  // Only the central explored part contains known POIs; outer districts stay open.
  const explored=area.polygon.map(([xx,yy])=>[x+(xx-x)*.55,y+(yy-y)*.55]);
  const step=Math.max(.8,Math.min(box.w,box.h)/28);
  for(let yy=box.y+step;yy<box.y+box.h;yy+=step) for(let xx=box.x+step;xx<box.x+box.w;xx+=step) if(inside([xx,yy],explored)&&(area.kind==='island'||inside([xx,yy],regions[kingdom.slug].polygon))) candidates.push([xx,yy]);
  if(!candidates.length)return [x,y];
  const chosen=[];
  for(let n=0;n<city.pois.length;n++) {
    const next=candidates.reduce((best,p)=>{
      const score=q=>chosen.length?Math.min(...chosen.map(s=>Math.hypot(s[0]-q[0],s[1]-q[1]))): -Math.hypot(q[0]-x,q[1]-y);
      return score(p)>score(best)?p:best;
    },candidates[0]);chosen.push(next);
  }
  poiPositions.set(city,chosen);
  return chosen[index];
}
function setView(next, animate = true) {
  cancelAnimationFrame(animation);
  const start = {...view}, began = performance.now();
  function frame(now) {const t = animate && !reducedMotion ? Math.min(1,(now-began)/460) : 1; const e=1-Math.pow(1-t,3); for(const key of ['x','y','w','h']) view[key]=start[key]+(next[key]-start[key])*e; svg.setAttribute('viewBox',`${view.x} ${view.y} ${view.w} ${view.h}`); scaleMarkers(); if(t<1) animation=requestAnimationFrame(frame);}
  animation=requestAnimationFrame(frame);
}
// Side walls belong only to exposed perimeter edges. Shared borders stay on the top face.
function exposedEdges(faces) {
  const key=p=>p.map(n=>Math.round(n*1000)/1000).join(',');
  const edges=new Map();
  for(const face of faces) for(let i=0;i<face.polygon.length;i++) {
    const a=face.polygon[i],b=face.polygon[(i+1)%face.polygon.length];
    const id=[key(a),key(b)].sort().join('|');
    const record=edges.get(id);
    if(record) record.count++;
    else edges.set(id,{a,b,color:face.color,count:1});
  }
  // SVG polygons are clockwise; only edges facing the downward extrusion are visible.
  return [...edges.values()].filter(edge=>edge.count===1&&edge.a[0]>edge.b[0]+.001);
}
function wallPath(a,b,depth) {
  return `M${a[0]},${a[1]} L${b[0]},${b[1]} L${b[0]},${b[1]+depth} L${a[0]},${a[1]+depth} Z`;
}
function scaleMarkers(){
  const size=svg.getBoundingClientRect();
  const scale=Math.max(view.w/size.width,view.h/size.height);
  // Keep depth and lift in screen pixels even when a tiny settlement is enlarged.
  for(const layer of [territoryLayer,markerLayer]) layer.style.transform=kingdom?`translateY(${-18*scale}px)`:'none';
  territoryLayer.style.setProperty('--rise',`${18*scale}px`);
  territoryLayer.querySelectorAll('.depth-face').forEach(wall=>wall.setAttribute('d',wallPath([+wall.dataset.ax,+wall.dataset.ay],[+wall.dataset.bx,+wall.dataset.by],12*scale)));
  markerLayer.querySelectorAll('.marker').forEach(m=>m.setAttribute('transform',`translate(${m.dataset.x} ${m.dataset.y}) scale(${scale})`));
}
function focusView(){
  if(poi&&!city) {const [x,y]=standaloneConfig(poi).point;setView({x:x-100,y:y-80,w:200,h:160});}
  else if(city) {const area=cityAreas.get(city),box=bounds(area.visible,0);setView(bounds(area.visible,Math.max(box.w,box.h)*.28));}
  else if(kingdom){const points=regions[kingdom.slug].polygon;const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);const x=Math.min(...xs)-65,y=Math.min(...ys)-65;setView({x,y,w:Math.max(...xs)-x+65,h:Math.max(...ys)-y+65});}
  else setView({...home});
}
function select(k = null,c = null,p = null){kingdom=k;city=isUnassigned(c)?null:c;poi=p;search.value='';tooltip.hidden=true;render();if(!p||!city)focusView();}
function marker(place, position, index, isPoi){
  const g=make('g',{class:`marker${isPoi&&city?.pois.length>6?' compact-poi':''}${poi===place?' active':''}`,role:'button',tabindex:'0','aria-label':`${place.name_zh}，${isPoi?'查看地標':'探索城鎮'}`});
  [g.dataset.x,g.dataset.y]=position;
  if(isPoi){g.append(make('path',{class:'pin',d:'M0 1 C-3 -4 -9 -9 -9 -15 A9 9 0 1 1 9 -15 C9 -9 3 -4 0 1Z',fill:'#d9bb75',stroke:'#263a2c','stroke-width':2}));const number=make('text',{x:0,y:-12,'text-anchor':'middle',style:'font:9px system-ui;fill:#152a22;stroke:none'});number.textContent=index+1;g.append(number);}
  else {g.setAttribute('class','marker city-label');g.append(make('circle',{r:3,fill:regions[kingdom.slug].color,stroke:'#e9edda','stroke-width':1}));g.append(make('rect',{x:-45,y:-12,width:90,height:24,fill:'transparent'}));}
  const offset=!isPoi?cityAreas.get(place).label_offset||[0,-11]:[14,-10];const label=make('text',{class:isPoi?'poi-name':'city-name',x:offset[0],y:offset[1],...(!isPoi?{'text-anchor':'middle'}:{})});label.textContent=(!isPoi&&cityAreas.get(place).kind==='underground'?'▾ ':'')+place.name_zh;g.append(label);
  const action=()=>select(kingdom,isPoi?city:place,isPoi?place:null);
  g.addEventListener('click',event=>{event.stopPropagation();if(!dragged)action();});g.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();action();}});markerLayer.append(g);
}
function areaLabel(place,center){const g=make('g',{class:'marker kingdom-label','aria-hidden':'true'});[g.dataset.x,g.dataset.y]=center;const t=make('text',{'text-anchor':'middle',y:0});t.textContent=place.name_zh;g.append(t);markerLayer.append(g);}
function showTooltip(k,event){tooltip.innerHTML=`${name(k)}<small>${escape(k.name_en)} · ${city?'已選取區域':'點選探索'}</small>`;tooltip.hidden=false;const rect=svg.getBoundingClientRect(); const pos=event?.clientX ? [event.clientX-rect.left,event.clientY-rect.top-12] : [rect.width/2,rect.height/2]; tooltip.style.left=`${Math.max(100,Math.min(rect.width-100,pos[0]))}px`;tooltip.style.top=`${Math.max(90,pos[1])}px`;}
function geographicFeatures() {
  const features=settlementLayout.features.filter(f=>f.kingdom===kingdom.slug);
  for(const feature of features) {
    const group=make('g',{class:`geographic-feature ${feature.kind}`,'aria-hidden':'true'});
    if(feature.points) group.append(make('polyline',{points:feature.points.map(p=>p.join(',')).join(' '),fill:'none'}));
    const label=make('text',{x:feature.label[0],y:feature.label[1],'text-anchor':'middle'});label.textContent=feature.name;group.append(label);
    // Context has no pointer interaction and sits below the city faces.
    territoryLayer.append(group);
  }
}
function render(){
  territoryLayer.replaceChildren();markerLayer.replaceChildren();
  territoryLayer.setAttribute('class',kingdom?'raised-scene':'');
  markerLayer.setAttribute('class',kingdom?'raised-scene':'');
  const defs=make('defs');
  for(const k of realm.kingdoms) {const cp=make('clipPath',{id:`land-${k.slug}`,clipPathUnits:'userSpaceOnUse'});cp.append(make('polygon',{points:regions[k.slug].polygon.map(p=>p.join(',')).join(' ')}));defs.append(cp);}
  territoryLayer.append(defs);
  const depthLayer=make('g',{class:'terrain-depth','aria-hidden':'true'});
  const depthFaces=[];
  let depthAdded=false;
  function areaShape(place, polygon, color, selected=false, clipped=false) {
    const group=make('g',{class:`region-area ${cityAreas.get(place)?.kind||''}${selected?' selected':''}`,'data-slug':place.slug});
    const points=polygon.map(p=>p.join(',')).join(' ');
    const attrs={points,...(clipped&&cityAreas.get(place)?.kind!=='island'?{'clip-path':`url(#land-${kingdom.slug})`}:{})};
    if(!depthAdded){territoryLayer.append(depthLayer);depthAdded=true;}
    const area=cityAreas.get(place);
    if(area?.kind!=='forest'&&area?.kind!=='underground') depthFaces.push({polygon:clipped&&area?.kind!=='island'?area.visible:polygon,color});
    const surface=make('polygon',{...attrs,fill:color,class:'territory',stroke:'#172e28',tabindex:selected?'-1':'0',role:'button','aria-label':`${place.name_zh}，${selected?'已選取':'點選探索'}`});
    const action=()=>{if(!dragged&&!selected) kingdom?select(kingdom,place):select(place);};
    surface.addEventListener('mouseenter',event=>showTooltip(place,event));surface.addEventListener('mousemove',event=>showTooltip(place,event));surface.addEventListener('mouseleave',()=>tooltip.hidden=true);surface.addEventListener('focus',()=>showTooltip(place));surface.addEventListener('blur',()=>tooltip.hidden=true);surface.addEventListener('click',action);surface.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();action();}});
    group.append(surface);territoryLayer.append(group);
  }
  if(city) {
    const area=cityAreas.get(city);areaShape(city,area.polygon,regions[kingdom.slug].color,true,true);
    city.pois.forEach((p,i)=>marker(p,poiPoint(p,i),i,true));
  } else if(kingdom) {
    // Keep an unlabelled, noninteractive silhouette for the uncharted surroundings.
    territoryLayer.append(make('polygon',{points:regions[kingdom.slug].polygon.map(p=>p.join(',')).join(' '),fill:regions[kingdom.slug].color,class:'unexplored-land','aria-hidden':'true'}));
    // Each city face is clipped to the coastline of its parent kingdom.
    geographicFeatures();
    const ordered=settlements(kingdom).sort((a,b)=>(cityAreas.get(a).kind==='forest'?-1:0)-(cityAreas.get(b).kind==='forest'?-1:0));
    ordered.forEach(c=>{const area=cityAreas.get(c),i=kingdom.cities.indexOf(c);const hue={mattington:42,chryomen:199,lothum:123}[kingdom.slug];
      areaShape(c,area.polygon,area.kind==='forest'?'#4d7859':`hsl(${hue+(i%3)*5} 32% ${53+(i%5)*5}%)`,false,true);
      marker(c,area.center,i,false);
    });
    standalonePois(kingdom).forEach((p,i)=>marker(p,standaloneConfig(p).point,i,true));
  } else {
    for(const k of realm.kingdoms){const r=regions[k.slug];areaShape(k,r.polygon,r.color);for(const c of settlements(k))if(cityAreas.get(c).kind==='island')areaShape(k,cityAreas.get(c).polygon,r.color);areaLabel(k,r.center);}
  }
  // Paint every wall behind every top face, with no walls on shared city boundaries.
  for(const edge of exposedEdges(depthFaces)) {
    const wall=make('path',{class:'depth-face',fill:edge.color,d:wallPath(edge.a,edge.b,12)});
    Object.assign(wall.dataset,{ax:edge.a[0],ay:edge.a[1],bx:edge.b[0],by:edge.b[1]});
    depthLayer.append(wall);
  }
  const current=poi||city||kingdom||realm;
  const geography=poi&&!city?standaloneConfig(poi):city&&!poi?cityAreas.get(city):null;
  const geographyCopy=geography?`<div class="geography-note"><p class="place-type">地理線索</p><p>${escape(geography.placement_note)}</p><div>${geography.sources.map((url,i)=>`<a href="${escape(url)}">${i===0?'地點描述':`章節 ${i}`} ↗</a>`).join('')}</div></div>`:'';
  const type=poi?'地標 / POINT OF INTEREST':city?'城鎮與地區 / SETTLEMENT':kingdom?'王國 / KINGDOM':'物質時空 / MATERIAL REALM';
  summary.innerHTML=`${kingdom?'<button class="back-button" id="back">← 返回上一層</button>':''}<p class="place-type">${type}</p><h2 class="place-title">${kingdom?name(current):'三個王國，一片大陸'}</h2><p class="place-en">${escape(current.name_en)}</p><p class="description">${escape(current.desc_zh)}</p>${poi?`<img class="place-photo" src="${escape(poi.image)}" alt="${name(poi)}" loading="lazy">`:''}${geographyCopy}${!poi?`<div class="stats">${!kingdom?`<span><b>3</b>王國</span>`:''}<span><b>${city?city.pois.length:kingdom?settlements(kingdom).length:realm.kingdoms.reduce((n,k)=>n+settlements(k).length,0)}</b>${city?'地標':'城鎮與地區'}</span>${kingdom&&!city&&standalonePois(kingdom).length?`<span><b>${standalonePois(kingdom).length}</b>獨立地標</span>`:''}</div>`:''}<a class="atlas-link" href="${kingdom?route(current):'/map/location/material-realm/'}">在地點圖鑑閱讀更多 ↗</a>`;
  summary.querySelector('#back')?.addEventListener('click',()=>poi?select(kingdom,city):city?select(kingdom):select());
  summary.querySelector('img')?.addEventListener('error',event=>event.target.hidden=true);
  const trail=document.querySelector('#trail');trail.replaceChildren();
  for(const [index,place] of [realm,kingdom,city,poi].filter(Boolean).entries()){if(index){const sep=document.createElement('i');sep.textContent='/';trail.append(sep);}const el=document.createElement(place===current?'span':'button');el.textContent=place.name_zh;if(el.tagName==='BUTTON')el.addEventListener('click',()=>index===0?select():index===1?select(kingdom):select(kingdom,city));else el.setAttribute('aria-current','location');trail.append(el);}
  document.querySelector('#map-level').textContent=city?`${city.name_zh} · 地標視角`:kingdom?`${kingdom.name_zh} · 王國視角`:'全島視角';
  document.querySelector('#map-hint').textContent=city?'地標集中於已探索範圍 · 其餘區域尚待探索':kingdom?'小色塊為聚落 · 虛線為行程關係 · 腹地尚待探索':'滑過王國查看輪廓 · 點選深入探索';
  search.placeholder=city?'輸入地標名稱…':kingdom?'輸入城鎮或地標名稱…':'輸入王國名稱…';
  renderList();scaleMarkers();
}
function renderList(){
  const items=city?city.pois:kingdom?[...settlements(kingdom),...standalonePois(kingdom)]:realm.kingdoms;
  const filtered=items.filter(p=>`${p.name_zh} ${p.name_en}`.toLowerCase().includes(search.value.trim().toLowerCase()));
  document.querySelector('#list-title').textContent=city?'探索地標':kingdom?'城鎮與獨立地標':'選擇王國';document.querySelector('#list-count').textContent=`${filtered.length} / ${items.length}`;
  list.replaceChildren();
  filtered.forEach(p=>{const index=items.indexOf(p);const b=document.createElement('button');b.type='button';b.className=`place-row${poi===p?' active':''}`;b.style.setProperty('--row-color',regions[p.slug]?.color||regions[kingdom?.slug]?.color||'#d6bc7a');b.innerHTML=`<span class="row-symbol" aria-hidden="true">${city?String(index+1).padStart(2,'0'):kingdom?(p.pois?'◇':String(standalonePois(kingdom).indexOf(p)+1).padStart(2,'0')):'♜'}</span><span class="row-copy"><strong>${name(p)}</strong><small>${escape(p.name_en)}${p.cities?` · ${settlements(p).length} 個城鎮與地區`:p.pois?` · ${p.pois.length} 個地標`:kingdom?' · 獨立地標':''}</small></span><span class="row-arrow" aria-hidden="true">↗</span>`;b.addEventListener('click',()=>city?select(kingdom,city,p):kingdom?(p.pois?select(kingdom,p):select(kingdom,null,p)):select(p));
    if(!city){const highlight=on=>{const region=territoryLayer.querySelector(`[data-slug="${p.slug}"]`);region?.classList[on?'add':'remove']('highlighted');};b.addEventListener('mouseenter',()=>highlight(true));b.addEventListener('mouseleave',()=>highlight(false));b.addEventListener('focus',()=>highlight(true));b.addEventListener('blur',()=>highlight(false));}list.append(b);});
  if(!filtered.length){const empty=document.createElement('p');empty.className='empty';empty.textContent=items.length?'找不到符合的地點，請試試其他名稱。':'此地尚未收錄地標，可前往地點圖鑑閱讀介紹。';list.append(empty);}
}
search.addEventListener('input',renderList);
function zoom(factor){const w=Math.max(8,Math.min(2200,view.w*factor)),h=w*view.h/view.w;setView({x:view.x+(view.w-w)/2,y:view.y+(view.h-h)/2,w,h},false);}
document.querySelector('#zoom-in').addEventListener('click',()=>zoom(.75));document.querySelector('#zoom-out').addEventListener('click',()=>zoom(1.333));document.querySelector('#reset-view').addEventListener('click',()=>select());
svg.addEventListener('wheel',event=>{event.preventDefault();zoom(event.deltaY>0?1.1:.9);},{passive:false});
let drag=null,dragged=false;
svg.addEventListener('pointerdown',event=>{if(event.button!==0)return;cancelAnimationFrame(animation);dragged=false;const matrix=svg.getScreenCTM();drag={id:event.pointerId,x:event.clientX,y:event.clientY,view:{...view},scale:matrix.a};});
svg.addEventListener('pointermove',event=>{if(!drag||drag.id!==event.pointerId)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(Math.hypot(dx,dy)>5){dragged=true;svg.classList.add('dragging');svg.setPointerCapture(event.pointerId);tooltip.hidden=true;setView({...drag.view,x:drag.view.x-dx/drag.scale,y:drag.view.y-dy/drag.scale},false);}});
function endDrag(){drag=null;svg.classList.remove('dragging');setTimeout(()=>dragged=false,0);}
svg.addEventListener('pointerup',endDrag);svg.addEventListener('pointercancel',endDrag);
svg.addEventListener('keydown',event=>{if(event.target!==svg)return;const shifts={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};if(shifts[event.key]){event.preventDefault();const [x,y]=shifts[event.key];setView({...view,x:view.x+x*view.w*.12,y:view.y+y*view.h*.12},false);}if(event.key==='+'||event.key==='=')zoom(.75);if(event.key==='-')zoom(1.333);if(event.key==='Escape')select();});
new ResizeObserver(scaleMarkers).observe(svg);
try {
  const responses=await Promise.all([fetch('/map/location/assets/location.json'),fetch('/map/assets/settlement-layout.json')]);
  if(responses.some(r=>!r.ok))throw new Error('地點資料載入失敗');
  const [data,layout]=await Promise.all(responses.map(r=>r.json()));realm=data.realms.find(r=>r.slug==='material-realm');settlementLayout=layout;realm.kingdoms.forEach(prepareCityAreas);render();
} catch(error){summary.innerHTML='<h2 class="place-title">暫時無法載入地點</h2><p class="description">請重新整理頁面，或前往地點圖鑑。</p><a class="atlas-link" href="/map/location/">開啟地點圖鑑 ↗</a>';search.disabled=true;console.error(error);}
