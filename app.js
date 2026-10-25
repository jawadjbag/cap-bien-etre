(() => {
  'use strict';
  const STORAGE = 'cap_bien_etre_v1';
  const defaults = () => ({ settings: { startDate:'2026-10-11', startWeight:107, goalWeight:null, bedTarget:'23:00' }, entries:{} });
  const el = id => document.getElementById(id);
  const today = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const safeDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s+'T12:00:00').getTime());
  const parseDate = s => new Date(s+'T12:00:00');
  const dateFmt = s => new Intl.DateTimeFormat('fr-BE',{weekday:'long',day:'numeric',month:'long'}).format(parseDate(s));
  const number = n => Number(n).toLocaleString('fr-BE',{maximumFractionDigits:1});
  const validWeight = n => n === null || (typeof n==='number' && Number.isFinite(n) && n>=20 && n<=400);
  const clean = o => {
    const d=defaults();if(!o || typeof o!=='object') return d;
    if(o.settings && typeof o.settings==='object') {
      if(safeDate(o.settings.startDate))d.settings.startDate=o.settings.startDate;
      const w=Number(o.settings.startWeight);if(validWeight(w)&&w!==null)d.settings.startWeight=w;
      if(o.settings.goalWeight!==null && o.settings.goalWeight!=='' && o.settings.goalWeight!==undefined){const g=Number(o.settings.goalWeight);if(validWeight(g)&&g>0&&g<d.settings.startWeight)d.settings.goalWeight=g;}
      if(/^([01]\d|2[0-3]):[0-5]\d$/.test(o.settings.bedTarget))d.settings.bedTarget=o.settings.bedTarget;
    }
    if(o.entries && typeof o.entries==='object' && !Array.isArray(o.entries)) {
      for(const [key,v] of Object.entries(o.entries)){
        if(!safeDate(key)||!v||typeof v!=='object')continue;
        const entry={score: Number.isInteger(v.score)&&v.score>=0&&v.score<=10?v.score:null,habits:{},breakfast:'',lunch:'',dinner:'',snacks:'',bedtime:'',wake:'',weight:null,note:''};
        for(const k of ['sugar','phone','food','bed'])entry.habits[k]=Boolean(v.habits?.[k]);
        for(const k of ['breakfast','lunch','dinner','snacks','note'])entry[k]=typeof v[k]==='string'?v[k].slice(0,3000):'';
        for(const k of ['bedtime','wake'])entry[k]=/^([01]\d|2[0-3]):[0-5]\d$/.test(v[k])?v[k]:'';
        if(v.weight!==''&&v.weight!==null&&v.weight!==undefined&&validWeight(Number(v.weight)))entry.weight=Number(v.weight);
        d.entries[key]=entry;
      }
    }
    return d;
  };
  let state;
  try { state=clean(JSON.parse(localStorage.getItem(STORAGE))); } catch { state=defaults(); }
  const store=()=>localStorage.setItem(STORAGE,JSON.stringify(state));
  let activeDate = today();
  const emptyEntry=()=>({score:null,habits:{sugar:false,phone:false,food:false,bed:false},breakfast:'',lunch:'',dinner:'',snacks:'',bedtime:'',wake:'',weight:null,note:''});
  const current=()=>state.entries[activeDate] ?? emptyEntry();
  function updateField(field,value){const e=state.entries[activeDate]??emptyEntry();e[field]=value;state.entries[activeDate]=e;store();refreshTotals();el('savedMessage').classList.add('hidden');}
  function updateHabit(k,value){const e=state.entries[activeDate]??emptyEntry();e.habits[k]=value;state.entries[activeDate]=e;store();refreshTotals();el('savedMessage').classList.add('hidden');}
  function scoreDescription(s){if(s===null)return ['🌿','Comment tu te sens aujourd’hui ?'];if(s<=2)return ['🌧️','Journée difficile. Note ce qui bloque.'];if(s<=4)return ['🌥️','Mitigé, et c’est utile à suivre.'];if(s<=6)return ['🌿','Ça avance, même doucement.'];if(s<=8)return ['☀️','Une bonne journée.'];return ['✨','Tu te sens au top.'];}
  function refreshScore(){const score=current().score;el('scoreText').textContent=score===null?'—':score;el('score').value=score===null?5:score;const [emoji,desc]=scoreDescription(score);el('scoreEmoji').textContent=emoji;el('scoreCaption').textContent=desc;}
  function timeToMinutes(s){const [h,m]=s.split(':').map(Number);return h*60+m;}
  function sleepHours(bed,wake){if(!bed||!wake)return null;let diff=timeToMinutes(wake)-timeToMinutes(bed);if(diff<=0)diff+=1440;return diff/60;}
  function refreshSleep(){const e=current();const hrs=sleepHours(e.bedtime,e.wake);el('sleepResult').textContent=hrs===null?'Renseigne tes horaires pour calculer ton sommeil.':`Durée estimée : ${number(hrs)} h (hors éveils nocturnes).`;}
  function refreshHabits(){const h=current().habits;el('habitCount').textContent=`${Object.values(h).filter(Boolean).length} / 4`;}
  function refreshTotals(){const dates=Object.keys(state.entries).sort();const allWeights=[{d:state.settings.startDate,w:state.settings.startWeight}, ...dates.filter(d=>state.entries[d].weight!==null && d>=state.settings.startDate).map(d=>({d,w:state.entries[d].weight}))].sort((a,b)=>a.d.localeCompare(b.d));
    const latest=allWeights.at(-1)?.w??state.settings.startWeight;const diff=latest-state.settings.startWeight;
    el('currentWeight').innerHTML=`${number(latest)}<span style="font-size:14px;font-weight:600"> kg</span>`;
    el('weightDiff').textContent=`${diff>0?'+':''}${number(diff)} kg`;
    const day=Math.max(1,Math.floor((parseDate(today())-parseDate(state.settings.startDate))/86400000)+1);el('dayCount').textContent=day;
    el('headerDate').textContent=dateFmt(today());
    el('startHeadline').textContent=`MON NOUVEAU DÉPART · ${new Intl.DateTimeFormat('fr-BE',{day:'numeric',month:'long',year:'numeric'}).format(parseDate(state.settings.startDate)).toLocaleUpperCase('fr-BE')}`;
    el('bedGoalLabel').textContent=state.settings.bedTarget.replace(':','h');
    refreshHabits();
  }
  function loadForm(){const e=current();el('entryDate').value=activeDate;el('entryDate').max=today();refreshScore();
    for(const [k,id] of Object.entries({sugar:'habitSugar',phone:'habitPhone',food:'habitFood',bed:'habitBed'}))el(id).checked=e.habits[k];
    for(const id of ['breakfast','lunch','dinner','snacks','bedtime','wake','note'])el(id).value=e[id];
    el('weight').value=e.weight===null?'':String(e.weight);el('savedMessage').classList.add('hidden');refreshSleep();refreshTotals();
  }
  function safeText(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
  function renderChart(id,points,range,maxTen=false){const svg=el(id);const W=320,H=180,L=28,R=10,T=20,B=28;const iw=W-L-R,ih=H-T-B;
    if(!points.length){svg.innerHTML='<text x="160" y="90" text-anchor="middle" fill="#819087" font-size="12">Tes premières données apparaîtront ici.</text>';return;}
    const values=points.map(p=>p.v);let min=maxTen?0:Math.min(...values),max=maxTen?10:Math.max(...values);if(min===max){min-=1;max+=1;}else if(!maxTen){const pad=(max-min)*.3;min-=pad;max+=pad;}const n=points.length;
    const xy=points.map((p,i)=>({x:L+(n===1?iw/2:i/(n-1)*iw),y:T+(max-p.v)/(max-min)*ih}));
    const grid=[0,.5,1].map(f=>{const y=T+f*ih;const v=max-f*(max-min);return `<line x1="${L}" y1="${y}" x2="${W-R}" y2="${y}" stroke="#e5eae1" stroke-dasharray="3,5"/><text x="${L-6}" y="${y+4}" text-anchor="end" font-size="9" fill="#839087">${number(v)}</text>`;}).join('');
    const poly=xy.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const area=xy.length>1?`<polygon points="${L},${T+ih} ${poly} ${W-R},${T+ih}" fill="#e5f7ce" opacity=".75"/>`:'';
    const line=xy.length>1?`<polyline points="${poly}" fill="none" stroke="#74a94d" stroke-width="3.3" stroke-linecap="round" stroke-linejoin="round"/>`:'';
    const circles=xy.map((p,i)=>`<circle cx="${p.x}" cy="${p.y}" r="${i===n-1?5:3.5}" fill="#2c6233" stroke="white" stroke-width="2"/>`).join('');
    const tickIndices=[0,Math.floor((n-1)/2),n-1].filter((v,i,a)=>a.indexOf(v)===i);
    const labels=tickIndices.map(i=>`<text x="${xy[i].x}" y="${H-8}" text-anchor="middle" font-size="10" fill="#839087">${points[i].d.slice(8,10)}/${points[i].d.slice(5,7)}</text>`).join('');
    svg.innerHTML=grid+area+line+circles+labels;
  }
  function streakDays(){let day=today(),count=0;for(let i=0;i<5000;i++){if(state.entries[day]){count++;const d=parseDate(day);d.setDate(d.getDate()-1);day=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}else if(i===0){const d=parseDate(day);d.setDate(d.getDate()-1);day=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}else break;}return count;}
  function renderStats(){el('weightChartNote').textContent=`Départ : ${number(state.settings.startWeight)} kg · ${state.settings.startDate.slice(8,10)}/${state.settings.startDate.slice(5,7)}/${state.settings.startDate.slice(0,4)}`;const dates=Object.keys(state.entries).sort();const arr=dates.map(d=>({d,...state.entries[d]}));const scored=arr.filter(e=>e.score!==null);const avg=scored.length?scored.reduce((s,e)=>s+e.score,0)/scored.length:null;const successes=arr.reduce((n,e)=>n+Object.values(e.habits).filter(Boolean).length,0);
    el('avgScore').textContent=avg===null?'—':number(avg);el('streak').textContent=`${streakDays()} j`;el('checkins').textContent=arr.length;el('goodHabits').textContent=arr.length?`${Math.round(successes/(arr.length*4)*100)} %`:'—';
    renderChart('moodChart',scored.slice(-15).map(e=>({d:e.d,v:e.score})),null,true);
    const weigh=[{d:state.settings.startDate,v:state.settings.startWeight}, ...arr.filter(e=>e.weight!==null&&e.d>=state.settings.startDate).map(e=>({d:e.d,v:e.weight}))].sort((a,b)=>a.d.localeCompare(b.d));renderChart('weightChart',weigh.slice(-15),null,false);
    el('history').innerHTML=arr.length?arr.reverse().map(e=>{const done=Object.values(e.habits).filter(Boolean).length;return `<button class="history-item" data-open-date="${safeText(e.d)}"><span class="date"><strong>${safeText(dateFmt(e.d))}</strong><small>${done}/4 habitudes · ${e.weight===null?'pas de poids':number(e.weight)+' kg'}</small></span><span class="rating">${e.score===null?'—':e.score}/10</span><span aria-hidden="true">›</span></button>`;}).join(''):'<div class="empty">Aucun bilan enregistré. Commence par renseigner ton ressenti aujourd’hui : ton historique se construira automatiquement.</div>';
    el('history').querySelectorAll('[data-open-date]').forEach(b=>b.addEventListener('click',()=>{activeDate=b.dataset.openDate;activate('todayPanel');loadForm();window.scrollTo({top:0,behavior:'smooth'});}));
  }
  function activate(id){document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active',p.id===id));document.querySelectorAll('.navbtn').forEach(b=>b.classList.toggle('selected',b.dataset.panel===id));if(id==='statsPanel')renderStats();if(id==='settingsPanel')showSettings();window.scrollTo({top:0,behavior:'smooth'});}
  function showSettings(){el('startDate').value=state.settings.startDate;el('startWeight').value=state.settings.startWeight;el('bedTarget').value=state.settings.bedTarget;}
  document.querySelectorAll('.navbtn').forEach(b=>b.addEventListener('click',()=>activate(b.dataset.panel)));
  el('entryDate').addEventListener('change',e=>{if(!safeDate(e.target.value)||e.target.value>today()){e.target.value=activeDate;return;}activeDate=e.target.value;loadForm();});
  el('score').addEventListener('input',e=>{updateField('score',Number(e.target.value));refreshScore();});
  for(const [k,id] of Object.entries({sugar:'habitSugar',phone:'habitPhone',food:'habitFood',bed:'habitBed'}))el(id).addEventListener('change',e=>updateHabit(k,e.target.checked));
  for(const id of ['breakfast','lunch','dinner','snacks','bedtime','wake','note'])el(id).addEventListener('input',e=>{updateField(id,e.target.value);if(id==='bedtime'||id==='wake')refreshSleep();});
  el('weight').addEventListener('change',e=>{if(e.target.value===''){updateField('weight',null);return;}const n=Number(e.target.value.replace(',','.'));if(!validWeight(n)){alert('Indique un poids valide entre 20 et 400 kg.');e.target.value=current().weight??'';return;}updateField('weight',n);});
  el('saveBtn').addEventListener('click',()=>{if(!state.entries[activeDate])state.entries[activeDate]=emptyEntry();store();refreshTotals();el('savedMessage').classList.remove('hidden');});
  el('startDate').addEventListener('change',e=>{if(safeDate(e.target.value)&&e.target.value<=today()){state.settings.startDate=e.target.value;store();refreshTotals();}else e.target.value=state.settings.startDate;});
  el('startWeight').addEventListener('change',e=>{const n=Number(e.target.value);if(validWeight(n)&&n!==0){state.settings.startWeight=n;store();refreshTotals();}else e.target.value=state.settings.startWeight;});
  el('bedTarget').addEventListener('change',e=>{if(/^([01]\d|2[0-3]):[0-5]\d$/.test(e.target.value)){state.settings.bedTarget=e.target.value;store();refreshTotals();}});
  el('exportBtn').addEventListener('click',()=>{const data=JSON.stringify({...state,exportDate:new Date().toISOString(),format:'cap-bien-etre-v1'},null,2);const blob=new Blob([data],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`CAP-sauvegarde-${today()}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);});
  el('importBtn').addEventListener('click',()=>el('importFile').click());
  el('importFile').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{const data=JSON.parse(await file.text());if(!data||typeof data!=='object'||!data.settings||!data.entries||Array.isArray(data.entries))throw Error('Fichier incompatible');if(!confirm('Importer remplacera les données actuellement enregistrées sur cet appareil. Continuer ?'))return;state=clean(data);store();activeDate=today();loadForm();activate('todayPanel');alert('Sauvegarde importée.');}catch(err){alert('Impossible de lire cette sauvegarde CAP.');}finally{e.target.value='';}});

  // API for the weight-focused dashboard. Existing diary storage is unchanged.
  window.CAP_API={
    read:()=>clean(state),
    addWeight:(d,v)=>{
      if(!safeDate(d)||d<state.settings.startDate||d>today()||!validWeight(v)||v===null)return false;
      const entry=state.entries[d]??emptyEntry();entry.weight=v;state.entries[d]=entry;
      store();refreshTotals();if(activeDate===d)loadForm();return true;
    },
    setHabitToday:(key,value)=>{
      if(!['sugar','phone','food','bed'].includes(key))return false;
      const d=today(),entry=state.entries[d]??emptyEntry();
      entry.habits[key]=Boolean(value);state.entries[d]=entry;store();refreshTotals();
      if(activeDate===d)loadForm();return true;
    },
    setGoalWeight:value=>{
      if(value!==null&&(!validWeight(value)||value>=state.settings.startWeight))return false;
      state.settings.goalWeight=value;store();return true;
    },
    openPanel:activate,
    openJournalDate:d=>{
      if(!safeDate(d)||d>today())return;
      activeDate=d;activate('todayPanel');loadForm();
    }
  };
  loadForm();if('serviceWorker' in navigator&&location.protocol.startsWith('http'))window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
})();
