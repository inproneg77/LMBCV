(function(root){
'use strict';
const F=typeof module!=='undefined'&&module.exports?require('./fan-core.js'):root.FanCore;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function layout(value,width,size,maxLines,measure){
 const s=String(value??'').trim(),widthOf=(v,n)=>measure?measure(v,n):Array.from(v).reduce((a,c)=>a+(/[MWÁÉÓ]/.test(c)?.82:/[ilI.,' ]/.test(c)?.28:.56)*n,0);
 function wrap(n){const lines=[];let line='';for(const word of s.split(/\s+/)){if(widthOf(word,n)>width){if(line){lines.push(line);line='';}for(const c of word){if(line&&widthOf(line+c,n)>width){lines.push(line);line='';}line+=c;}}else if(line&&widthOf(line+' '+word,n)>width){lines.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)lines.push(line);return lines;}
 let font=size,lines=wrap(font);while(lines.length>maxLines&&font>10){font--;lines=wrap(font);}return {font,lines};
}
function model({games,teams,categories,seasons,venues,category,season,date}){
 const cat=categories.find(c=>c.id===category),temp=seasons.find(s=>s.id===season);
 if(!cat||!temp||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T12:00:00Z'))||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date)throw Error('Selecciona categoría, temporada y una fecha válida.');
 const rows=games.filter(g=>g.temporada===season&&(!g.categoria_id||g.categoria_id===category)&&g.fecha===date&&F.regular(g)&&!g.torneo_id&&g.ambito!=='torneo'&&['programado','jugado'].includes(g.estatus)).slice().sort(F.order);
 if(!rows.length)throw Error('No hay juegos regulares guardados para esta fecha, categoría y rama. Guarda los partidos o elige otra fecha.');
 const ids=new Set(),find=id=>{const team=teams.find(t=>t.id===id);if(!team||!(team.categorias||[]).includes(category))throw Error('Revisa los equipos del rol: falta un registro de esta categoría.');return {id:team.id,name:team.nombre,logo:team.logo||''};};
 return {date,categoryId:category,seasonId:season,category:cat.nombre,branch:cat.rama||'',season:temp.nombre,dateLabel:new Intl.DateTimeFormat('es-MX',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z')),games:rows.map(g=>{
  if(!g.id||ids.has(g.id)||g.local===g.visita)throw Error('Revisa el rol: hay un ID repetido o un equipo contra sí mismo.');ids.add(g.id);
  const venue=venues.find(s=>s.id===g.sede_id)?.nombre||g.sede||g.sede_nombre||'Sede por confirmar';
  return {id:g.id,local:find(g.local),visitor:find(g.visita),time:F.hour(g.hora),venue,played:g.estatus==='jugado'};
 })};
}
function svg(m,assets={},measure){
 const ink='#25302F',gold='#A7834C',muted='#647169',top=420,row=172,height=Math.max(1350,top+m.games.length*row+120),width=1080;
 const image=(src,x,y,w,h)=>/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=\s]+$/.test(src||'')?'<image href="'+src+'" x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" preserveAspectRatio="xMidYMid meet"/>':'';
 const text=(v,x,y,size=24,fill=ink,extra='',w=980,lines=1)=>{const a=layout(v,w,size,lines,measure);return '<text x="'+x+'" y="'+y+'" font-size="'+a.font+'" fill="'+fill+'" '+extra+'>'+a.lines.map((s,i)=>'<tspan x="'+x+'" dy="'+(i?a.font*1.12:0)+'">'+esc(s)+'</tspan>').join('')+'</text>';};
 let out='<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="'+height+'" viewBox="0 0 1080 '+height+'"><defs><linearGradient id="foil" x2="1" y2="1"><stop stop-color="#967044"/><stop offset=".19" stop-color="#D7BA7E"/><stop offset=".39" stop-color="#FFF0C7"/><stop offset=".55" stop-color="#A8834A"/><stop offset=".77" stop-color="#F2E1B6"/><stop offset="1" stop-color="#9A7849"/></linearGradient><linearGradient id="header" x2="1" y2="1"><stop stop-color="#182322"/><stop offset="1" stop-color="#34423C"/></linearGradient></defs><g font-family="Arial,sans-serif"><rect width="1080" height="'+height+'" rx="28" fill="'+ink+'"/><rect x="10" y="10" width="1060" height="'+(height-20)+'" rx="23" fill="url(#foil)"/><rect x="25" y="25" width="1030" height="'+(height-50)+'" rx="13" fill="#F8F4EB"/><rect x="34" y="34" width="1012" height="'+(height-68)+'" rx="8" fill="none" stroke="#BFA572" stroke-width="1"/><g opacity=".045">'+image(assets.league,165,Math.max(420,(height-780)/2),950,950)+'</g><rect x="35" y="35" width="1010" height="217" rx="8" fill="url(#header)"/><path d="M35 247H1045" stroke="url(#foil)" stroke-width="7"/><path d="M244 59V223" stroke="url(#foil)" opacity=".6"/>';
 out+=image(assets.league,57,48,176,181)+text('LMBC VETERANOS',274,108,36,'#FFF5DF','font-weight="900" letter-spacing="3"',720)+text(m.season,276,153,27,'#DCC18B','letter-spacing="2"',720)+text('LIGA MUNICIPAL DE BÁSQUETBOL · CABORCA',276,199,17,'#E2D9C6','font-weight="700" letter-spacing="1"',710);
 out+=text('JORNADA',58,326,76,ink,'font-family="Impact,Arial Black,Arial,sans-serif" font-weight="900" letter-spacing="3"',670)+text('ROL REGULAR',1020,312,17,gold,'text-anchor="end" font-weight="700" letter-spacing="2"',290);
 out+=text(m.category+(m.branch&&!m.category.toLowerCase().includes(m.branch.toLowerCase())?' · '+m.branch:''),60,368,29,ink,'font-weight="700"',950);
 out+=text(m.dateLabel,60,402,24,muted,'',785)+text(m.games.length+' PARTIDOS',1020,402,16,gold,'text-anchor="end" font-weight="700"',170);
 m.games.forEach((g,i)=>{const y=top+i*row,initials=t=>t.name.split(/\s+/).filter(Boolean).slice(0,2).map(s=>s[0]).join('');
  out+='<rect x="49" y="'+(y+4)+'" width="982" height="154" rx="8" fill="#E8E0CE" opacity=".55"/><rect x="48" y="'+y+'" width="984" height="154" rx="8" fill="#FFFFFF" fill-opacity=".78" stroke="#CDB78C"/><path d="M62 '+(y+31)+'V'+(y+14)+'H90M990 '+(y+14)+'H1018V'+(y+31)+'" fill="none" stroke="url(#foil)" stroke-width="3"/>';
  out+=assets.teams?.[g.local.id]?image(assets.teams[g.local.id],70,y+22,104,88):text(initials(g.local),122,y+74,32,gold,'text-anchor="middle" font-weight="900"',95);
  out+=assets.teams?.[g.visitor.id]?image(assets.teams[g.visitor.id],906,y+22,104,88):text(initials(g.visitor),958,y+74,32,gold,'text-anchor="middle" font-weight="900"',95);
  out+='<path d="M510 '+(y+38)+'L540 '+(y+21)+'L570 '+(y+38)+'V'+(y+72)+'L540 '+(y+89)+'L510 '+(y+72)+'Z" fill="#F5EFE1" stroke="url(#foil)"/>';
  out+=text(g.local.name,191,y+51,28,ink,'font-weight="900"',264,2)+text(g.visitor.name,889,y+51,28,ink,'text-anchor="end" font-weight="900"',264,2)+text('VS',540,y+65,24,gold,'text-anchor="middle" font-weight="900"',50);
  if(g.played)out+=text('YA JUGADO',540,y+105,10,muted,'text-anchor="middle" letter-spacing="1"',100);
  out+='<path d="M190 '+(y+113)+'H890" stroke="#D6C39F"/>';
  out+=text(g.time+' · '+g.venue,540,y+141,23,ink,'text-anchor="middle" font-weight="700"',900);
 });
 out+='<path d="M60 '+(height-87)+'H1020" stroke="url(#foil)" stroke-width="2"/><path d="M49 272V297M49 272H74M1031 272H1006M1031 272V297M49 '+(height-115)+'V'+(height-49)+'H115M1031 '+(height-115)+'V'+(height-49)+'H965" fill="none" stroke="url(#foil)" stroke-width="3"/>';
 out+=text('LA CANCHA NOS UNE',66,height-54,15,gold,'font-weight="700" letter-spacing="3"',490)+text('caborcavets.online',1014,height-54,18,muted,'text-anchor="end"',400);
 return out+'</g></svg>';
}
function filename(m){const safe=v=>String(v).replace(/[^a-zA-Z0-9_-]/g,'-');return ['LMBC','Rol',m.seasonId,m.categoryId,m.date].map(safe).join('-')+'.png';}
const api={model,svg,filename};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LMBCRolPoster=api;
})(typeof window!=='undefined'?window:globalThis);
