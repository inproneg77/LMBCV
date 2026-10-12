(function(root){
 'use strict';
 const text=v=>String(v??'').replace(/\s+/g,' ').trim();
 const H=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function snapshot(table,meta){
  return {...meta,headers:Array.from(table.querySelectorAll('thead th'),c=>text(c.textContent)),rows:Array.from(table.querySelectorAll('tbody tr'),tr=>({cells:Array.from(tr.cells,c=>text(c.textContent)),logos:Array.from(tr.cells,c=>c.querySelector('img')?.src||'')})),generated:new Date().toLocaleString('es-MX',{timeZone:'America/Hermosillo',hour12:false})};
 }
 function csv(model){
  const cell=v=>'"'+String(v??'').replace(/^[\s]*[=+@-]/,m=>"'"+m).replace(/"/g,'""')+'"';
  return '\ufeff'+[[model.title],[model.category,model.season],['Actualizado',model.generated],[],model.headers,...model.rows.map(r=>r.cells),[],[model.note||'']].map(row=>row.map(cell).join(',')).join('\r\n');
 }
 function filename(model){return ('LMBC-'+model.title+'-'+model.category+'-'+model.season).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9-]+/g,'-').replace(/-+/g,'-').slice(0,160);}
 function lines(ctx,value,width){
  const out=[];let line='';for(const word of text(value).split(' ')){if(!word)continue;const candidate=line?line+' '+word:word;if(ctx.measureText(candidate).width<=width){line=candidate;continue;}if(line){out.push(line);line='';}for(const char of Array.from(word)){if(line&&ctx.measureText(line+char).width>width){out.push(line);line='';}line+=char;}}
  if(line)out.push(line);return out.length?out:[''];
 }
 function printHTML(m){
  return '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>'+H(m.title)+' · LMBC</title><style>@page{size:A4 landscape;margin:12mm}body{font:12px Arial;color:#122825}h1{font-size:24px;margin:0 0 8px}p{line-height:1.5}table{border-collapse:collapse;width:100%;table-layout:fixed}th,td{padding:9px 5px;border-bottom:1px solid #ccd6cb;text-align:center;overflow-wrap:anywhere}th{background:#e6eddc}td:nth-child(2){text-align:left}img{width:30px;height:30px;object-fit:contain;vertical-align:middle;margin-right:7px}thead{display:table-header-group}tr{break-inside:avoid}.note{font-size:10px}</style></head><body><h1>LMBC · '+H(m.title)+'</h1><p>'+H(m.category)+' · '+H(m.season)+'<br>Actualizado: '+H(m.generated)+'</p><table><thead><tr>'+m.headers.map(h=>'<th>'+H(h)+'</th>').join('')+'</tr></thead><tbody>'+m.rows.map(r=>'<tr>'+r.cells.map((c,i)=>'<td>'+(r.logos[i]?'<img alt="" src="'+H(r.logos[i])+'">':'')+H(c)+'</td>').join('')+'</tr>').join('')+'</tbody></table><p class="note">'+H(m.note||'')+'</p><p>caborcavets.online</p></body></html>';
 }
 const api={snapshot,csv,filename,lines,printHTML};
 if(typeof module!=='undefined'&&module.exports){module.exports=api;return;}
 const base=new URL('../',document.currentScript.src),imageURL=p=>new URL(p,base).href;
 async function image(src){
  if(!src)return null;try{const u=new URL(src,base);if(u.origin!==base.origin)return null;return await new Promise(resolve=>{const img=new Image();const timer=setTimeout(()=>{img.onload=img.onerror=null;resolve(null);},4000);img.onload=()=>{clearTimeout(timer);resolve(root.ArenaUI?.logoForExport(img)||img);};img.onerror=()=>{clearTimeout(timer);resolve(null);};img.src=u.href;});}catch{return null;}
 }
 function drawImage(ctx,img,x,y,w,h){if(!img)return;const ratio=Math.min(w/(img.naturalWidth||img.width),h/(img.naturalHeight||img.height));const iw=(img.naturalWidth||img.width)*ratio,ih=(img.naturalHeight||img.height)*ratio;ctx.drawImage(img,x+(w-iw)/2,y+(h-ih)/2,iw,ih);}
 async function poster(m){
  const canvas=document.createElement('canvas');canvas.width=1200;const ctx=canvas.getContext('2d');if(!ctx)throw Error('Este navegador no permite generar la imagen. Intenta de nuevo desde Chrome.');
  const n=m.headers.length,weights=m.headers.map((h,i)=>i===0?.6:/equipo|jugador|valioso|local|visitante/i.test(h)?3.6:/sede|detalle/i.test(h)?2.4:1.2),sum=weights.reduce((a,b)=>a+b,0),widths=weights.map(w=>w/sum*1104);
  ctx.font='500 22px Arial';const layout=m.rows.map(r=>{const wrapped=r.cells.map((c,i)=>lines(ctx,c,widths[i]-24-(r.logos[i]?52:0)));return {row:r,wrapped,height:Math.max(66,...wrapped.map(a=>a.length*29+24))};});
  ctx.font='700 20px Arial';const headers=m.headers.map((h,i)=>lines(ctx,h,widths[i]-18));const headHeight=Math.max(64,...headers.map(a=>a.length*26+24));
  ctx.font='700 36px Arial';const titleLines=lines(ctx,m.title,990),extraTitle=(titleLines.length-1)*42;
  ctx.font='500 22px Arial';const category=lines(ctx,m.category+' · '+m.season,1000);const start=160+extraTitle+category.length*29;
  ctx.font='400 18px Arial';const notes=lines(ctx,m.note||'',1104),height=start+headHeight+layout.reduce((a,r)=>a+r.height,0)+notes.length*25+190;
  if(height>16000)throw Error('La tabla es demasiado larga para una sola imagen. Selecciona una categoría y una fecha más específicas.');canvas.height=height;
  const sources=[imageURL('img/equipos/logovets.png'),...m.rows.flatMap(r=>r.logos).filter(Boolean),...(m.sponsors||[]).filter(s=>s.logo).slice(0,6).map(s=>imageURL(s.logo))];
  const loaded=await Promise.all([...new Set(sources)].map(async src=>[src,await image(src)])),images=new Map(loaded);const missing=loaded.filter(([,img])=>!img).length;
  ctx.fillStyle='#122825';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#d9e79e';ctx.font='700 22px Arial';ctx.fillText('LMBC / CABORCA',48,45);drawImage(ctx,images.get(sources[0]),1090,22,62,62);
  ctx.fillStyle='#fff';ctx.font='700 36px Arial';titleLines.forEach((s,i)=>ctx.fillText(s,48,97+i*42));ctx.font='500 22px Arial';category.forEach((s,i)=>ctx.fillText(s,48,143+extraTitle+i*29));
  let y=start,x=48;ctx.fillStyle='#294d3f';ctx.fillRect(48,y,1104,headHeight);ctx.font='700 20px Arial';ctx.fillStyle='#e4edc7';headers.forEach((a,i)=>{a.forEach((s,k)=>ctx.fillText(s,x+10,y+28+k*26));x+=widths[i];});y+=headHeight;
  layout.forEach(({row,wrapped,height},index)=>{ctx.fillStyle=index%2?'#1c3730':'#172f29';ctx.fillRect(48,y,1104,height);x=48;ctx.font='500 22px Arial';wrapped.forEach((a,i)=>{drawImage(ctx,images.get(row.logos[i]),x+8,y+(height-44)/2,44,44);ctx.fillStyle='#fff';a.forEach((s,k)=>ctx.fillText(s,x+12+(row.logos[i]?52:0),y+(height-a.length*29)/2+23+k*29));x+=widths[i];});y+=height;});
  y+=34;ctx.font='400 18px Arial';ctx.fillStyle='#cedccc';notes.forEach(s=>{ctx.fillText(s,48,y);y+=25;});ctx.fillText('Actualizado: '+m.generated,48,y+16);
  const sponsorPaths=(m.sponsors||[]).filter(s=>s.logo).slice(0,6).map(s=>imageURL(s.logo));sponsorPaths.forEach((src,i)=>drawImage(ctx,images.get(src),48+i*140,y+39,116,55));ctx.fillStyle='#d9e79e';ctx.font='700 18px Arial';ctx.fillText('caborcavets.online',930,canvas.height-35);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('No se pudo generar la imagen. Intenta de nuevo desde Chrome.');return {blob,missing};
 }
 async function open(model,button){
  const previous=button.textContent;button.disabled=true;button.textContent='Preparando imagen…';
  try{const {blob,missing}=await poster(model);root.ArenaUI.shareImage({blob,name:filename(model)+'.png',title:model.title,alt:model.title+' · '+model.category+' · '+model.season,page:model.page||location.href,trigger:button,statusText:missing?'Algún logo no pudo cargarse. Los datos están completos.':''});}
  catch(e){const note=document.createElement('p');note.setAttribute('role','alert');note.textContent=e.message;button.parentElement.append(note);}
  finally{button.disabled=false;button.textContent=previous;}
 }
 function mount(meta){
  const host=document.getElementById('contenido'),table=host?.querySelector('.standing-table');if(!table?.querySelector('tbody tr'))return;
  const bar=document.createElement('div');bar.className='game-actions no-print';const button=document.createElement('button');button.type='button';button.textContent='Descargar / compartir ↗';button.setAttribute('aria-label','Descargar / compartir '+meta.title);bar.append(button);table.closest('.table-scroll').before(bar);button.onclick=()=>{const page=new URL(location.href),cat=document.querySelector('.tab.is-active')?.dataset.cat,season=document.getElementById('temporada-select')?.value;if(cat)page.searchParams.set('categoria',cat);if(season)page.searchParams.set('temporada',season);open(snapshot(table,{...meta,page:page.href}),button);};
 }
 function mountJornada(host,models){
  if(!models.rol.rows.length)return;const group=document.createElement('div');group.className='jornada-downloads no-print';const label=document.createElement('span');label.textContent=models.rol.category+' · '+models.rol.season+' · '+models.kind;group.append(label);
  const actions=document.createElement('div');actions.className='game-actions';for(const [key,label] of [['rol','Descargar / compartir rol ↗'],['results','Descargar / compartir resultados ↗']]){if(!models[key].rows.length)continue;const button=document.createElement('button');button.type='button';button.textContent=label;button.setAttribute('aria-label',label+' · '+models.rol.category+' · '+models.rol.season);button.onclick=()=>open(models[key],button);actions.append(button);}group.append(actions);host.append(group);
 }
 root.LMBCDownloads={...api,mount,mountJornada,poster};
})(typeof window!=='undefined'?window:globalThis);
