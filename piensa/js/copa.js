(function(root){
 'use strict';
 function suggestGroups(total){
  if(total<3)return 1;
  const choices=[];
  for(let groups=1;groups<=Math.floor(total/3);groups++)if(Math.ceil(total/groups)<=6)choices.push(groups);
  return choices.sort((a,b)=>Math.abs(total/a-4)-Math.abs(total/b-4)||a-b)[0]||1;
 }
 function groupName(index){let label='';for(let n=index+1;n>0;n=Math.floor((n-1)/26))label=String.fromCharCode(65+(n-1)%26)+label;return 'Grupo '+label;}
 if(typeof module!=='undefined'&&module.exports){module.exports={suggestGroups,groupName};return;}
 const assetBase=new URL('../',document.currentScript.src).href;
 const local=['localhost','127.0.0.1'].includes(location.hostname);
 const dataBase=local?assetBase:'https://raw.githubusercontent.com/inproneg77/piensa/main/';
 root.CopaConfig={assetBase,dataBase,imageBase:dataBase,suggestGroups,groupName,brand(logo,edition=false){
  const img=document.getElementById('copa-logo'),mark=document.getElementById('copa-mark');
  img.hidden=!logo;mark.hidden=!!logo;if(logo)img.src=logo;else img.removeAttribute('src');
  document.body.classList.toggle('edition-open',edition);
 }};
 document.addEventListener('error',event=>{
  const image=event.target;if(image?.tagName!=='IMG'||image.dataset.copaFallback)return;
  const prefix='https://raw.githubusercontent.com/inproneg77/piensa/main/';
  if(image.src.startsWith(prefix)){image.dataset.copaFallback='1';image.src='https://cdn.jsdelivr.net/gh/inproneg77/piensa@main/'+image.src.slice(prefix.length);}
 },true);
 document.addEventListener('DOMContentLoaded',()=>{
  const admin=new URLSearchParams(location.search).get('administrar')==='1';
  document.body.classList.toggle('is-admin',admin);
  document.getElementById('copa-mode').textContent=admin?'Administración de la copa':'Básquetbol · Caborca, Sonora';
 });
})(typeof window!=='undefined'?window:this);
