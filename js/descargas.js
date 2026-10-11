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
  const canvas=document.createElement('canvas');canvas.width=1200;const ctx=canvas.getContext('2d');if(!ctx)throw Error('Este navegador no permite generar la imagen. Usa CSV o PDF.');
  const n=m.headers.length,weights=m.headers.map((h,i)=>i===0?.6:/equipo|jugador|valioso/i.test(h)?3.6:/detalle/i.test(h)?3:1.2),sum=weights.reduce((a,b)=>a+b,0),widths=weights.map(w=>w/sum*1104);
  ctx.font='500 22px Arial';const layout=m.rows.map(r=>{const wrapped=r.cells.map((c,i)=>lines(ctx,c,widths[i]-24-(r.logos[i]?52:0)));return {row:r,wrapped,height:Math.max(66,...wrapped.map(a=>a.length*29+24))};});
  ctx.font='700 20px Arial';const headers=m.headers.map((h,i)=>lines(ctx,h,widths[i]-18));const headHeight=Math.max(64,...headers.map(a=>a.length*26+24));
  ctx.font='700 36px Arial';const titleLines=lines(ctx,m.title,990),extraTitle=(titleLines.length-1)*42;
  ctx.font='500 22px Arial';const category=lines(ctx,m.category+' · '+m.season,1000);const start=160+extraTitle+category.length*29;
  ctx.font='400 18px Arial';const notes=lines(ctx,m.note||'',1104),height=start+headHeight+layout.reduce((a,r)=>a+r.height,0)+notes.length*25+190;
  if(height>16000)throw Error('La tabla es demasiado larga para una sola imagen. Descarga el CSV o guarda el PDF completo.');canvas.height=height;
  const sources=[imageURL('img/equipos/logovets.png'),...m.rows.flatMap(r=>r.logos).filter(Boolean),...(m.sponsors||[]).filter(s=>s.logo).slice(0,6).map(s=>imageURL(s.logo))];
  const loaded=await Promise.all([...new Set(sources)].map(async src=>[src,await image(src)])),images=new Map(loaded);const missing=loaded.filter(([,img])=>!img).length;
  ctx.fillStyle='#122825';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#d9e79e';ctx.font='700 22px Arial';ctx.fillText('LMBC / CABORCA',48,45);drawImage(ctx,images.get(sources[0]),1090,22,62,62);
  ctx.fillStyle='#fff';ctx.font='700 36px Arial';titleLines.forEach((s,i)=>ctx.fillText(s,48,97+i*42));ctx.font='500 22px Arial';category.forEach((s,i)=>ctx.fillText(s,48,143+extraTitle+i*29));
  let y=start,x=48;ctx.fillStyle='#294d3f';ctx.fillRect(48,y,1104,headHeight);ctx.font='700 20px Arial';ctx.fillStyle='#e4edc7';headers.forEach((a,i)=>{a.forEach((s,k)=>ctx.fillText(s,x+10,y+28+k*26));x+=widths[i];});y+=headHeight;
  layout.forEach(({row,wrapped,height},index)=>{ctx.fillStyle=index%2?'#1c3730':'#172f29';ctx.fillRect(48,y,1104,height);x=48;ctx.font='500 22px Arial';wrapped.forEach((a,i)=>{drawImage(ctx,images.get(row.logos[i]),x+8,y+(height-44)/2,44,44);ctx.fillStyle='#fff';a.forEach((s,k)=>ctx.fillText(s,x+12+(row.logos[i]?52:0),y+(height-a.length*29)/2+23+k*29));x+=widths[i];});y+=height;});
  y+=34;ctx.font='400 18px Arial';ctx.fillStyle='#cedccc';notes.forEach(s=>{ctx.fillText(s,48,y);y+=25;});ctx.fillText('Actualizado: '+m.generated,48,y+16);
  const sponsorPaths=(m.sponsors||[]).filter(s=>s.logo).slice(0,6).map(s=>imageURL(s.logo));sponsorPaths.forEach((src,i)=>drawImage(ctx,images.get(src),48+i*140,y+39,116,55));ctx.fillStyle='#d9e79e';ctx.font='700 18px Arial';ctx.fillText('caborcavets.online',930,canvas.height-35);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('No se pudo generar la imagen. Usa CSV o PDF.');return {blob,missing};
 }
 function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
 async function print(m){
  const frame=document.createElement('iframe');frame.title='Documento para imprimir';frame.className='lmbc-print-frame';document.body.append(frame);
  try{await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('No se pudo preparar el PDF. Intenta de nuevo.')),6000);frame.onload=async()=>{await Promise.all(Array.from(frame.contentDocument.images,img=>img.complete?Promise.resolve():new Promise(done=>{img.onload=img.onerror=done;setTimeout(done,3500);})));clearTimeout(timer);resolve();};frame.srcdoc=printHTML(m);});frame.contentWindow.focus();frame.contentWindow.print();setTimeout(()=>frame.remove(),60000);}catch(e){frame.remove();throw e;}
 }
 async function preview(m){
  const {blob,missing}=await poster(m),url=URL.createObjectURL(blob),file=new File([blob],filename(m)+'.png',{type:'image/png'}),dlg=document.createElement('dialog');dlg.className='lmbc-download-dialog';dlg.setAttribute('aria-label','Descargar '+m.title);
  dlg.innerHTML='<div class="lmbc-download-head"><h2>'+H(m.title)+'</h2><button type="button" data-close aria-label="Cerrar">✕</button></div><div class="lmbc-download-preview"><img alt="Vista previa de '+H(m.title)+'" src="'+url+'"></div><div class="lmbc-download-actions"><a download="'+H(file.name)+'" href="'+url+'">Descargar imagen</a><button type="button" data-share>Compartir imagen</button></div><p role="status">'+(missing?'Algún logo no pudo cargarse. La tabla y sus datos están completos.':'La imagen incluye la categoría y temporada seleccionadas.')+'</p>';
  document.body.append(dlg);dlg.showModal();dlg.querySelector('[data-close]').onclick=()=>dlg.close();dlg.addEventListener('close',()=>{URL.revokeObjectURL(url);dlg.remove();},{once:true});const share=dlg.querySelector('[data-share]');share.hidden=!navigator.canShare?.({files:[file]});share.onclick=async()=>{try{await navigator.share({files:[file],title:'LMBC · '+m.title});}catch(e){if(e.name!=='AbortError')dlg.querySelector('[role=status]').textContent='Descarga la imagen para compartirla desde tu aplicación.';}};
 }
 function mount(meta){
  const host=document.getElementById('contenido'),table=host?.querySelector('.standing-table');if(!table?.querySelector('tbody tr'))return;
  const bar=document.createElement('section');bar.className='lmbc-downloads no-print';bar.setAttribute('aria-label','Descargas de '+meta.title);bar.innerHTML='<div class="lmbc-download-actions"><button type="button" data-format="png">Descargar imagen</button><button type="button" data-format="csv">Descargar CSV</button><button type="button" data-format="pdf">Imprimir / Guardar PDF</button></div><p role="status">Descarga la tabla de la categoría y temporada seleccionadas.</p>';
  table.closest('.table-scroll').before(bar);let busy=false;bar.addEventListener('click',async event=>{const button=event.target.closest('[data-format]');if(!button||busy)return;busy=true;const model=snapshot(table,meta),status=bar.querySelector('[role=status]');bar.querySelectorAll('button').forEach(b=>b.disabled=true);status.textContent='Preparando descarga…';try{if(button.dataset.format==='csv'){download(new Blob([csv(model)],{type:'text/csv;charset=utf-8'}),filename(model)+'.csv');status.textContent='CSV preparado con '+model.rows.length+' filas.';}else if(button.dataset.format==='pdf'){await print(model);status.textContent='Elige «Guardar como PDF» en el diálogo de impresión.';}else{await preview(model);status.textContent='Imagen lista para descargar o compartir.';}}catch(e){status.textContent=e.message||'No se pudo preparar la descarga. Intenta otro formato.';}finally{busy=false;bar.querySelectorAll('button').forEach(b=>b.disabled=false);}});
 }
 root.LMBCDownloads={...api,mount,poster};
})(typeof window!=='undefined'?window:globalThis);
