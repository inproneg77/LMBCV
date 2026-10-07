(function(root){
 'use strict';
 function model(t,gid,featured=false){
  const g=t.games.find(x=>x.id===gid);if(!g||g.status!=='jugado'||g.bye)throw Error('Elige un partido con resultado.');
  const d=t.divisions.find(x=>x.id===g.divisionId);
  const sides=['home','away'].map(side=>{const e=t.entries.find(x=>x.id===g[side]),team=t.teams.find(x=>x.id===e.teamId);return {name:team.name,logo:team.logo,score:g[side+'Score'],entry:e,lines:g[side+'Stats']??[]};});
  let player=null;
  if(featured){if(g.forfeit!=='ninguno'||!g.mvp)throw Error('Este juego no tiene jugador destacado.');for(const side of sides){const line=side.lines.find(x=>x.playerId===g.mvp),p=side.entry.roster.find(x=>x.id===g.mvp);if(line&&p)player={name:p.name,number:p.number,photo:p.photo,team:side.name,points:line.points,threes:line.threes,fouls:line.fouls};}if(!player)throw Error('El destacado no tiene una captura vinculada.');}
  return {edition:t.name,logo:t.logo,category:d.name+' · '+d.branch,date:g.date,time:g.time,venue:t.venues.find(x=>x.id===g.venueId)?.name??'',forfeit:g.forfeit!=='ninguno',sides,player,id:t.id,division:d.id};
 }
 function fit(ctx,text,x,y,width,size,min=18){let n=size,s=String(text??'');ctx.font='800 '+n+'px Arial';while(ctx.measureText(s).width>width&&n>min){ctx.font='800 '+(--n)+'px Arial';}while(ctx.measureText(s).width>width&&s.length>1)s=s.slice(0,-2)+'…';ctx.fillText(s,x,y);}
 async function picture(path,resolve){if(!path)return null;return new Promise(done=>{const img=new Image();img.crossOrigin='anonymous';const timer=setTimeout(()=>{img.onload=img.onerror=null;done(null);},5000);img.onload=()=>{clearTimeout(timer);done(img);};img.onerror=()=>{clearTimeout(timer);done(null);};img.src=resolve(path);});}
 function draw(ctx,img,x,y,w,h=w,cover=false){if(!img)return;const ratio=(cover?Math.max:Math.min)(w/img.naturalWidth,h/img.naturalHeight);ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.drawImage(img,x+(w-img.naturalWidth*ratio)/2,y+(h-img.naturalHeight*ratio)/2,img.naturalWidth*ratio,img.naturalHeight*ratio);ctx.restore();}
 async function poster(m,resolve){
  const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1080;const ctx=canvas.getContext('2d');if(!ctx)throw Error('No se pudo preparar la imagen.');
  const [brand,a,b,photo]=await Promise.all([picture(m.logo,resolve),picture(m.sides[0].logo,resolve),picture(m.sides[1].logo,resolve),picture(m.player?.photo,resolve)]);
  ctx.fillStyle='#751b3c';ctx.fillRect(0,0,1080,1080);ctx.fillStyle='#f8e9a7';ctx.fillRect(0,0,1080,16);ctx.textAlign='left';fit(ctx,'CABORCA PIENSA EN GRANDE',58,78,850,29);draw(ctx,brand,948,35,78);
  ctx.fillStyle='#fff';fit(ctx,m.edition,58,135,960,31);ctx.fillStyle='#f8e9a7';fit(ctx,m.category,58,181,960,27);
  if(m.player){
   ctx.fillStyle='#fff';fit(ctx,'JUGADOR DESTACADO',58,254,960,52);
   ctx.fillStyle='#50112a';ctx.fillRect(58,290,450,530);
   if(photo)draw(ctx,photo,58,290,450,530,true);else{ctx.fillStyle='#f8e9a7';ctx.textAlign='center';fit(ctx,m.player.name.split(/\s+/).slice(0,2).map(x=>x[0]).join(''),283,610,390,150);}
   ctx.textAlign='left';ctx.fillStyle='#f8e9a7';fit(ctx,'★ MVP',550,370,470,64);ctx.fillStyle='#fff';
   const words=m.player.name.split(/\s+/),mid=Math.ceil(words.length/2);fit(ctx,words.slice(0,mid).join(' '),550,455,470,46);fit(ctx,words.slice(mid).join(' '),550,510,470,46);
   ctx.fillStyle='#f8e9a7';fit(ctx,m.player.team,550,565,470,27);fit(ctx,'#'+(m.player.number||'—'),550,608,470,26);
   ctx.fillStyle='#fff';fit(ctx,m.player.points+' PUNTOS',550,694,470,53);fit(ctx,m.player.threes+' TRIPLES',550,754,470,37);
   ctx.textAlign='center';fit(ctx,m.sides[0].name+' '+m.sides[0].score+' — '+m.sides[1].score+' '+m.sides[1].name,540,881,950,32);
  }else{
   ctx.fillStyle='#fff';fit(ctx,'RESULTADO FINAL',58,270,960,65);
   ctx.fillStyle='#fffdf8';ctx.fillRect(94,330,220,220);ctx.fillRect(766,330,220,220);draw(ctx,a,109,345,190);draw(ctx,b,781,345,190);
   ctx.textAlign='center';ctx.fillStyle='#f8e9a7';fit(ctx,m.sides[0].score+' — '+m.sides[1].score,540,655,950,150);
   ctx.fillStyle='#fff';fit(ctx,m.sides[0].name,275,752,450,39);fit(ctx,m.sides[1].name,805,752,450,39);ctx.fillStyle='#f8e9a7';fit(ctx,m.forfeit?'FORFEIT':'ASÍ SE VIVIÓ EN LA CANCHA',540,840,950,27);
  }
  ctx.textAlign='center';ctx.fillStyle='#fff';fit(ctx,[m.date,m.time,m.venue].filter(Boolean).join(' · '),540,953,960,25);ctx.fillStyle='#f8e9a7';fit(ctx,'caborcavets.online/piensa',540,1024,950,27);
  return new Promise((ok,no)=>canvas.toBlob(b=>b?ok(b):no(Error('No se pudo generar la imagen.')),'image/png'));
 }
 async function show(t,gid,featured,resolve){
  const m=model(t,gid,featured),blob=await poster(m,resolve),name=featured?'copa-jugador-destacado.png':'copa-resultado.png',file=new File([blob],name,{type:'image/png'}),url=URL.createObjectURL(blob);
  const dlg=document.createElement('dialog');dlg.className='copa-share';dlg.innerHTML='<h2></h2><img class="share-preview" alt="Tarjeta para compartir"><div class="tor-actions"><a class="tor-link" download>Descargar imagen</a><button type="button" data-share>Compartir imagen</button><button type="button" data-close class="secondary">Cerrar</button></div><p role="status"></p>';
  dlg.querySelector('h2').textContent=featured?'Jugador destacado':'Resultado final';dlg.querySelector('img').src=url;const a=dlg.querySelector('a');a.href=url;a.download=name;const share=dlg.querySelector('[data-share]');share.hidden=!(navigator.canShare?.({files:[file]})&&navigator.share);
  share.onclick=async()=>{try{await navigator.share({files:[file],title:m.edition});}catch(e){if(e.name!=='AbortError')dlg.querySelector('[role=status]').textContent='Descarga la imagen y compártela desde tu aplicación.';}};
  dlg.querySelector('[data-close]').onclick=()=>dlg.close();dlg.addEventListener('close',()=>{URL.revokeObjectURL(url);dlg.remove();},{once:true});document.body.append(dlg);dlg.showModal();
 }
 const api={model,poster,show};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CopaShare=api;
})(typeof window!=='undefined'?window:this);
