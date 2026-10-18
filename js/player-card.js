(function(root){
 'use strict';
 const W=1080,H=1512,base=typeof document!=='undefined'?new URL('../',document.currentScript.src):null;
 const text=v=>String(v??''),esc=v=>text(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const number=v=>Number.isFinite(Number(v))?Number(v):0;
 function profileModel({player,team,category,season,group,kind='oficial',page}){
  const t=group.totales||{jj:0,puntos:0,triples:0},jj=number(t.jj);
  return {type:'season',id:player.id,name:player.nombre||'Jugador',photo:player.foto_original||player.foto||'',fallbackPhoto:player.foto||'',number:player.numero??'',position:player.posicion||'',
   team:team?.nombre||'',teamLogo:team?.logo||'',category:category?.nombre||group.categoriaId,branch:category?.rama||'',season:season?.nombre||group.temporadaId,
   categoryId:group.categoriaId,seasonId:group.temporadaId,teamId:group.equipoId,kind:kind==='amistosos'?'Amistosos':'Liga',page,totals:{jj,puntos:number(t.puntos),triples:number(t.triples),faltas:number(t.faltas)},
   stats:[{label:'JUEGOS',value:jj},{label:'PUNTOS',value:jj?number(t.puntos):'—'},{label:'PTS / JUEGO',value:jj?(number(t.puntos)/jj).toFixed(1):'—'},{label:'TRIPLES',value:jj?number(t.triples):'—'}]};
 }
 function careerModel({player,rows,kind='oficial',totals,mvp,page,sponsors=[]}){
  const t=totals||rows.reduce((a,r)=>({jj:a.jj+number(r.totals.jj),puntos:a.puntos+number(r.totals.puntos),triples:a.triples+number(r.totals.triples),faltas:a.faltas+number(r.totals.faltas)}),{jj:0,puntos:0,triples:0,faltas:0});
  const model=profileModel({player,team:{nombre:'',logo:'img/equipos/logovets.png'},category:{nombre:'Todas sus categorías'},season:{nombre:'Histórico'},group:{categoriaId:'todas',temporadaId:'historial',equipoId:'todos',totales:t},kind,page});
  const teams=new Set(rows.map(r=>r.teamId)).size,categories=new Set(rows.map(r=>r.categoryId)).size,seasons=new Map();for(const row of rows){const current=seasons.get(row.seasonId)||{id:row.seasonId,name:row.season,puntos:0,jj:0};current.puntos+=number(row.totals.puntos);current.jj+=number(row.totals.jj);seasons.set(row.seasonId,current);}
  return {...model,type:'career',teamLogo:teams===1?(rows[0]?.teamLogo||model.teamLogo):model.teamLogo,team:(teams===1?rows[0].team:teams+' equipos')+' · '+categories+' '+(categories===1?'categoría':'categorías'),historyRows:rows.map(r=>({...r,totals:{...r.totals}})),seasonTotals:[...seasons.values()].sort((a,b)=>String(a.id).localeCompare(String(b.id))),careerMvp:mvp!==undefined&&mvp!==null&&Number.isFinite(Number(mvp))?Number(mvp):null,sponsors};
 }
 function historyCards(model){
  const rows=model.historyRows||[],count=Math.ceil(rows.length/6);
  return Array.from({length:count},(_,i)=>{
   const page=new URL(model.page);page.searchParams.set('lado','reverso');page.searchParams.set('pagina',i+1);
   return {...model,type:'career-back',historyRows:rows.slice(i*6,(i+1)*6),pageNumber:i+1,pageCount:count,historyCount:rows.length,page:page.href};
  });
 }
 function mvpModel(m){
  const line=m.mvpLine,hasLine=!!line;
  return {type:'mvp',gameId:m.id,id:m.mvpId||m.id,name:m.mvp||'Jugador',photo:m.mvpPhoto||'',fallbackPhoto:m.mvpPhotoFallback||'',number:m.mvpNumber??'',position:m.mvpPosition||'',
   team:m.mvpTeam||'',teamLogo:m.mvpTeamLogo||'',category:m.category,branch:m.branch||'',season:m.season,categoryId:m.categoryId,seasonId:m.seasonId,teamId:m.mvpTeamId||'',kind:m.kind,
   match:m.local+' '+m.localScore+' – '+m.visitorScore+' '+m.visitor,date:m.date,venue:m.venue,sponsors:m.sponsors||[],page:m.page,
   stats:[{label:'PUNTOS',value:hasLine?number(line.puntos):'—'},{label:'TRIPLES',value:hasLine?number(line.triples):'—'},{label:'FALTAS',value:hasLine?number(line.faltas):'—'}]};
 }
 // Complete names wrap and shrink within their region; no characters are discarded.
 function layout(value,width,size,maxLines=2,measure){
  const s=text(value).trim(),widthOf=(v,n)=>measure?measure(v,n):Array.from(v).reduce((a,c)=>a+(/[MWÁÉÓ]/.test(c)?.82:/[ilI.,' ]/.test(c)?.28:.56)*n,0);
  function wrap(n){const out=[];let line='';for(const word of s.split(/\s+/)){if(widthOf(word,n)>width){if(line){out.push(line);line='';}for(const c of word){if(line&&widthOf(line+c,n)>width){out.push(line);line='';}line+=c;}}else if(line&&widthOf(line+' '+word,n)>width){out.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)out.push(line);return out;}
  let font=size,lines=wrap(font);while(lines.length>maxLines&&font>10){font--;lines=wrap(font);}return {font,lines};
 }
 function svg(m,assets={},measure){
  if(m.type==='career-back')return historySvg(m,assets,measure);
  const gold='#c8a76a',ink='#20262e',muted='#e8dfcd',isMvp=m.type==='mvp';
  const txt=(s,x,y,size=24,fill=ink,extra='')=>'<text x="'+x+'" y="'+y+'" font-size="'+size+'" fill="'+fill+'" '+extra+'>'+esc(s)+'</text>';
  const block=(s,x,y,width,size,maxLines=2,fill=ink,extra='')=>{const a=layout(s,width,size,maxLines,measure);return '<text x="'+x+'" y="'+y+'" font-size="'+a.font+'" fill="'+fill+'" '+extra+'>'+a.lines.map((v,i)=>'<tspan x="'+x+'" dy="'+(i?a.font*1.15:0)+'">'+esc(v)+'</tspan>').join('')+'</text>';};
  const image=(src,x,y,w,h,align='xMidYMid meet')=>/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=\s]+$/.test(src||'')?'<image href="'+src+'" x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" preserveAspectRatio="'+align+'"/>':'';
  const initials=text(m.name).trim().split(/\s+/).slice(0,2).map(n=>n[0]).join('').toUpperCase();
  const branch=m.branch&&!text(m.category).toLowerCase().includes(text(m.branch).toLowerCase())?' · '+m.branch:'';
  const season=text(m.season).replace(/^Temporada\s*/i,'');
  let out='<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1512" viewBox="0 0 1080 1512"><defs>';
  out+='<linearGradient id="metal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#e8ddbd"/><stop offset=".19" stop-color="#8b7450"/><stop offset=".35" stop-color="#fffdf1"/><stop offset=".52" stop-color="'+(isMvp?'#d1aa5a':'#b5bbc0')+'"/><stop offset=".68" stop-color="#fffdf1"/><stop offset="1" stop-color="#8f754a"/></linearGradient>';
  out+='<linearGradient id="paper" x2="1" y2="1"><stop stop-color="#f4f0e5"/><stop offset="1" stop-color="#ded5bd"/></linearGradient><linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#101821" stop-opacity=".78"/><stop offset=".33" stop-color="#101821" stop-opacity="0"/><stop offset=".63" stop-color="#101821" stop-opacity="0"/><stop offset="1" stop-color="#101821" stop-opacity=".9"/></linearGradient><linearGradient id="band" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#26313b"/><stop offset="1" stop-color="#101921"/></linearGradient><pattern id="foil" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M-25 25L25-25M0 50L50 0M25 75L75 25" stroke="#fff" stroke-width="2" opacity=".22"/></pattern><clipPath id="frame"><rect x="54" y="54" width="972" height="1404" rx="18"/></clipPath><clipPath id="photo"><rect x="54" y="54" width="972" height="1232"/></clipPath></defs><g font-family="Arial, sans-serif">';
  out+='<rect width="1080" height="1512" rx="42" fill="#20262e"/><rect x="14" y="14" width="1052" height="1484" rx="34" fill="url(#metal)"/><rect x="14" y="14" width="1052" height="1484" rx="34" fill="url(#foil)"/><rect x="32" y="32" width="1016" height="1448" rx="25" fill="none" stroke="#fff7dc" stroke-width="2"/><rect x="46" y="46" width="988" height="1420" rx="23" fill="#121c26"/>';
  out+='<g clip-path="url(#frame)"><rect x="54" y="54" width="972" height="1404" fill="url(#paper)"/><g clip-path="url(#photo)"><path d="M-80 960L780 100L1180 500L320 1360Z" fill="#b69b69" opacity=".22"/><circle cx="540" cy="680" r="414" fill="none" stroke="#b59b69" stroke-width="3"/>';
  if(assets.photo)out+=image(assets.photo,54,54,972,1232,'xMidYMin slice');
  else out+=txt(initials,540,760,300,'#8f7b58','text-anchor="middle" font-weight="900" font-family="Impact, Arial Black, sans-serif"');
  out+='<rect x="54" y="54" width="972" height="1232" fill="url(#shade)"/></g>';
  out+='<path d="M54 54H1026V142H54Z" fill="#15202b" fill-opacity=".94"/><path d="M54 143H1026" stroke="'+gold+'" stroke-width="3"/>';
  out+=image(assets.league,79,69,62,62)+txt('LMBC VETERANOS',160,112,29,'#f6f0e4','font-weight="900" letter-spacing="3"');
  out+='<path d="M786 54H1026V142H754Z" fill="url(#metal)"/>'+block(season,902,111,208,30,1,ink,'text-anchor="middle" font-weight="900" font-style="italic"');
  out+=block(m.kind+' · '+m.category+branch,88,186,812,22,1,'#fff6e4','font-weight="700" letter-spacing="1"');
  out+='<path d="M846 213L1000 180V358L846 391Z" fill="#f5e8c9" fill-opacity=".12" stroke="'+gold+'" stroke-width="2"/>'+image(assets.team,856,219,130,130);
  if(m.number!==''&&m.number!==null)out+=txt('#'+m.number,977,477,104,'#fff8e5','text-anchor="end" font-family="Impact, Arial Black, sans-serif" font-weight="900" font-style="italic" stroke="#20262e" stroke-width="2" paint-order="stroke"');
  out+=txt(m.type==='career'?(m.kind==='Amistosos'?'TRAYECTORIA · AMISTOSOS':'TRAYECTORIA OFICIAL'+(m.careerMvp?' · '+m.careerMvp+' MVP':'')):'CABORCA · BÁSQUETBOL',88,930,16,'#f8edce','transform="rotate(-90 88 930)" font-weight="700" letter-spacing="4"');
  const lift=isMvp?80:0;out+='<path d="M54 '+(1070-lift)+'L1026 '+(950-lift)+'V1286H54Z" fill="url(#metal)"/><path d="M54 '+(1082-lift)+'L1026 '+(962-lift)+'V1286H54Z" fill="url(#band)"/><path d="M54 '+(1094-lift)+'L1026 '+(974-lift)+'" stroke="'+gold+'" stroke-opacity=".7" stroke-width="2"/>';
  let name=layout(text(m.name).trim().toUpperCase(),866,isMvp?84:92,1,measure);if(name.font<64)name=layout(text(m.name).trim().toUpperCase(),866,isMvp?56:64,2,measure);const nameY=isMvp?(name.lines.length===1?1134:1088):(name.lines.length===1?1190:1132);
  if(isMvp)out+=txt('★  MVP DEL PARTIDO',100,1029,18,gold,'font-weight="900" letter-spacing="3"');
  out+='<text x="96" y="'+nameY+'" font-size="'+name.font+'" fill="#fffaf0" font-family="Impact, Arial Black, Arial, sans-serif" font-style="italic" font-weight="900" letter-spacing=".6">'+name.lines.map((v,i)=>'<tspan x="96" dy="'+(i?name.font*1.15:0)+'">'+esc(v)+'</tspan>').join('')+'</text>';
  out+=block([m.team,m.position].filter(Boolean).join(' · '),100,isMvp?1192:1251,866,24,1,gold,'font-weight="700" letter-spacing="1"');
  if(isMvp){const date=text(m.date).replace(/^(\d{4})-(\d{2})-(\d{2})$/,(_,y,mo,d)=>Number(d)+' '+['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'][Number(mo)-1]+' '+y);out+=block(m.match,100,1228,866,21,1,'#fffaf0','font-weight="700"');out+=block([date,m.venue].filter(Boolean).join(' · '),100,1258,866,17,1,muted);}
  out+='<rect x="54" y="1286" width="972" height="134" fill="#f4efe3"/><path d="M54 1286H1026" stroke="'+gold+'" stroke-width="5"/>';
  const count=m.stats.length,cell=972/count;m.stats.forEach((s,i)=>{const x=54+cell*(i+.5);if(i)out+='<path d="M'+(54+cell*i)+' 1314v78" stroke="#cbbd9e"/>';out+=block(s.value,x,1359,cell-22,55,1,ink,'text-anchor="middle" font-family="Impact, Arial Black, sans-serif" font-weight="900"');out+=txt(s.label,x,1395,15,'#8b6c37','text-anchor="middle" font-weight="700" letter-spacing="1"');});
  out+='<rect x="54" y="1420" width="972" height="38" fill="#1b2631"/>';
  (assets.sponsors||[]).filter(Boolean).slice(0,3).forEach((src,i)=>{out+=image(src,85+i*92,1427,78,25);});
  out+=txt('caborcavets.online',996,1447,16,gold,'text-anchor="end" letter-spacing="2"');
  return out+'</g></g></svg>';
 }
 function historySvg(m,assets,measure){
  const escText=(s,x,y,size=22,fill='#20262e',extra='')=>{const v=layout(s,860,size,1,measure);return '<text x="'+x+'" y="'+y+'" fill="'+fill+'" font-size="'+v.font+'" '+extra+'>'+esc(v.lines.join(' '))+'</text>';};
  const image=(src,x,y,w,h)=>/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=\s]+$/.test(src||'')?'<image href="'+src+'" x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" preserveAspectRatio="xMidYMid meet"/>':'';
  let out='<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1512" viewBox="0 0 1080 1512"><defs><linearGradient id="metal" x2="1" y2="1"><stop stop-color="#bc9b60"/><stop offset=".3" stop-color="#fff9e7"/><stop offset=".6" stop-color="#aeb9c1"/><stop offset="1" stop-color="#d0b575"/></linearGradient><pattern id="foil" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M0 50L50 0" stroke="#fff" opacity=".22" stroke-width="2"/></pattern></defs><g font-family="Arial,sans-serif"><rect width="1080" height="1512" rx="42" fill="#20262e"/><rect x="14" y="14" width="1052" height="1484" rx="34" fill="url(#metal)"/><rect x="14" y="14" width="1052" height="1484" rx="34" fill="url(#foil)"/><rect x="38" y="38" width="1004" height="1436" rx="23" fill="#f5f1e8" stroke="#fff9e7" stroke-width="2"/><path d="M38 62Q38 38 62 38H1018Q1042 38 1042 62V147H38Z" fill="#17232e"/>';
  out+=image(assets.league,73,61,64,64)+escText('LMBC VETERANOS',157,108,29,'#fff7e8','font-weight="900" letter-spacing="3"');
  out+=escText(m.kind==='Amistosos'?'HISTORIAL DE AMISTOSOS':'TRAYECTORIA OFICIAL',77,197,24,'#95713a','font-weight="700" letter-spacing="2"');
  let name=layout(text(m.name).trim().toUpperCase(),916,62,1,measure);if(name.font<48)name=layout(text(m.name).trim().toUpperCase(),916,46,2,measure);out+='<text x="73" y="'+(name.lines.length===1?277:246)+'" fill="#20262e" font-family="Impact,Arial Black,sans-serif" font-size="'+name.font+'" font-weight="900">'+name.lines.map((v,i)=>'<tspan x="73" dy="'+(i?name.font*1.1:0)+'">'+esc(v)+'</tspan>').join('')+'</text>';
  out+=escText(m.team,77,344,24,'#676960');
  out+='<rect x="68" y="374" width="944" height="103" rx="12" fill="#202c37"/>';
  const summary=[m.stats[0],m.stats[1],m.stats[3],{label:m.kind==='Amistosos'?'FALTAS':'MVP',value:m.kind==='Amistosos'?m.totals.faltas:m.careerMvp??'—'}];
  summary.forEach((s,i)=>{out+=escText(s.value,186+i*236,431,42,'#fff9ed','text-anchor="middle" font-weight="900"');out+=escText(s.label,186+i*236,458,15,'#d1b575','text-anchor="middle" font-weight="700" letter-spacing="2"');});
  (m.historyRows||[]).forEach((r,i)=>{const y=500+i*132;out+='<path d="M77 '+(y+126)+'H1003" stroke="#d3c7ae"/>';out+=image(assets.historyTeams?.[i],82,y+13,76,76);const team=layout(r.team||'Equipo',808,27,1,measure);out+='<text x="178" y="'+(y+32)+'" font-size="'+team.font+'" fill="#20262e" font-weight="700">'+esc(team.lines.join(' '))+'</text>';out+=escText(r.category+' · '+r.season,178,y+59,19,'#79705f');
   const values=[['JJ',r.totals.jj],['PTS',r.totals.puntos],['3PT',r.totals.triples],['FALTAS',r.totals.faltas],['PTS/J',r.totals.jj?(r.totals.puntos/r.totals.jj).toFixed(1):'—']];values.forEach(([label,value],k)=>{out+=escText(label+'  '+value,90+k*184,y+105,19,'#20262e','font-weight="700"');});
  });
  if(m.historyCount<=4&&m.seasonTotals?.length){
   const top=Math.max(500+m.historyRows.length*132+76,820),bottom=1232,height=Math.max(60,Math.min(300,bottom-top-54)),max=Math.max(1,...m.seasonTotals.map(s=>s.puntos)),cell=840/m.seasonTotals.length;
   out+=escText('PUNTOS ACUMULADOS POR TEMPORADA',540,top,20,'#95713a','text-anchor="middle" font-weight="700" letter-spacing="1"');out+='<path d="M120 '+bottom+'H960" stroke="#b5a37e"/>';
   m.seasonTotals.forEach((season,i)=>{const center=120+cell*(i+.5),h=height*season.puntos/max,w=Math.min(132,cell*.55);out+='<rect x="'+(center-w/2)+'" y="'+(bottom-h)+'" width="'+w+'" height="'+Math.max(2,h)+'" rx="5" fill="'+(i===m.seasonTotals.length-1?'#ae8b47':'#253442')+'"/>';out+=escText(season.puntos,center,bottom-h-14,25,'#20262e','text-anchor="middle" font-weight="900"');const label=layout(text(season.name).replace(/^Temporada\s*/i,''),cell-15,18,1,measure);out+='<text x="'+center+'" y="1267" fill="#676960" font-size="'+label.font+'" text-anchor="middle">'+esc(label.lines.join(' '))+'</text>';});
  }
  out+=escText(m.historyCount+' capítulos · '+m.pageNumber+' de '+m.pageCount,540,1357,20,'#95713a','text-anchor="middle" font-weight="700" letter-spacing="1"');
  (assets.sponsors||[]).filter(Boolean).slice(0,3).forEach((s,i)=>{out+=image(s,82+i*123,1391,108,42);});out+=escText('caborcavets.online',997,1436,18,'#95713a','text-anchor="end" letter-spacing="2"');
  return out+'</g></svg>';
 }
 function filename(m){return ['lmbc',m.type.startsWith('career')?'trayectoria':m.type==='mvp'?'mvp':'tarjeta',m.id,m.gameId,m.seasonId,m.categoryId,m.teamId,m.kind,m.type==='career-back'?'reverso-'+m.pageNumber:''].filter(Boolean).join('-').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]/g,'-').toLowerCase()+'.png';}
 async function asset(path,clean){
  if(!path)return null;const target=new URL(path,base);if(target.origin!==base.origin)return null;
  return new Promise(resolve=>{const img=new Image(),timer=setTimeout(()=>{img.onload=img.onerror=null;resolve(null);},6000);
   img.onerror=()=>{clearTimeout(timer);resolve(null);};img.onload=()=>{clearTimeout(timer);try{const source=clean&&root.ArenaUI?.logoForExport?root.ArenaUI.logoForExport(img):img,w=source.naturalWidth||source.width,h=source.naturalHeight||source.height,scale=Math.min(1,1600/Math.max(w,h)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(w*scale));canvas.height=Math.max(1,Math.round(h*scale));canvas.getContext('2d').drawImage(source,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL('image/png'));}catch{resolve(null);}};img.src=target.href;
  });
 }
 async function poster(m){
  const sponsors=(m.sponsors||[]).filter(s=>s.logo).slice(0,3),isBack=m.type==='career-back',[photo,team,league,...rest]=await Promise.all([isBack?null:(async()=>await asset(m.photo,false)||(m.fallbackPhoto&&m.fallbackPhoto!==m.photo?await asset(m.fallbackPhoto,false):null))(),isBack?null:asset(m.teamLogo,true),asset('img/equipos/logovets.png',true),...sponsors.map(s=>asset(s.logo,true)),...(isBack?m.historyRows:[]).map(r=>asset(r.teamLogo,true))]);
  const support=rest.slice(0,sponsors.length),historyTeams=rest.slice(sponsors.length);
  if(isBack&&m.historyRows.some((r,i)=>r.teamLogo&&!historyTeams[i]))throw Error('No se pudo cargar un logo del historial. Reintenta.');
  if(!isBack&&m.photo&&!photo)throw Error('No se pudo cargar la fotografía. Reintenta antes de descargar la tarjeta.');
  if(!isBack&&m.teamLogo&&!team)throw Error('No se pudo cargar el logo del equipo. Reintenta.');
  if(!league)throw Error('No se pudo cargar el logo de la liga. Reintenta.');
  const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;const ctx=canvas.getContext('2d');if(!ctx)throw Error('Tu navegador no pudo crear la tarjeta.');
  const measure=(s,size)=>{ctx.font='700 '+size+'px Arial';return ctx.measureText(s).width;};
  const source=URL.createObjectURL(new Blob([svg(m,{photo,team,league,sponsors:support,historyTeams},measure)],{type:'image/svg+xml;charset=utf-8'}));
  try{await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{ctx.drawImage(img,0,0);resolve();};img.onerror=()=>reject(Error('No se pudo preparar la tarjeta. Reintenta.'));img.src=source;});const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('No se pudo crear la imagen. Reintenta.');return {blob,missing:support.filter(s=>!s).length};}
  finally{URL.revokeObjectURL(source);}
 }
 function mount(host,{scopes,selected=0,view='front'}){
  if(!host||!scopes.length)return;
  host.innerHTML='<div class="player-card-controls"><div><span class="hero__eyebrow">Tu tarjeta coleccionable</span><p>Elige una temporada o toda su trayectoria.</p></div><label>Tipo de tarjeta y estadísticas<select data-card-scope>'+scopes.map((s,i)=>'<option value="'+i+'"'+(i===selected?' selected':'')+'>'+esc(s.label)+'</option>').join('')+'</select></label><label data-card-view-label hidden>Vista de tarjeta<select data-card-view></select></label><div class="game-actions"><button type="button" data-card-download>Descargar tarjeta</button><button type="button" data-card-share>Compartir tarjeta ↗</button></div><p data-card-status role="status" aria-live="polite"></p></div>';
  const buttons=[...host.querySelectorAll('button')],selector=host.querySelector('[data-card-scope]'),status=host.querySelector('[data-card-status]');
  const side=host.querySelector('[data-card-view]'),sideLabel=host.querySelector('[data-card-view-label]');
  function views(initial='front'){const pages=historyCards(scopes[Number(selector.value)].model);sideLabel.hidden=!pages.length;side.innerHTML='<option value="front">Frente · fotografía y totales</option>'+pages.map((p,i)=>'<option value="back-'+i+'">Reverso · historial '+p.pageNumber+' de '+p.pageCount+'</option>').join('');side.value=initial==='front'||pages.some((p,i)=>initial==='back-'+i)?initial:'front';}
  views(view);selector.onchange=()=>views();
  for(const button of buttons)button.onclick=async()=>{const previous=button.textContent,front=scopes[Number(selector.value)].model,m=side.value.startsWith('back-')?historyCards(front)[Number(side.value.slice(5))]||front:front;buttons.forEach(b=>b.disabled=true);selector.disabled=true;side.disabled=true;button.textContent='Preparando tarjeta…';status.textContent='';
   try{const {blob,missing}=await poster(m);if(button.hasAttribute('data-card-share'))root.ArenaUI.shareImage({blob,name:filename(m),title:'Tarjeta de '+m.name,alt:'Tarjeta de '+m.name+' · '+m.team+' · '+m.category+' · '+m.season,page:m.page,trigger:button,downloadLabel:'Descargar tarjeta',shareLabel:'Compartir tarjeta',statusText:missing?'Algún patrocinador no pudo cargarse. Puedes reintentar.':''});
    else{const link=document.createElement('a'),href=URL.createObjectURL(blob);link.href=href;link.download=filename(m);document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(href),30000);status.textContent=missing?'Tarjeta preparada. Algún patrocinador no pudo cargarse.':'Tarjeta lista para descargar.';}}
   catch(error){status.textContent=error.message;}finally{buttons.forEach(b=>b.disabled=false);selector.disabled=false;side.disabled=false;button.textContent=previous;}
  };
 }
 const api={profileModel,careerModel,historyCards,mvpModel,layout,svg,filename,poster,mount};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LMBCPlayerCard=api;
})(typeof window!=='undefined'?window:globalThis);
