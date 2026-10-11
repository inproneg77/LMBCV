(function(){
 'use strict';
 const base=new URL('../',document.currentScript.src),url=p=>new URL(p,base).href;
 const H=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const payloads=new Map();
 function gameActions(g,state){
  if(!['jugado','programado'].includes(g.estatus))return '';
  const model=ArenaCore.gameModel(g,state),key=JSON.stringify([g.categoria_id,g.temporada,g.id]);
  payloads.set(key,model);
  return '<div class="game-actions no-print"><button type="button" data-arena-share="'+H(key)+'">'+(model.played?'Compartir resultado ↗':'Descargar / compartir cartel ↗')+'</button>'+(model.played&&model.mvp?'<button type="button" data-arena-share="'+H(key)+'" data-arena-mvp>★ Compartir destacado</button>':'')+'</div>';
 }
 function switches(){return '<div class="profile-switch no-print" role="group" aria-label="Estadísticas del perfil"><button type="button" data-profile-show="oficial" aria-pressed="true" aria-controls="profile-oficial">Liga · oficiales</button><button type="button" data-profile-show="amistosos" aria-pressed="false" aria-controls="profile-amistosos">Amistosos</button></div>';}
 function fit(ctx,text,x,y,max,size,min=20){
  const s=String(text??'');let n=size;ctx.font='700 '+n+'px Arial';
  while(ctx.measureText(s).width>max&&n>min){n--;ctx.font='700 '+n+'px Arial';}
  if(ctx.measureText(s).width<=max)ctx.fillText(s,x,y);else{
   const chars=Array.from(s);while(chars.length&&ctx.measureText(chars.join('')+'…').width>max)chars.pop();ctx.fillText(chars.join('')+'…',x,y);
  }
 }
 // Legacy opaque logos sometimes include a flat white outer background.
 // Remove only white pixels connected to the edges, in the export copy.
 // Enclosed white details, photos and source files stay intact. A rectangular
 // white border is required; white details in shaped transparent logos stay.
 function exportLogo(img){
  try{
   const canvas=document.createElement('canvas'),scale=Math.min(1,1024/Math.max(img.naturalWidth,img.naturalHeight));canvas.width=Math.round(img.naturalWidth*scale);canvas.height=Math.round(img.naturalHeight*scale);
   const c=canvas.getContext('2d');if(!c?.getImageData)return img;c.drawImage(img,0,0,canvas.width,canvas.height);
   const image=c.getImageData(0,0,canvas.width,canvas.height),d=image.data,w=canvas.width,h=canvas.height,n=w*h,white=i=>d[i*4]>242&&d[i*4+1]>242&&d[i*4+2]>242;
   let x0=w,y0=h,x1=-1,y1=-1;for(let i=0;i<n;i++)if(d[i*4+3]>16){x0=Math.min(x0,i%w);x1=Math.max(x1,i%w);y0=Math.min(y0,Math.floor(i/w));y1=Math.max(y1,Math.floor(i/w));}if(x1<x0)return img;
   let edges=0,total=0;for(let x=x0;x<=x1;x++){edges+=Number(white(y0*w+x))+Number(white(y1*w+x));total+=2;}for(let y=y0+1;y<y1;y++){edges+=Number(white(y*w+x0))+Number(white(y*w+x1));total+=2;}
   if(!total||edges/total<0.9)return img;
   const seen=new Uint8Array(n),queue=new Uint32Array(n);let head=0,tail=0;
   const add=i=>{if(i>=0&&i<n&&!seen[i]&&(d[i*4+3]<16||white(i))){seen[i]=1;queue[tail++]=i;}};
   for(let x=0;x<w;x++){add(x);add((h-1)*w+x);}for(let y=0;y<h;y++){add(y*w);add(y*w+w-1);}for(let x=x0;x<=x1;x++){add(y0*w+x);add(y1*w+x);}for(let y=y0;y<=y1;y++){add(y*w+x0);add(y*w+x1);}
   while(head<tail){const i=queue[head++];d[i*4+3]=0;if(i%w)add(i-1);if(i%w<w-1)add(i+1);add(i-w);add(i+w);}
   let left=w,top=h,right=-1,bottom=-1;for(let i=0;i<n;i++)if(d[i*4+3]){left=Math.min(left,i%w);right=Math.max(right,i%w);top=Math.min(top,Math.floor(i/w));bottom=Math.max(bottom,Math.floor(i/w));}
   if(right<left)return img;c.putImageData(image,0,0);const trimmed=document.createElement('canvas'),pad=Math.max(2,Math.round(Math.max(right-left,bottom-top)*0.04));trimmed.width=right-left+1+pad*2;trimmed.height=bottom-top+1+pad*2;trimmed.getContext('2d').drawImage(canvas,left,top,right-left+1,bottom-top+1,pad,pad,right-left+1,bottom-top+1);return trimmed;
  }catch{return img;}
 }
 async function logo(path,clean=true){if(!path)return null;const target=new URL(path,base);if(target.origin!==base.origin)return null;
  return new Promise(resolve=>{const img=new Image();let timer=setTimeout(()=>{img.onload=img.onerror=null;resolve(null);},4000);img.onload=()=>{clearTimeout(timer);resolve(clean?exportLogo(img):img);};img.onerror=()=>{clearTimeout(timer);resolve(null);};img.src=target.href;});
 }
 function drawLogo(ctx,img,x,y,w){if(!img)return;const width=img.naturalWidth||img.width,height=img.naturalHeight||img.height,scale=Math.min(w/width,w/height);ctx.drawImage(img,x+(w-width*scale)/2,y+(w-height*scale)/2,width*scale,height*scale);}
 async function poster(m,mvp){
  const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1080;const ctx=canvas.getContext('2d');if(!ctx)throw Error('Tu navegador no pudo generar la imagen.');
  const [a,b,photo,...sponsors]=await Promise.all([logo(m.localLogo),logo(m.visitorLogo),mvp?logo(m.mvpPhoto,false):null,...m.sponsors.map(s=>logo(s.logo))]);
  ctx.fillStyle='#122825';ctx.fillRect(0,0,1080,1080);ctx.strokeStyle='#345145';ctx.lineWidth=2;ctx.beginPath();ctx.arc(1060,40,400,0,Math.PI*2);ctx.stroke();
  ctx.textAlign='left';ctx.fillStyle='#d6ee96';fit(ctx,'LMBC / CABORCA',64,85,952,28);
  ctx.fillStyle='white';fit(ctx,mvp?'MVP DEL PARTIDO':m.played?'RESULTADO FINAL':'PRÓXIMO ENCUENTRO',64,159,952,55);
  ctx.fillStyle='#c4d4c7';fit(ctx,m.category+' · '+m.season,64,209,952,24);
  ctx.fillStyle='#d6ee96';fit(ctx,m.kind+(m.forfeit?' · FORFEIT':''),64,253,952,22);
  // Draw original alpha directly onto the poster; no white backing plates.
  drawLogo(ctx,a,112,300,150);drawLogo(ctx,b,818,300,150);
  ctx.textAlign='center';ctx.fillStyle='#fff';fit(ctx,m.played?String(m.localScore)+' — '+String(m.visitorScore):'VS',540,415,520,108,60);
  fit(ctx,m.local,270,510,420,32);fit(ctx,m.visitor,810,510,420,32);
  ctx.fillStyle='#29473d';ctx.fillRect(64,560,952,mvp?240:150);ctx.fillStyle='#d6ee96';
  if(mvp&&photo){const size=180;ctx.save();ctx.beginPath();ctx.roundRect(82,582,size,size,24);ctx.clip();drawLogo(ctx,photo,82,582,size);ctx.restore();}
  fit(ctx,mvp?m.mvp:m.date+' · '+(m.time||''),mvp&&photo?640:540,620,mvp&&photo?650:850,mvp?44:32);
  if(mvp&&m.mvpLine){ctx.fillStyle='#fff';fit(ctx,(Number(m.mvpLine.puntos)||0)+' PUNTOS  ·  '+(Number(m.mvpLine.triples)||0)+' TRIPLES',photo?640:540,686,photo?650:850,29);}
  if(!mvp){ctx.fillStyle='#e1e9dd';fit(ctx,m.venue,540,666,850,24);}
  if(mvp){ctx.fillStyle='#d6dfd8';fit(ctx,m.date+' · '+m.venue,photo?640:540,748,photo?650:850,22);}
  if(sponsors.some(Boolean)){
   ctx.fillStyle='#d6dfd8';fit(ctx,'CON EL APOYO DE',540,834,950,17);
   const present=sponsors.filter(Boolean),gap=Math.min(150,952/present.length),size=Math.min(100,gap-18),start=540-present.length*gap/2;
   present.forEach((img,i)=>drawLogo(ctx,img,start+i*gap+(gap-size)/2,858,size));
  }
  ctx.fillStyle='#d6ee96';fit(ctx,'caborcavets.online',540,1020,900,25);
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('No se pudo crear la imagen.')),'image/png'));
 }
 async function share(button){
  const m=payloads.get(button.dataset.arenaShare);if(!m)return;
  const isMvp=button.hasAttribute('data-arena-mvp'),previous=button.textContent;button.disabled=true;button.textContent='Preparando imagen…';
  let dlg,objectURL;
  try{
   const blob=await poster(m,isMvp),file=new File([blob],isMvp?'lmbc-destacado.png':m.played?'lmbc-resultado.png':'lmbc-proximo-partido.png',{type:'image/png'});
   objectURL=URL.createObjectURL(blob);
   dlg=document.createElement('dialog');dlg.className='arena-share-dialog';dlg.setAttribute('aria-labelledby','arena-share-title');
   const page=url('calendario/?'+m.query);
   dlg.innerHTML='<div class="dialog-head"><h2 id="arena-share-title">'+(isMvp?'MVP del partido':m.played?'Resultado para compartir':'Cartel del próximo encuentro')+'</h2><button type="button" class="icon-button" data-dismiss aria-label="Cerrar">✕</button></div><img alt="'+(isMvp?'MVP '+H(m.mvp):H(m.local)+' contra '+H(m.visitor))+'" src="'+objectURL+'"><p>Descarga la imagen para WhatsApp o Facebook. Tú decides dónde publicarla.</p><div class="share-actions"><a class="primary-link" download="'+file.name+'" href="'+objectURL+'">Descargar imagen</a><button type="button" class="secondary-link" data-native>Compartir imagen</button><button type="button" class="secondary-link" data-copy>Copiar enlace</button></div><p data-status role="status"></p>';
   document.body.append(dlg);dlg.showModal();dlg.querySelector('[data-dismiss]').onclick=()=>dlg.close();
   dlg.addEventListener('close',()=>{URL.revokeObjectURL(objectURL);dlg.remove();button.focus();},{once:true});
   const status=dlg.querySelector('[data-status]');
   dlg.querySelector('[data-native]').hidden=!(navigator.canShare&&navigator.canShare({files:[file]})&&navigator.share);
   dlg.querySelector('[data-native]').onclick=async()=>{try{await navigator.share({files:[file],title:'LMBC · '+m.local+' vs '+m.visitor});}catch(e){if(e.name!=='AbortError')status.textContent='Usa Descargar imagen para compartirla desde tu aplicación.';}};
   dlg.querySelector('[data-copy]').onclick=async()=>{try{await navigator.clipboard.writeText(page);status.textContent='Enlace copiado.';}catch{status.textContent=page;}};
  }catch(e){if(objectURL)URL.revokeObjectURL(objectURL);const note=document.createElement('p');note.setAttribute('role','alert');note.textContent=e.message;button.parentElement.append(note);}
  finally{button.disabled=false;button.textContent=previous;}
 }
 document.addEventListener('click',e=>{
  const tab=e.target.closest('[data-profile-show]');
  if(tab){const root=tab.closest('[data-profile-root]');if(!root)return;root.querySelectorAll('[data-profile-panel]').forEach(el=>el.hidden=el.dataset.profilePanel!==tab.dataset.profileShow);root.querySelectorAll('[data-profile-show]').forEach(el=>el.setAttribute('aria-pressed',String(el===tab)));}
  const button=e.target.closest('[data-arena-share]');if(button){e.preventDefault();share(button);}
 });
 window.ArenaUI={gameActions,switches,poster,logoForExport:exportLogo};
})();

