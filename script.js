const AudioCtx=window.AudioContext||window.webkitAudioContext;let audioCtx=null;
function getAudio(){if(!audioCtx)audioCtx=new AudioCtx();return audioCtx;}
function playStarSound(){try{const ctx=getAudio();[523.25,659.25,783.99,1046.50].forEach((freq,i)=>{const osc=ctx.createOscillator(),gain=ctx.createGain();osc.connect(gain);gain.connect(ctx.destination);osc.type='sine';osc.frequency.setValueAtTime(freq,ctx.currentTime+i*0.11);gain.gain.setValueAtTime(0.28,ctx.currentTime+i*0.11);gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+i*0.11+0.25);osc.start(ctx.currentTime+i*0.11);osc.stop(ctx.currentTime+i*0.11+0.3);});}catch(e){}}

const COLORS=['#7F77DD','#1D9E75','#378ADD','#D85A30','#BA7517','#D4537E','#639922','#888780','#e24b4a','#5DCAA5','#EF9F27','#534AB7'];
let selectedColor=COLORS[0],editColor=COLORS[0],editingId=null,activities=[],todayKey='';
let calViewYear=new Date().getFullYear(),calViewMonth=new Date().getMonth();
let confirmCallback=null;

// ─── HELPERS ───
function getDateKey(d){return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function getTodayKey(){return getDateKey(new Date());}
function timeToMin(t){const[h,m]=t.split(':').map(Number);return h*60+m;}
function nowMin(){const n=new Date();return n.getHours()*60+n.getMinutes();}
function canMark(act){const now=nowMin(),s=timeToMin(act.start),e=timeToMin(act.end);return e<s?now>=s||now<e:now>=s;}
function isSkippedAct(actId){return localStorage.getItem(`dhv_skip_act_${todayKey}_${actId}`)===`1`;}
function setSkippedAct(actId,v){if(v)localStorage.setItem(`dhv_skip_act_${todayKey}_${actId}`,'1');else localStorage.removeItem(`dhv_skip_act_${todayKey}_${actId}`);}

// ── PCT LOGIC (FIXED): skipped count as 0, total is always all activities ──
// pct = done / total  (skipped activities count as not done)
function calcTodayPct(){
  if(!activities.length)return 0;
  return Math.round(activities.filter(a=>a.done).length/activities.length*100);
}
function calcSnapPct(snap){
  // snap.total = all activities that day, snap.done = completed ones
  // snap.acts[].manualSkip = individually skipped
  if(!snap||snap.skipped)return null;
  if(!snap.total)return 0;
  return Math.round((snap.done||0)/snap.total*100);
}

// ─── DATA ───
function loadData(){
  const raw=localStorage.getItem('dhv_activities');
  activities=raw?JSON.parse(raw):[];
  todayKey=getTodayKey();
  const lastDay=localStorage.getItem('dhv_day');
  if(lastDay&&lastDay!==todayKey){
    // Save snapshot of yesterday — done/total, skipped per act
    const snap={key:lastDay,total:activities.length,done:activities.filter(a=>a.done).length,skipped:false,
      acts:activities.map(a=>({id:a.id,name:a.name,color:a.color,done:a.done,manualSkip:localStorage.getItem(`dhv_skip_act_${lastDay}_${a.id}`)===`1`}))};
    saveHistoryDay(snap);
    activities=activities.map(a=>({...a,done:false}));
    saveData();
    // Remove any streak shield used yesterday if it saved the streak
  }
  localStorage.setItem('dhv_day',todayKey);
}
function saveData(){localStorage.setItem('dhv_activities',JSON.stringify(activities));}
function saveHistoryDay(snap){
  const raw=localStorage.getItem('dhv_history');const hist=raw?JSON.parse(raw):[];
  const idx=hist.findIndex(h=>h.key===snap.key);
  if(idx>=0)hist[idx]=snap;else hist.unshift(snap);
  localStorage.setItem('dhv_history',JSON.stringify(hist));
}
function getHistory(){const raw=localStorage.getItem('dhv_history');return raw?JSON.parse(raw):[];}

// ─── STARS / INVENTORY ───
function getTotalStars(){return parseInt(localStorage.getItem('dhv_total_stars')||'0');}
function addStars(n){localStorage.setItem('dhv_total_stars',getTotalStars()+n);}
function getSpentStars(){return parseInt(localStorage.getItem('dhv_spent_stars')||'0');}
function addSpentStars(n){localStorage.setItem('dhv_spent_stars',getSpentStars()+n);}
function getAvailableStars(){return getTotalStars()-getSpentStars();}
function getInventory(){const raw=localStorage.getItem('dhv_inventory');return raw?JSON.parse(raw):{streak_shield:0,streak_recover:0,day_shield:0};}
function saveInventory(inv){localStorage.setItem('dhv_inventory',JSON.stringify(inv));}
function getPurchaseHistory(){const raw=localStorage.getItem('dhv_purchase_hist');return raw?JSON.parse(raw):[];}
function addPurchaseHistory(entry){const h=getPurchaseHistory();h.unshift(entry);localStorage.setItem('dhv_purchase_hist',JSON.stringify(h.slice(0,30)));}
function hasTodayShield(){return localStorage.getItem('dhv_shield_day')===todayKey;}
function hasTomorrowShield(){
  const d=new Date();d.setDate(d.getDate()+1);
  return localStorage.getItem('dhv_shield_next')===getDateKey(d);
}
function activateTodayShield(){localStorage.setItem('dhv_shield_day',todayKey);}
function activateTomorrowShield(){
  const d=new Date();d.setDate(d.getDate()+1);
  localStorage.setItem('dhv_shield_next',getDateKey(d));
}

// ─── CONFIRM DIALOG ───
function openConfirm(title,msg,cb,okLabel='Confirmar'){
  confirmCallback=cb;
  document.getElementById('confirm-title').textContent=title;
  document.getElementById('confirm-msg').textContent=msg;
  document.getElementById('confirm-ok-btn').textContent=okLabel;
  document.getElementById('confirm-overlay').classList.add('open');
  document.getElementById('confirm-ok-btn').onclick=()=>{closeConfirm();if(cb)cb();};
}
function closeConfirm(){document.getElementById('confirm-overlay').classList.remove('open');confirmCallback=null;}

// ─── DRAWER ───
function openDrawer(){document.getElementById('drawer').classList.add('open');document.getElementById('drawer-overlay').classList.add('open');}
function closeDrawer(){document.getElementById('drawer').classList.remove('open');document.getElementById('drawer-overlay').classList.remove('open');}

// ─── TUTORIAL ───
function closeTutorial(){
  const el=document.getElementById('tutorial');
  el.style.opacity='0';el.style.transition='opacity 0.4s';
  setTimeout(()=>el.style.display='none',400);
  localStorage.setItem('dhv_tutorial_seen','1');
}

// ─── PARTICLES ───
function initParticles(){
  const canvas=document.getElementById('particles');const ctx=canvas.getContext('2d');let W,H,pts;
  function resize(){W=canvas.width=window.innerWidth;H=canvas.height=window.innerHeight;pts=Array.from({length:45},()=>({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*0.2,vy:(Math.random()-.5)*0.2,r:Math.random()*1.3+0.3,alpha:Math.random()*0.18+0.04,hue:Math.random()>0.7?'14,165,176':Math.random()>0.5?'196,78,216':'127,119,221'}));}
  resize();window.addEventListener('resize',resize);
  function draw(){ctx.clearRect(0,0,W,H);pts.forEach(p=>{p.x+=p.vx;p.y+=p.vy;if(p.x<0)p.x=W;if(p.x>W)p.x=0;if(p.y<0)p.y=H;if(p.y>H)p.y=0;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=`rgba(${p.hue},${p.alpha})`;ctx.fill();});requestAnimationFrame(draw);}
  draw();
}

function updateDate(){
  const d=new Date();
  const dias=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const meses=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  document.getElementById('top-bar-date').textContent=`${dias[d.getDay()]} ${d.getDate()} ${meses[d.getMonth()]}`;
}

// ─── CLOCK ───
function drawClock(){
  const svg=document.getElementById('clock-svg');
  const cx=120,cy=120,R=106,rInner=62;let html='';
  html+=`<circle cx="${cx}" cy="${cy}" r="${R+10}" fill="none" stroke="rgba(127,119,221,0.05)" stroke-width="18"/>`;
  html+=`<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="rgba(127,119,221,0.1)" stroke-width="1.2"/>`;
  for(let h=0;h<24;h++){
    const angle=(h/24)*2*Math.PI-Math.PI/2;
    const isMajor=h%6===0,isSemi=h%3===0;
    const tickLen=isMajor?10:isSemi?6:3.5;
    const x1=cx+(R-1)*Math.cos(angle),y1=cy+(R-1)*Math.sin(angle);
    const x2=cx+(R-1+tickLen)*Math.cos(angle),y2=cy+(R-1+tickLen)*Math.sin(angle);
    html+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(127,119,221,${isMajor?0.48:0.18})" stroke-width="${isMajor?1.5:0.8}" stroke-linecap="round"/>`;
    if(isMajor){const lbl=h===0?'0':h;const lx=cx+(R+16)*Math.cos(angle),ly=cy+(R+16)*Math.sin(angle);html+=`<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="central" font-size="8.5" fill="rgba(127,119,221,0.5)" font-family="Inter,sans-serif" font-weight="600">${lbl}</text>`;}
  }
  const sorted=[...activities].sort((a,b)=>timeToMin(a.start)-timeToMin(b.start));
  sorted.forEach(act=>{
    let s=timeToMin(act.start),e=timeToMin(act.end);
    if(e<=s)e+=1440;
    const sA=(s/1440)*2*Math.PI-Math.PI/2,eA=(e/1440)*2*Math.PI-Math.PI/2;
    const large=(e-s)>720?1:0;
    const arcR=R-7,innerR=rInner+8;
    const x1=cx+arcR*Math.cos(sA),y1=cy+arcR*Math.sin(sA);
    const x2=cx+arcR*Math.cos(eA),y2=cy+arcR*Math.sin(eA);
    const xi1=cx+innerR*Math.cos(eA),yi1=cy+innerR*Math.sin(eA);
    const xi2=cx+innerR*Math.cos(sA),yi2=cy+innerR*Math.sin(sA);
    const isSkipped=isSkippedAct(act.id);
    const opacity=act.done?0.22:isSkipped?0.2:0.86;
    html+=`<path d="M${x1},${y1} A${arcR},${arcR} 0 ${large},1 ${x2},${y2} L${xi1},${yi1} A${innerR},${innerR} 0 ${large},0 ${xi2},${yi2} Z" fill="${act.color}" opacity="${opacity}" stroke="rgba(7,7,26,0.5)" stroke-width="1"/>`;
    if(act.done){const midA=(sA+eA)/2+(large?Math.PI:0);const midR=(arcR+innerR)/2;const mx=cx+midR*Math.cos(midA),my=cy+midR*Math.sin(midA);html+=`<text x="${mx}" y="${my}" text-anchor="middle" dominant-baseline="central" font-size="7" fill="${act.color}" opacity="0.8" font-family="sans-serif">✓</text>`;}
  });
  html+=`<circle cx="${cx}" cy="${cy}" r="${rInner}" fill="rgba(7,7,26,0.93)" stroke="rgba(127,119,221,0.1)" stroke-width="1.5"/>`;
  html+=`<circle cx="${cx}" cy="${cy}" r="${rInner-2}" fill="none" stroke="rgba(127,119,221,0.04)" stroke-width="10"/>`;
  const pct=calcTodayPct();
  const pctColor=pct===100?'#4eddb4':pct>=70?'#a59ef0':'#eeeaff';
  html+=`<text x="${cx}" y="${cy-12}" text-anchor="middle" font-size="26" font-weight="700" fill="${pctColor}" font-family="Inter,sans-serif" letter-spacing="-1">${pct}%</text>`;
  html+=`<text x="${cx}" y="${cy+7}" text-anchor="middle" font-size="8.5" fill="rgba(153,147,204,0.5)" font-family="Inter,sans-serif" letter-spacing="0.5" font-weight="600">DEL DÍA</text>`;
  if(activities.length>0){const d=activities.filter(a=>a.done).length;html+=`<text x="${cx}" y="${cy+20}" text-anchor="middle" font-size="7.5" fill="rgba(153,147,204,0.32)" font-family="Inter,sans-serif">${d}/${activities.length} completadas</text>`;}
  const nowA=(nowMin()/1440)*2*Math.PI-Math.PI/2;
  const nx1=cx+(rInner+4)*Math.cos(nowA),ny1=cy+(rInner+4)*Math.sin(nowA);
  const nx2=cx+(R+1)*Math.cos(nowA),ny2=cy+(R+1)*Math.sin(nowA);
  html+=`<line x1="${nx1}" y1="${ny1}" x2="${nx2}" y2="${ny2}" stroke="rgba(255,255,255,0.75)" stroke-width="1.5" stroke-linecap="round"/>`;
  html+=`<circle cx="${cx+(rInner+4)*Math.cos(nowA)}" cy="${cy+(rInner+4)*Math.sin(nowA)}" r="2.5" fill="white" opacity="0.9"/>`;
  svg.innerHTML=html;
}

// ─── RENDER ───
function render(){
  const list=document.getElementById('act-list');
  updateStats();drawClock();
  // Shield banner
  const shieldBanner=document.getElementById('shield-banner');
  if(hasTodayShield()){shieldBanner.classList.remove('hidden');}else{shieldBanner.classList.add('hidden');}
  if(!activities.length){list.innerHTML='<div class="empty-state"><p>📋</p><p>Tu rutina está vacía.<br>¡Agregá tu primera actividad!</p></div>';return;}
  const now=nowMin();
  const sorted=[...activities].sort((a,b)=>timeToMin(a.start)-timeToMin(b.start));
  const pending=sorted.filter(a=>!a.done&&!isSkippedAct(a.id));
  const skippedActs=sorted.filter(a=>isSkippedAct(a.id));
  const done=sorted.filter(a=>a.done);
  let activeIdx=-1,nextIdx=-1;
  for(let i=0;i<pending.length;i++){const a=pending[i];const s=timeToMin(a.start),e=timeToMin(a.end);if(now>=s&&(e<s?now<e+1440:now<e)){activeIdx=i;break;}}
  if(activeIdx===-1){for(let i=0;i<pending.length;i++){if(timeToMin(pending[i].start)>now){nextIdx=i;break;}}}
  else if(activeIdx+1<pending.length){nextIdx=activeIdx+1;}
  let html='';
  pending.forEach((act,idx)=>{
    const s=timeToMin(act.start),e=timeToMin(act.end);
    const isNow=now>=s&&(e<s?now<e+1440:now<e);
    const isNext=idx===nextIdx&&!isNow;
    const canCheck=canMark(act);
    let badge='';
    if(isNow)badge='<span class="act-badge badge-now pulse">● Ahora</span>';
    else if(isNext)badge='<span class="act-badge badge-next">→ Próxima</span>';
    else if(!canCheck)badge='<span class="act-badge badge-lock">🔒</span>';
    html+=cardHTML(act,badge,isNow,isNext,canCheck,false,false);
  });
  if(skippedActs.length){html+=`<div class="group-divider">No realizadas hoy (${skippedActs.length})</div>`;skippedActs.forEach(act=>{html+=cardHTML(act,'<span class="act-badge badge-skip">✕ Saltado</span>',false,false,true,false,true);});}
  if(done.length){html+=`<div class="group-divider">Completadas (${done.length})</div>`;done.forEach(act=>{html+=cardHTML(act,'<span class="act-badge badge-done">✓ Hecho</span>',false,false,true,true,false);});}
  list.innerHTML=html;
}

function cardHTML(act,badge,isNow,isNext,canCheck,isDone,isSkipped){
  return`<div class="act-card ${isDone?'completed':''} ${isNow?'active-now':''} ${isNext?'next-up':''} ${!canCheck&&!isDone&&!isSkipped?'locked':''} ${isSkipped?'skipped-act':''}" id="card-${act.id}" style="--act-color:${act.color}">
    <div class="act-dot" style="background:${act.color}"></div>
    <div class="act-body">
      <div class="act-name ${isSkipped?'struck':''}">${act.name}${badge}</div>
      <div class="act-time">${act.start} — ${act.end}</div>
    </div>
    <div class="act-right">
      ${!isDone&&!isSkipped?`<button class="skip-act-btn" onclick="toggleSkipAct('${act.id}')">✕ No hice</button>`:''}
      ${isSkipped?`<button class="skip-act-btn" onclick="toggleSkipAct('${act.id}')">↩ Deshacer</button>`:''}
      ${!isSkipped?`<button class="check-btn ${isDone?'done':''}" ${canCheck||isDone?'':'disabled'} onclick="toggleAct('${act.id}')">${isDone?'✓ Hecho':'✓ Hecho'}</button>`:''}
      <button class="icon-btn" onclick="openEdit('${act.id}')" title="Editar">✎</button>
      <button class="icon-btn del" onclick="deleteAct('${act.id}')" title="Eliminar">🗑</button>
    </div>
  </div>`;
}

function updateStats(){
  const done=activities.filter(a=>a.done).length;
  const pct=calcTodayPct();
  // Stars = total ever completed activities
  document.getElementById('sb-count').textContent=getAvailableStars();
  document.getElementById('prog-pct').textContent=pct+'%';
  document.getElementById('prog-fill').style.width=pct+'%';
  updateStreakUI();
}

// ─── STREAK ───
function calcStreak(){
  const hist=getHistory();let streak=0;
  // Today: full if pct=100 OR has shield
  if(activities.length>0){
    const pct=calcTodayPct();
    if(pct===100||(hasTodayShield()&&pct>0))streak=1;
  }
  const today=new Date();
  for(let i=1;i<=365;i++){
    const d=new Date(today);d.setDate(d.getDate()-i);
    const key=getDateKey(d);
    const entry=hist.find(h=>h.key===key);
    if(!entry||entry.skipped)break;
    const p=calcSnapPct(entry);
    // Check if that day had a shield saved
    const hadShield=localStorage.getItem(`dhv_shield_used_${key}`)===`1`;
    if(p===100||(hadShield&&p>0))streak++;else break;
  }
  return streak;
}

function updateStreakUI(){
  const streak=calcStreak();
  const pill=document.getElementById('streak-pill');
  const banner=document.getElementById('streak-banner');
  if(streak>=1){
    pill.classList.remove('hidden');
    document.getElementById('sp-count').textContent=streak;
  }else{pill.classList.add('hidden');}
  if(streak>=2){
    banner.classList.remove('hidden');
    document.getElementById('streak-val').textContent=streak;
    let flame='🔥',title='Racha activa';
    if(streak>=30){flame='🌟';title='¡Racha épica!';}
    else if(streak>=7){flame='🔥';title='¡Racha increíble!';}
    document.getElementById('streak-flame').textContent=flame;
    document.getElementById('streak-title').textContent=title;
  }else{banner.classList.add('hidden');}
}

function calcWeekPerfect(){
  const hist=getHistory();const today=new Date();
  for(let i=0;i<7;i++){
    const d=new Date(today);d.setDate(d.getDate()-i);const key=getDateKey(d);
    if(i===0&&activities.length>0){if(calcTodayPct()<100)return false;continue;}
    const entry=hist.find(h=>h.key===key);if(!entry||entry.skipped)return false;
    if(calcSnapPct(entry)<100)return false;
  }
  return true;
}
function calcMonthPerfect(){
  const hist=getHistory();const today=new Date();
  for(let i=0;i<30;i++){
    const d=new Date(today);d.setDate(d.getDate()-i);const key=getDateKey(d);
    if(i===0&&activities.length>0){if(calcTodayPct()<100)return false;continue;}
    const entry=hist.find(h=>h.key===key);if(!entry||entry.skipped)return false;
    if(calcSnapPct(entry)<100)return false;
  }
  return true;
}
function calcTotalPerfect(){
  const hist=getHistory();
  return hist.filter(h=>!h.skipped&&calcSnapPct(h)===100).length;
}

// ─── SKIP / TOGGLE ───
function toggleSkipAct(id){
  const act=activities.find(a=>a.id===id);if(!act)return;
  if(act.done){showToast('Ya está completada, desmarcá primero');return;}
  const was=isSkippedAct(id);
  setSkippedAct(id,!was);
  render();
  showToast(was?'↩ Deshecho':'✕ Marcada como no realizada');
}

function toggleAct(id){
  const act=activities.find(a=>a.id===id);if(!act)return;
  if(!act.done&&!canMark(act)){showToast('🔒 Todavía no llegó la hora');return;}
  const wasDone=act.done;
  act.done=!act.done;
  if(act.done&&isSkippedAct(id))setSkippedAct(id,false);
  // Award a star when completing
  if(!wasDone){
    addStars(1);
    playStarSound();launchFlyingStars(id);
    const pct=calcTodayPct();
    if(pct===100&&activities.length>0){setTimeout(()=>{launchConfetti();showToast('🏆 ¡Completaste el 100% del día!');},700);}
    else{showToast('⭐ '+act.name+' completado!');}
  } else {
    // Deduct star when unmarking
    const cur=getTotalStars();if(cur>0)localStorage.setItem('dhv_total_stars',cur-1);
  }
  saveData();render();
}

function launchFlyingStars(actId){
  const card=document.getElementById('card-'+actId);const statEl=document.getElementById('star-badge');
  if(!card||!statEl)return;
  const cardRect=card.getBoundingClientRect(),targetRect=statEl.getBoundingClientRect();
  const tx=targetRect.left+targetRect.width/2,ty=targetRect.top+targetRect.height/2;
  for(let i=0;i<3;i++){setTimeout(()=>{
    const star=document.createElement('div');star.className='flying-star';star.textContent='⭐';
    const sx=cardRect.right-50+(Math.random()-.5)*40,sy=cardRect.top+cardRect.height/2+(Math.random()-.5)*20;
    star.style.left=sx+'px';star.style.top=sy+'px';document.body.appendChild(star);
    star.animate([{transform:'translate(0,0) scale(1.4)',opacity:1},{transform:`translate(${(tx-sx)*0.5}px,${(ty-sy)*0.5-40}px) scale(1.1)`,opacity:1,offset:0.5},{transform:`translate(${tx-sx}px,${ty-sy}px) scale(0.3)`,opacity:0}],{duration:900+i*80,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'});
    setTimeout(()=>star.remove(),1100+i*80);
  },i*100);}
}

function deleteAct(id){
  openConfirm('Eliminar actividad','¿Estás seguro? Esta acción no se puede deshacer.',()=>{
    activities=activities.filter(a=>a.id!==id);
    saveData();render();showToast('🗑 Actividad eliminada');
  },'Eliminar');
}

function toggleForm(){
  const form=document.getElementById('add-form');form.classList.toggle('open');
  if(form.classList.contains('open')){document.getElementById('f-name').focus();document.getElementById('add-toggle-btn').style.display='none';}
  else{document.getElementById('add-toggle-btn').style.display='';document.getElementById('f-overlap-err').style.display='none';}
}

function hasOverlap(start,end,excludeId=null){
  const sMin=timeToMin(start),eMin=timeToMin(end);if(sMin===eMin)return false;
  for(const act of activities){
    if(act.id===excludeId)continue;
    const aS=timeToMin(act.start),aE=timeToMin(act.end);
    const nC=eMin<sMin,eC=aE<aS;let ov=false;
    if(!nC&&!eC)ov=sMin<aE&&eMin>aS;
    else if(nC&&!eC)ov=aS<eMin||aE>sMin;
    else if(!nC&&eC)ov=sMin<aE||eMin>aS;
    else ov=true;
    if(ov)return act.name;
  }
  return false;
}

function saveActivity(){
  const name=document.getElementById('f-name').value.trim();
  const start=document.getElementById('f-start').value,end=document.getElementById('f-end').value;
  const errEl=document.getElementById('f-overlap-err');errEl.style.display='none';
  if(!name){showToast('Escribí un nombre');return;}
  if(!start||!end){showToast('Completá los horarios');return;}
  if(start===end){showToast('Inicio y fin no pueden ser iguales');return;}
  const conflict=hasOverlap(start,end);
  if(conflict){errEl.textContent=`Choca con "${conflict}".`;errEl.style.display='block';return;}
  activities.push({id:'a'+Date.now(),name,start,end,color:selectedColor,done:false});
  saveData();document.getElementById('f-name').value='';
  document.getElementById('add-form').classList.remove('open');
  document.getElementById('add-toggle-btn').style.display='';
  render();showToast('✓ Actividad agregada');
}

function openEdit(id){
  editingId=id;const act=activities.find(a=>a.id===id);if(!act)return;
  document.getElementById('e-name').value=act.name;
  document.getElementById('e-start').value=act.start;
  document.getElementById('e-end').value=act.end;
  editColor=act.color;buildEditColorPicker(act.color);
  document.getElementById('e-overlap-err').style.display='none';
  document.getElementById('edit-modal').style.display='flex';
}
function closeEdit(){document.getElementById('edit-modal').style.display='none';editingId=null;}
function saveEdit(){
  const name=document.getElementById('e-name').value.trim();
  const start=document.getElementById('e-start').value,end=document.getElementById('e-end').value;
  const errEl=document.getElementById('e-overlap-err');errEl.style.display='none';
  if(!name){showToast('Escribí un nombre');return;}if(!start||!end){showToast('Completá los horarios');return;}
  if(start===end){showToast('Inicio y fin no pueden ser iguales');return;}
  const conflict=hasOverlap(start,end,editingId);
  if(conflict){errEl.textContent=`Choca con "${conflict}".`;errEl.style.display='block';return;}
  const act=activities.find(a=>a.id===editingId);
  if(act){act.name=name;act.start=start;act.end=end;act.color=editColor;}
  saveData();closeEdit();render();showToast('✓ Cambios guardados');
}

function buildColorPicker(){
  const row=document.getElementById('color-row');
  COLORS.forEach(c=>{const sw=document.createElement('div');sw.className='color-swatch'+(c===selectedColor?' selected':'');sw.style.background=c;sw.onclick=()=>{selectedColor=c;document.querySelectorAll('#color-row .color-swatch').forEach(s=>s.classList.remove('selected'));sw.classList.add('selected');};row.appendChild(sw);});
}
function buildEditColorPicker(current){
  const row=document.getElementById('edit-color-row');row.innerHTML='';
  COLORS.forEach(c=>{const sw=document.createElement('div');sw.className='color-swatch'+(c===current?' selected':'');sw.style.background=c;sw.onclick=()=>{editColor=c;document.querySelectorAll('#edit-color-row .color-swatch').forEach(s=>s.classList.remove('selected'));sw.classList.add('selected');};row.appendChild(sw);});
}

// ─── TIENDA ───
const STORE_ITEMS=[
  {id:'streak_recover',icon:'⚡',name:'Recuperador de racha',desc:'Restaura tu racha aunque hayas fallado ayer. Se aplica al día anterior.',cost:50,max:3},
  {id:'day_shield',icon:'🛡️',name:'Escudo para hoy',desc:'Protege tu racha hoy aunque no llegues al 100%.',cost:30,max:3},
  {id:'next_shield',icon:'🔮',name:'Escudo para mañana',desc:'Activa un escudo para el día de mañana por adelantado.',cost:30,max:3},
  {id:'double_star',icon:'🌟',name:'Doble estrella (24h)',desc:'Ganás 2 estrellas por actividad durante 24 horas.',cost:80,max:1},
];

function renderStore(){
  const avail=getAvailableStars();
  document.getElementById('store-stars').textContent=avail;
  const inv=getInventory();
  const ds=localStorage.getItem('dhv_double_star_until');
  const doubleActive=ds&&Date.now()<parseInt(ds);

  document.getElementById('store-grid').innerHTML=STORE_ITEMS.map(item=>{
    const qty=inv[item.id]||0;
    const canBuy=avail>=item.cost;
    const isDoubleActive=item.id==='double_star'&&doubleActive;

    let actionBtn='';
    if(item.id==='streak_recover'){
      actionBtn=qty>0?`<button class="store-use-btn" onclick="useItem('streak_recover')">Usar (${qty})</button>`:'';
    }else if(item.id==='day_shield'){
      if(hasTodayShield())actionBtn=`<span class="store-owned-badge">🛡️ Activo hoy</span>`;
      else if(qty>0)actionBtn=`<button class="store-use-btn" onclick="useItem('day_shield')">Usar (${qty})</button>`;
    }else if(item.id==='next_shield'){
      if(hasTomorrowShield())actionBtn=`<span class="store-owned-badge">🔮 Activo mañana</span>`;
      else if(qty>0)actionBtn=`<button class="store-use-btn" onclick="useItem('next_shield')">Usar (${qty})</button>`;
    }else if(item.id==='double_star'){
      if(isDoubleActive)actionBtn=`<span class="store-owned-badge">🌟 Activo</span>`;
      else if(qty>0)actionBtn=`<button class="store-use-btn" onclick="useItem('double_star')">Usar (${qty})</button>`;
    }

    return`<div class="store-item ${qty>0?'owned':''}">
      <div class="store-item-icon">${item.icon}</div>
      <div class="store-item-name">${item.name}</div>
      <div class="store-item-desc">${item.desc}</div>
      ${qty>0?`<div class="store-item-qty">Tenés: ${qty}</div>`:''}
      ${actionBtn}
      <button class="store-buy-btn" ${canBuy?'':'disabled'} onclick="buyItem('${item.id}')">
        ⭐ ${item.cost} comprar
      </button>
    </div>`;
  }).join('');

  // Purchase history
  const hist=getPurchaseHistory();
  const histEl=document.getElementById('store-history');
  if(!hist.length){histEl.innerHTML='<div style="font-size:0.8rem;color:var(--text3);text-align:center;padding:1rem">No hay compras todavía</div>';return;}
  histEl.innerHTML=hist.slice(0,10).map(h=>{
    const item=STORE_ITEMS.find(i=>i.id===h.id);
    return`<div class="store-hist-item">
      <div class="store-hist-icon">${item?item.icon:'⭐'}</div>
      <div class="store-hist-text">${item?item.name:h.id}<br><span style="font-size:0.65rem;color:var(--text3)">${h.date}</span></div>
      <div class="store-hist-cost">-${h.cost}⭐</div>
    </div>`;
  }).join('');
}

function buyItem(itemId){
  const item=STORE_ITEMS.find(i=>i.id===itemId);if(!item)return;
  const avail=getAvailableStars();
  if(avail<item.cost){showToast('⭐ No tenés suficientes estrellas');return;}
  const inv=getInventory();
  if((inv[itemId]||0)>=item.max){showToast('Ya tenés el máximo de este item');return;}
  openConfirm('Confirmar compra',`¿Comprar "${item.name}" por ${item.cost} ⭐?`,()=>{
    addSpentStars(item.cost);
    inv[itemId]=(inv[itemId]||0)+1;
    saveInventory(inv);
    const d=new Date();
    addPurchaseHistory({id:itemId,cost:item.cost,date:`${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`});
    showToast('✅ '+item.name+' comprado');
    renderStore();
    document.getElementById('sb-count').textContent=getAvailableStars();
  },'Comprar');
}

function useItem(itemId){
  const item=STORE_ITEMS.find(i=>i.id===itemId);if(!item)return;
  const inv=getInventory();
  if(!inv[itemId]||inv[itemId]<=0){showToast('No tenés este item');return;}
  if(itemId==='streak_recover'){
    openConfirm('Usar Recuperador','Esto restaura tu racha contando el día de ayer como completado.',()=>{
      // Mark yesterday in history as recovered
      const hist=getHistory();const d=new Date();d.setDate(d.getDate()-1);const yk=getDateKey(d);
      const entry=hist.find(h=>h.key===yk);
      if(entry){entry.done=entry.total;entry.recovered=true;localStorage.setItem('dhv_history',JSON.stringify(hist));}
      else{const snap={key:yk,total:1,done:1,skipped:false,recovered:true,acts:[]};saveHistoryDay(snap);}
      localStorage.setItem(`dhv_shield_used_${yk}`,'1');
      inv[itemId]--;saveInventory(inv);
      showToast('⚡ ¡Racha recuperada!');renderStore();render();
    },'Usar');
  }else if(itemId==='day_shield'){
    openConfirm('Activar Escudo','Tu racha de hoy quedará protegida aunque no llegues al 100%.',()=>{
      activateTodayShield();localStorage.setItem(`dhv_shield_used_${todayKey}`,'1');
      inv[itemId]--;saveInventory(inv);
      showToast('🛡️ Escudo activado para hoy');renderStore();render();
    },'Activar');
  }else if(itemId==='next_shield'){
    openConfirm('Activar Escudo Mañana','Tu racha de mañana quedará protegida aunque no llegues al 100%.',()=>{
      activateTomorrowShield();
      const d=new Date();d.setDate(d.getDate()+1);
      localStorage.setItem(`dhv_shield_used_${getDateKey(d)}`,'1');
      inv[itemId]--;saveInventory(inv);
      showToast('🔮 Escudo activado para mañana');renderStore();
    },'Activar');
  }else if(itemId==='double_star'){
    openConfirm('Activar Doble Estrella','Ganás 2 estrellas por actividad durante las próximas 24 horas.',()=>{
      localStorage.setItem('dhv_double_star_until',Date.now()+86400000);
      inv[itemId]--;saveInventory(inv);
      showToast('🌟 ¡Doble estrella activado!');renderStore();
    },'Activar');
  }
}

// ─── TAB SWITCH ───
function switchTab(tab){
  ['main','hist-view','profile-view','store-view'].forEach(id=>document.getElementById(id).style.display='none');
  const map={hoy:'main',hist:'hist-view',profile:'profile-view',store:'store-view'};
  document.getElementById(map[tab]||'main').style.display='block';
  const titles={hoy:'Hoy',hist:'Historial',profile:'Perfil & Logros',store:'Tienda'};
  document.getElementById('top-bar-title').textContent=titles[tab]||'Hoy';
  ['hoy','hist','profile','store'].forEach(t=>document.getElementById('dnav-'+t)?.classList.toggle('active',t===tab));
  if(tab==='hist')renderHistory();
  if(tab==='profile')renderProfile();
  if(tab==='store')renderStore();
}

// ─── HISTORY ───
function getDayData(key){
  const hist=getHistory();
  if(key===todayKey&&activities.length>0){
    return{key:todayKey,total:activities.length,done:activities.filter(a=>a.done).length,skipped:false,
      acts:activities.map(a=>({id:a.id,name:a.name,color:a.color,done:a.done,manualSkip:isSkippedAct(a.id)})),isToday:true};
  }
  return hist.find(h=>h.key===key)||null;
}

function changeMonth(delta){
  calViewMonth+=delta;
  if(calViewMonth>11){calViewMonth=0;calViewYear++;}
  if(calViewMonth<0){calViewMonth=11;calViewYear--;}
  renderCalendar();
}

function renderCalendar(){
  const meses=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  document.getElementById('cal-month-title').textContent=`${meses[calViewMonth]} ${calViewYear}`;
  const dias=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  document.getElementById('cal-weekdays').innerHTML=dias.map(d=>`<div class="cal-weekday">${d}</div>`).join('');
  const todayStr=getTodayKey();
  const firstDay=new Date(calViewYear,calViewMonth,1);
  const lastDay=new Date(calViewYear,calViewMonth+1,0);
  const startDow=firstDay.getDay();
  const totalDays=lastDay.getDate();
  let cells='';
  for(let i=0;i<startDow;i++)cells+=`<div class="cal-day cal-empty"></div>`;
  for(let d=1;d<=totalDays;d++){
    const key=`${calViewYear}-${String(calViewMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isFuture=key>todayStr;
    const isToday=key===todayStr;
    let cls='cal-day';if(isToday)cls+=' today-cell';
    if(isFuture){cls+=' pct-future';cells+=`<div class="${cls}"><div class="cal-day-num">${d}</div></div>`;continue;}
    const data=getDayData(key);
    const pct=data?calcSnapPct(data):null;
    if(pct===null)cls+=' pct-0';
    else if(pct===-1||pct===null)cls+=' pct-0';
    else if(pct<31)cls+=' pct-low';
    else if(pct<70)cls+=' pct-mid';
    else if(pct<100)cls+=' pct-high';
    else cls+=' pct-full';
    cells+=`<div class="${cls}" onmouseenter="showCalTooltip(event,'${key}')" onmouseleave="hideCalTooltip()">
      <div class="cal-day-num">${d}</div>
      ${data&&pct!==null&&pct>0?'<div class="cal-dot"></div>':''}
    </div>`;
  }
  document.getElementById('cal-days').innerHTML=cells;
}

function showCalTooltip(e,key){
  const tt=document.getElementById('cal-tooltip');
  const data=getDayData(key);
  const[y,m,d]=key.split('-').map(Number);
  const date=new Date(y,m-1,d);
  const dias=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const meses=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  tt.querySelector('.tt-date').textContent=`${dias[date.getDay()]} ${d} ${meses[m-1]} ${y}`;
  if(!data){tt.querySelector('.tt-pct').textContent='Sin actividades';tt.querySelector('.tt-acts').innerHTML='';}
  else if(data.skipped){tt.querySelector('.tt-pct').textContent='Día saltado';tt.querySelector('.tt-acts').innerHTML='';}
  else{
    const pct=calcSnapPct(data);
    tt.querySelector('.tt-pct').textContent=(pct!==null?pct:'0')+'% completado';
    if(data.acts)tt.querySelector('.tt-acts').innerHTML=data.acts.slice(0,5).map(a=>`<div class="tt-act-row"><div class="tt-dot" style="background:${a.color}"></div><span style="${a.manualSkip?'text-decoration:line-through;opacity:0.5':''}${a.done?'color:#4eddb4':''}">${a.name}</span></div>`).join('')+(data.acts.length>5?`<div style="font-size:0.6rem;color:var(--text3)">+${data.acts.length-5} más</div>`:'');
  }
  tt.style.opacity='1';
  tt.style.left=Math.min(e.clientX+14,window.innerWidth-200)+'px';
  tt.style.top=Math.min(e.clientY+14,window.innerHeight-160)+'px';
}
function hideCalTooltip(){document.getElementById('cal-tooltip').style.opacity='0';}

function renderHistory(){
  const hist=getHistory();
  const todayEntry=activities.length?getDayData(todayKey):null;
  const allEntries=todayEntry?[todayEntry,...hist.filter(h=>h.key!==todayKey)]:hist;
  document.getElementById('hist-subtitle').textContent=`${allEntries.length} días registrados · ${allEntries.filter(d=>calcSnapPct(d)===100).length} días al 100%`;
  renderCalendar();renderMiniChart();
  const meses=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const dias=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const list=document.getElementById('hist-list');
  if(!allEntries.length){list.innerHTML='<div class="empty-state"><p>📅</p><p>Todavía no hay historial.</p></div>';return;}
  list.innerHTML=allEntries.slice(0,60).map(day=>{
    const[y,m,d]=day.key.split('-').map(Number);
    const date=new Date(y,m-1,d);
    const pct=calcSnapPct(day);
    const pctColor=pct===100?'#4eddb4':pct===0||pct===null?'var(--text3)':'var(--purple-light)';
    let pillsHTML='';
    if(day.skipped){pillsHTML=`<span class="day-act-pill skip-pill">⚠️ Día no realizado</span>`;}
    else if(day.acts&&day.acts.length){pillsHTML=day.acts.map(a=>`<span class="day-act-pill ${a.manualSkip?'skip-manual':a.done?'done-pill':'skip-pill'}"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${a.color}"></span>${a.name}</span>`).join('');}
    return`<div class="day-card">
      <div class="day-card-header">
        <div class="day-label">${dias[date.getDay()]} ${d} ${meses[m-1]}${day.isToday?'<small>hoy</small>':''}</div>
        <div style="font-size:1rem;font-weight:800;color:${pctColor}">${pct!==null?pct+'%':'—'}</div>
      </div>
      ${pct!==null&&!day.skipped?`<div class="day-bar-bg"><div class="day-bar-fill ${pct===100?'full':''}" style="width:${pct}%"></div></div>`:''}
      <div class="day-acts">${pillsHTML}</div>
    </div>`;
  }).join('');
}

function renderMiniChart(){
  const hist=getHistory();const days=[];
  for(let i=13;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const k=getDateKey(d);
    if(k===todayKey&&activities.length>0){days.push(getDayData(todayKey));continue;}
    days.push(hist.find(h=>h.key===k)||{key:k,total:0,done:0,skipped:false,empty:true});
  }
  const weekdays=['D','L','M','M','J','V','S'];
  document.getElementById('mini-chart').innerHTML=days.map(day=>{
    const[y,m,d]=day.key.split('-').map(Number);
    const wd=weekdays[new Date(y,m-1,d).getDay()];
    const pct=day.empty?null:calcSnapPct(day);
    const dispPct=pct===null?0:pct<0?10:pct;
    const barClass=day.skipped?'skipped-bar':pct===100?'full':pct===0||pct===null?'zero':'';
    const isToday=day.key===todayKey;
    return`<div class="mini-bar-wrap">
      <div class="mini-bar-bg"><div class="mini-bar ${barClass}" style="height:${day.empty?0:dispPct}%"></div></div>
      <div class="mini-day" style="color:${isToday?'var(--purple-light)':'var(--text3)'};">${wd}</div>
    </div>`;
  }).join('');
}

// ─── PROFILE ───
function renderProfile(){
  const streak=calcStreak();
  const totalPerfect=calcTotalPerfect();
  document.getElementById('ps-streak').textContent=streak;
  document.getElementById('ps-total').textContent=totalPerfect;
  document.getElementById('ps-acts').textContent=activities.length;
  const weekOk=calcWeekPerfect(),monthOk=calcMonthPerfect();
  const doneToday=activities.filter(a=>a.done).length;
  const rewards=[
    {icon:'⭐',name:'Primera estrella',desc:'Completá 1 actividad',unlocked:doneToday>=1,prog:Math.min(doneToday,1),max:1},
    {icon:'🔥',name:'Racha de 3 días',desc:'3 días al 100% seguidos',unlocked:streak>=3,prog:Math.min(streak,3),max:3},
    {icon:'📅',name:'Semana perfecta',desc:'7 días al 100% seguidos',unlocked:weekOk,prog:Math.min(streak,7),max:7},
    {icon:'💪',name:'Racha de 7 días',desc:'7 días al 100% seguidos',unlocked:streak>=7,prog:Math.min(streak,7),max:7},
    {icon:'🏆',name:'Mes perfecto',desc:'30 días al 100% seguidos',unlocked:monthOk,prog:Math.min(streak,30),max:30},
    {icon:'👑',name:'Maestro',desc:'50 días perfectos en total',unlocked:totalPerfect>=50,prog:Math.min(totalPerfect,50),max:50},
    {icon:'🎯',name:'Constante',desc:'10 días perfectos en total',unlocked:totalPerfect>=10,prog:Math.min(totalPerfect,10),max:10},
    {icon:'⚡',name:'Comprador',desc:'Comprá un item en la tienda',unlocked:getPurchaseHistory().length>0,prog:Math.min(getPurchaseHistory().length,1),max:1},
  ];
  document.getElementById('rewards-grid').innerHTML=rewards.map(r=>{
    const pct=Math.round((r.prog/r.max)*100);
    return`<div class="reward-card ${r.unlocked?'unlocked':''}">
      <div class="reward-icon-wrap"><span class="reward-icon">${r.icon}</span></div>
      <div class="reward-info">
        <div class="reward-name">${r.name}</div>
        <div class="reward-desc">${r.desc}</div>
        ${!r.unlocked?`<div class="reward-prog-bar"><div class="reward-prog-fill" style="width:${pct}%"></div></div>`:''}
        ${r.unlocked?`<span class="reward-badge-done">✓ Logrado</span>`:''}
      </div>
    </div>`;
  }).join('');
}

// ─── UTILS ───
function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');clearTimeout(t._timer);t._timer=setTimeout(()=>t.classList.remove('show'),2700);}
function launchConfetti(){
  const canvas=document.getElementById('confetti-canvas');const ctx=canvas.getContext('2d');
  canvas.width=window.innerWidth;canvas.height=window.innerHeight;
  const pieces=Array.from({length:70},()=>({x:Math.random()*canvas.width,y:-10,vx:(Math.random()-.5)*5,vy:Math.random()*4+2,color:COLORS[Math.floor(Math.random()*COLORS.length)],w:Math.random()*9+4,h:Math.random()*6+3,rot:Math.random()*360,rv:(Math.random()-.5)*10}));
  let f=0;function anim(){ctx.clearRect(0,0,canvas.width,canvas.height);pieces.forEach(p=>{ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot*Math.PI/180);ctx.fillStyle=p.color;ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);ctx.restore();p.x+=p.vx;p.y+=p.vy;p.rot+=p.rv;p.vy+=0.09;});f++;if(f<120)requestAnimationFrame(anim);else ctx.clearRect(0,0,canvas.width,canvas.height);}
  anim();
}

function init(){
  loadData();updateDate();buildColorPicker();render();initParticles();
  if(!localStorage.getItem('dhv_tutorial_seen'))document.getElementById('tutorial').style.display='flex';
  document.getElementById('f-name').addEventListener('keydown',e=>{if(e.key==='Enter')saveActivity();});
  document.getElementById('e-name').addEventListener('keydown',e=>{if(e.key==='Enter')saveEdit();});
  document.getElementById('edit-modal').addEventListener('click',e=>{if(e.target===document.getElementById('edit-modal'))closeEdit();});
  document.getElementById('confirm-overlay').addEventListener('click',e=>{if(e.target===document.getElementById('confirm-overlay'))closeConfirm();});
  setInterval(()=>render(),60000);
}
init();
