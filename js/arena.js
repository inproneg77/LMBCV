(function(){
 'use strict';
 const base=new URL('../',document.currentScript.src),url=p=>new URL(p,base).href;
 const H=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const payloads=new Map();
 function gameActions(g,state){
  if(g.estatus!=='jugado')return '';
  const model=ArenaCore.gameModel(g,state),key=JSON.stringify([g.categoria_id,g.temporada,g.id]);
  payloads.set(key,model);
  return '<div class="game-actions no-print"><button type="button" data-arena-share="'+H(key)+'">Compartir resultado ↗</button>'+(model.mvp?'<button type="button" data-arena-share="'+H(key)+'" data-arena-mvp>★ Compartir destacado</button>':'')+'</div>';
 }
 function switches(){return '<div class="profile-switch no-print" role="group" aria-label="Estadísticas del perfil"><button type="button" data-profile-show="oficial" aria-pressed="true" aria-controls="profile-oficial">Liga · oficiales</button><button type="button" data-profile-show="amistosos" aria-pressed="false" aria-controls="profile-amistosos">Amistosos</button></div>';}
 function fit(ctx,text,x,y,max,size,min=20){
  const s=String(text??'');let n=size;ctx.font='700 '+n+'px Arial';
  while(ctx.measureText(s).width>max&&n>min){n--;ctx.font='700 '+n+'px Arial';}
  if(ctx.measureText(s).width<=max)ctx.fillText(s,x,y);else{
   const chars=Array.from(s);while(chars.length&&ctx.measureText(chars.join('')+'…').width>max)chars.pop();ctx.fillText(chars.join('')+'…',x,y);
  }
 }
 async function logo(path){if(!path)return null;const target=new URL(path,base);if(target.origin!==base.origin)return null;
  return new Promise(resolve=>{const img=new Image();let timer=setTimeout(()=>{img.onload=img.onerror=null;resolve(null);},4000);img.onload=()=>{clearTimeout(timer);resolve(img);};img.onerror=()=>{clearTimeout(timer);resolve(null);};img.src=target.href;});
 }
 function drawLogo(ctx,img,x,y,w){if(!img)return;const scale=Math.min(w/img.naturalWidth,w/img.naturalHeight);ctx.drawImage(img,x+(w-img.naturalWidth*scale)/2,y+(w-img.naturalHeight*scale)/2,img.naturalWidth*scale,img.naturalHeight*scale);}
 async function poster(m,mvp){
  const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1080;const ctx=canvas.getContext('2d');if(!ctx)throw Error('Tu navegador no pudo generar la imagen.');
  const [a,b,...sponsors]=await Promise.all([logo(m.localLogo),logo(m.visitorLogo),...m.sponsors.map(s=>logo(s.logo))]);
  ctx.fillStyle='#122825';ctx.fillRect(0,0,1080,1080);ctx.strokeStyle='#345145';ctx.lineWidth=2;ctx.beginPath();ctx.arc(1060,40,400,0,Math.PI*2);ctx.stroke();
  ctx.textAlign='left';ctx.fillStyle='#d6ee96';fit(ctx,'LMBC / CABORCA',64,85,952,28);
  ctx.fillStyle='white';fit(ctx,mvp?'JUGADOR DESTACADO':'RESULTADO FINAL',64,159,952,55);
  ctx.fillStyle='#c4d4c7';fit(ctx,m.category+' · '+m.season,64,209,952,24);
  ctx.fillStyle='#d6ee96';fit(ctx,m.kind+(m.forfeit?' · FORFEIT':''),64,253,952,22);
  ctx.fillStyle='#fff';ctx.fillRect(112,300,150,150);ctx.fillRect(818,300,150,150);drawLogo(ctx,a,122,310,130);drawLogo(ctx,b,828,310,130);
  ctx.textAlign='center';ctx.fillStyle='#fff';fit(ctx,String(m.localScore)+' — '+String(m.visitorScore),540,415,520,108,60);
  fit(ctx,m.local,270,510,420,32);fit(ctx,m.visitor,810,510,420,32);
  ctx.fillStyle='#29473d';ctx.fillRect(64,560,952,150);ctx.fillStyle='#d6ee96';
  fit(ctx,mvp?m.mvp:m.date+' · '+(m.time||''),540,620,850,mvp?44:32);
  ctx.fillStyle='#e1e9dd';fit(ctx,mvp?'Reconocimiento registrado en la hoja del juego':m.venue,540,666,850,24);
  if(mvp){ctx.fillStyle='#d6dfd8';fit(ctx,m.date+' · '+m.venue,540,763,950,24);}
  if(sponsors.some(Boolean)){
   ctx.fillStyle='#d6dfd8';fit(ctx,'CON EL APOYO DE',540,834,950,17);
   const start=540-(sponsors.length*130)/2;
   sponsors.forEach((img,i)=>{if(img){ctx.fillStyle='#fff';ctx.fillRect(start+i*130,858,112,90);drawLogo(ctx,img,start+i*130+16,863,80);}});
  }
  ctx.fillStyle='#d6ee96';fit(ctx,'caborcavets.online',540,1020,900,25);
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('No se pudo crear la imagen.')),'image/png'));
 }
 async function share(button){
  const m=payloads.get(button.dataset.arenaShare);if(!m)return;
  const isMvp=button.hasAttribute('data-arena-mvp'),previous=button.textContent;button.disabled=true;button.textContent='Preparando imagen…';
  let dlg,objectURL;
  try{
   const blob=await poster(m,isMvp),file=new File([blob],isMvp?'lmbc-destacado.png':'lmbc-resultado.png',{type:'image/png'});
   objectURL=URL.createObjectURL(blob);
   dlg=document.createElement('dialog');dlg.className='arena-share-dialog';dlg.setAttribute('aria-labelledby','arena-share-title');
   const page=url('calendario/?'+m.query);
   dlg.innerHTML='<div class="dialog-head"><h2 id="arena-share-title">'+(isMvp?'Jugador destacado':'Resultado para compartir')+'</h2><button type="button" class="icon-button" data-dismiss aria-label="Cerrar">✕</button></div><img alt="Tarjeta del resultado '+H(m.local)+' contra '+H(m.visitor)+'" src="'+objectURL+'"><p>Descarga la imagen para WhatsApp o Facebook. Tú decides dónde publicarla.</p><div class="share-actions"><a class="primary-link" download="'+file.name+'" href="'+objectURL+'">Descargar imagen</a><button type="button" class="secondary-link" data-native>Compartir imagen</button><button type="button" class="secondary-link" data-copy>Copiar enlace</button></div><p data-status role="status"></p>';
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
 window.ArenaUI={gameActions,switches};
})();
