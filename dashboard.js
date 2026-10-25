(() => {
  'use strict';
  const api=window.CAP_API;
  if(!api)return;
  const $=id=>document.getElementById(id);
  const n=v=>Number(v).toLocaleString('fr-BE',{maximumFractionDigits:1});
  const localToday=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
  const frDate=d=>new Intl.DateTimeFormat('fr-BE',{day:'numeric',month:'short',year:'numeric'}).format(new Date(d+'T12:00:00'));
  const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let period='all',type='bars',picked='';
  const markup=[
    '<section id="overviewPanel" class="panel active cap-dashboard">',
    '<div class="section-title"><div><h2>Ta progression</h2><p>Ton poids, tes tendances, tes efforts. Au même endroit.</p></div><span class="pill" id="capTrend">En cours</span></div>',
    '<div class="surface cap-graph-card">',
    '<div class="cap-metrics"><div class="cap-metric cap-dark"><small>POIDS ACTUEL</small><strong id="capLatest">—</strong><span id="capLatestDate">Dernière pesée</span></div><div class="cap-metric"><small>DEPUIS LE DÉPART</small><strong id="capTotal">—</strong><span id="capTotalText">Poids initial</span></div></div>',
    '<div class="cap-graph-heading"><strong>Ta courbe de poids</strong><div class="cap-chips" aria-label="Période"><button data-period="7">7j</button><button data-period="30">30j</button><button data-period="90">90j</button><button data-period="all" class="active">Tout</button></div></div>',
    '<svg id="capWeightSVG" viewBox="0 0 360 240" role="img" aria-label="Graphique interactif des poids enregistrés"></svg>',
    '<div class="cap-graph-bottom"><span id="capPlotCount">Tes pesées</span><div class="cap-chips" aria-label="Affichage"><button data-graph="bars" class="active">▮ Barres</button><button data-graph="line">⌁ Courbe</button></div></div>',
    '<div class="cap-selected" id="capSelected" role="status">Touche une barre pour voir le détail.</div>',
    '<div class="cap-caption">L’échelle verticale est ajustée pour rendre les petites variations visibles. Une fluctuation ponctuelle est normale.</div>',
    '</div>',
    '<div class="section-title"><div><h2>Ajouter une pesée</h2><p>15 secondes pour mettre à jour ta progression.</p></div></div>',
    '<form class="surface cap-entry" id="capWeighForm"><div class="cap-entry-grid"><div class="field"><label for="capWeighValue">Poids (kg)</label><input type="number" inputmode="decimal" step="0.1" min="20" max="400" id="capWeighValue" placeholder="Ex. 105,5" required></div><div class="field"><label for="capWeighDate">Date</label><input type="date" id="capWeighDate" required></div></div><button class="primary" type="submit">+ Enregistrer ma pesée</button><div id="capWeighSaved" class="notice hidden" role="status"></div></form>',
    '<div class="section-title"><div><h2>Mon objectif</h2><p>Visualise le chemin parcouru, à ton rythme.</p></div></div>',
    '<div class="surface cap-goal"><div class="cap-goal-head"><div><strong id="capGoalTitle">À définir</strong><div class="small-text" id="capGoalDesc">Définis ton poids cible dans les réglages.</div></div><button class="cap-goal-btn" id="capGoalGo" type="button">Modifier →</button></div><div class="cap-goal-track"><span id="capGoalBar"></span></div><div id="capGoalInfo" class="small-text">Objectif facultatif</div></div>',
    '<div class="section-title"><div><h2>Mes engagements du jour</h2><p>Tu peux aussi les cocher directement ici.</p></div><span id="capHabitCount" class="pill">0/4</span></div>',
    '<div class="cap-habit-grid"><button data-cap-habit="sugar" type="button" aria-pressed="false">🥤 Sans boisson sucrée</button><button data-cap-habit="phone" type="button" aria-pressed="false">📵 Pas de scroll après 22h</button><button data-cap-habit="food" type="button" aria-pressed="false">🥗 Repas équilibrés</button><button data-cap-habit="bed" type="button" aria-pressed="false">🌙 Coucher régulier</button></div>',
    '<div class="section-title"><h2>Ton suivi en bref</h2></div>',
    '<div class="cap-mini-kpis"><div class="surface"><strong id="capNumWeigh">0</strong><small>Pesées enregistrées</small></div><div class="surface"><strong id="capNumDays">0</strong><small>Jours avec un bilan</small></div></div>',
    '<div class="section-title"><div><h2>Dernières pesées</h2><p>Touche une pesée pour retrouver son bilan.</p></div><button class="cap-link" id="capFullHistory" type="button">Historique ↗</button></div>',
    '<div id="capRecent"></div><button type="button" class="secondary" id="capJournalGo">Ouvrir mon journal →</button>',
    '</section>'
  ].join('');
  document.querySelector('.hero').insertAdjacentHTML('afterend',markup);
  const nav=document.querySelector('.tabs-inner');
  nav.insertAdjacentHTML('afterbegin','<button class="navbtn" data-panel="overviewPanel" aria-label="Accueil" type="button"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="5" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="10" width="8" height="11" rx="1"/></svg>Accueil</button>');
  nav.style.gridTemplateColumns='repeat(4,1fr)';
  nav.style.gap='3px';
  const goalInput='<div class="field cap-setting-goal"><label for="capGoalInput">Mon objectif de poids (kg) · facultatif</label><input id="capGoalInput" type="number" inputmode="decimal" min="20" max="400" step="0.1" placeholder="Ex. : 95"><div class="small-text">Un objectif personnel, modifiable à tout moment.</div></div>';
  $('startWeight').closest('.field').insertAdjacentHTML('afterend',goalInput);
  $('capWeighDate').value=localToday();
  $('capWeighDate').max=localToday();
  const records=()=>{
    const data=api.read(),all=new Map([[data.settings.startDate,{d:data.settings.startDate,v:data.settings.startWeight,baseline:true}]]);
    Object.keys(data.entries).forEach(d=>{
      const w=data.entries[d].weight;
      if(d>=data.settings.startDate&&d<=localToday()&&typeof w==='number'&&Number.isFinite(w)&&w>0)all.set(d,{d,v:w,baseline:false});
    });
    return Array.from(all.values()).sort((a,b)=>a.d.localeCompare(b.d));
  };
  function chart(all){
    let list=all;
    if(period!=='all'){
      const cutoff=new Date(localToday()+'T12:00:00');
      cutoff.setDate(cutoff.getDate()-Number(period)+1);
      const yy=cutoff.getFullYear(),mm=String(cutoff.getMonth()+1).padStart(2,'0'),dd=String(cutoff.getDate()).padStart(2,'0');
      list=all.filter(p=>p.d>=yy+'-'+mm+'-'+dd);
    }
    document.querySelectorAll('[data-period]').forEach(b=>b.classList.toggle('active',b.dataset.period===period));
    document.querySelectorAll('[data-graph]').forEach(b=>b.classList.toggle('active',b.dataset.graph===type));
    $('capPlotCount').textContent=list.length+(list.length>1?' pesées':' pesée')+(list.length>16?' · 16 dernières affichées':'');
    if(!list.length){
      $('capWeightSVG').innerHTML='<text x="180" y="110" text-anchor="middle" fill="#66786b" font-size="13">Aucune pesée pendant cette période.</text><text x="180" y="133" text-anchor="middle" fill="#8b978d" font-size="11">Sélectionne « Tout » ou ajoute une mesure.</text>';
      $('capSelected').textContent='Aucune mesure sur la période choisie.';
      return;
    }
    const shown=list.slice(-16),W=360,H=240,L=36,R=13,T=22,B=36;
    const low=Math.min(...shown.map(p=>p.v)),high=Math.max(...shown.map(p=>p.v));
    const pad=Math.max(1,(high-low)*0.28), min=low-pad,max=high+pad;
    const iw=W-L-R,ih=H-T-B, px=i=>L+(i+.5)*iw/shown.length,py=v=>T+(max-v)*ih/(max-min);
    let svg='';
    for(let i=0;i<4;i++){
      const yy=T+i*ih/3,v=max-i*(max-min)/3;
      svg+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+yy+'" y2="'+yy+'" stroke="#e2eadd" stroke-dasharray="4 5"/>';
      svg+='<text x="'+(L-5)+'" y="'+(yy+4)+'" text-anchor="end" font-size="10" fill="#768578">'+n(v)+'</text>';
    }
    if(type==='bars'){
      const bw=Math.min(32,Math.max(9,iw/shown.length*.60));
      shown.forEach((p,i)=>{
        const cx=px(i),top=py(p.v);
        svg+='<rect data-cap-date="'+p.d+'" x="'+(cx-bw/2)+'" y="'+top+'" width="'+bw+'" height="'+(T+ih-top)+'" rx="5" fill="'+(p.d===picked?'#285a37':'#94cc70')+'"><title>'+n(p.v)+' kg le '+frDate(p.d)+'</title></rect>';
        svg+='<circle data-cap-date="'+p.d+'" cx="'+cx+'" cy="'+top+'" r="4" fill="#285a37"/>';
      });
    }else{
      const d=shown.map((p,i)=>(i?'L':'M')+px(i).toFixed(1)+' '+py(p.v).toFixed(1)).join(' ');
      if(shown.length>1)svg+='<path d="'+d+'" fill="none" stroke="#619f43" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>';
      shown.forEach((p,i)=>{svg+='<circle data-cap-date="'+p.d+'" cx="'+px(i)+'" cy="'+py(p.v)+'" r="9" fill="transparent"/><circle data-cap-date="'+p.d+'" cx="'+px(i)+'" cy="'+py(p.v)+'" r="4.5" fill="#285a37" stroke="#fff" stroke-width="2"><title>'+n(p.v)+' kg le '+frDate(p.d)+'</title></circle>';});
    }
    [0,Math.floor((shown.length-1)/2),shown.length-1].filter((v,i,a)=>a.indexOf(v)===i).forEach(i=>svg+='<text x="'+px(i)+'" y="228" text-anchor="middle" font-size="10" fill="#758677">'+shown[i].d.slice(8)+'/'+shown[i].d.slice(5,7)+'</text>');
    $('capWeightSVG').innerHTML=svg;
    const item=list.find(p=>p.d===picked)||list[list.length-1],at=all.findIndex(p=>p.d===item.d),prev=at>0?all[at-1]:null;
    $('capSelected').innerHTML='<span>'+safe(frDate(item.d))+(item.baseline?' · Départ':'')+'</span><strong>'+n(item.v)+' kg'+(prev?' · '+(item.v-prev.v>0?'+':'')+n(item.v-prev.v)+' kg':'')+'</strong>';
  }
  function render(){
    const d=api.read(),all=records(),last=all[all.length-1],start=d.settings.startWeight,diff=last.v-start;
    $('capLatest').innerHTML=n(last.v)+' <small>kg</small>';
    $('capLatestDate').textContent=last.baseline?'Poids de départ':frDate(last.d);
    $('capTotal').textContent=(diff>0?'+':'')+n(diff)+' kg';
    $('capTotalText').textContent=diff<0?'Perdus depuis le départ':diff>0?'Variation totale':'Poids de départ';
    $('capTrend').textContent=diff<0?'↘ '+n(-diff)+' kg':diff>0?'↗ '+n(diff)+' kg':'Suivi en cours';
    $('capNumWeigh').textContent=all.filter(p=>!p.baseline).length;
    $('capNumDays').textContent=Object.keys(d.entries).filter(day=>day>=d.settings.startDate&&day<=localToday()).length;
    $('capWeighDate').min=d.settings.startDate;
    const goal=d.settings.goalWeight,hasGoal=typeof goal==='number'&&goal<start&&goal>0;
    const completed=hasGoal?Math.max(0,Math.min(100,(start-last.v)/(start-goal)*100)):0;
    $('capGoalTitle').textContent=hasGoal?n(goal)+' kg · objectif':'Choisis ton poids cible';
    $('capGoalDesc').textContent=hasGoal?n(Math.max(0,last.v-goal))+' kg restants à atteindre':'Tu peux fixer ton objectif dans les réglages.';
    $('capGoalBar').style.width=completed+'%';
    $('capGoalInfo').textContent=hasGoal?Math.round(completed)+' % du chemin depuis '+n(start)+' kg.':'L’objectif est facultatif.';
    $('capGoalInput').value=hasGoal?goal:'';
    const habits=d.entries[localToday()]?.habits||{sugar:false,phone:false,food:false,bed:false};
    $('capHabitCount').textContent=Object.values(habits).filter(Boolean).length+'/4';
    document.querySelectorAll('[data-cap-habit]').forEach(b=>b.setAttribute('aria-pressed',String(Boolean(habits[b.dataset.capHabit]))));
    $('capRecent').innerHTML=all.slice().reverse().slice(0,5).map(p=>'<button class="history-item" type="button" data-cap-history="'+p.d+'"><span class="date"><strong>'+safe(frDate(p.d))+'</strong><small>'+(p.baseline?'Départ':'Pesée enregistrée')+'</small></span><span class="rating">'+n(p.v)+' kg</span><span>›</span></button>').join('');
    chart(all);
  }
  document.querySelectorAll('[data-period]').forEach(b=>b.addEventListener('click',()=>{period=b.dataset.period;picked='';chart(records());}));
  document.querySelectorAll('[data-graph]').forEach(b=>b.addEventListener('click',()=>{type=b.dataset.graph;chart(records());}));
  $('capWeightSVG').addEventListener('click',e=>{const target=e.target.closest('[data-cap-date]');if(target){picked=target.getAttribute('data-cap-date');chart(records());}});
  $('capWeighForm').addEventListener('submit',e=>{
    e.preventDefault();
    const v=Number($('capWeighValue').value.replace(',','.')),date=$('capWeighDate').value;
    if(!Number.isFinite(v)||v<20||v>400||!api.addWeight(date,v)){alert('Vérifie le poids et la date de pesée.');return;}
    picked=date;$('capWeighValue').value='';$('capWeighSaved').classList.remove('hidden');
    $('capWeighSaved').textContent='✓ '+n(v)+' kg enregistrés pour le '+frDate(date)+'.';
    render();
  });
  document.querySelectorAll('[data-cap-habit]').forEach(b=>b.addEventListener('click',()=>{
    api.setHabitToday(b.dataset.capHabit,b.getAttribute('aria-pressed')!=='true');render();
  }));
  $('capRecent').addEventListener('click',e=>{const row=e.target.closest('[data-cap-history]');if(row)api.openJournalDate(row.dataset.capHistory);});
  $('capFullHistory').addEventListener('click',()=>api.openPanel('statsPanel'));
  $('capJournalGo').addEventListener('click',()=>api.openJournalDate(localToday()));
  $('capGoalGo').addEventListener('click',()=>{api.openPanel('settingsPanel');$('capGoalInput').focus();});
  $('capGoalInput').addEventListener('change',e=>{
    const raw=e.target.value.trim().replace(',','.'),v=raw===''?null:Number(raw);
    if(v!==null&&(!Number.isFinite(v)||v<20||v>400)){alert('Entre un objectif de poids valide.');return;}
    if(!api.setGoalWeight(v)){alert('L’objectif doit être inférieur au poids de départ.');return;}
    render();
  });
  nav.querySelector('[data-panel="overviewPanel"]').addEventListener('click',()=>{api.openPanel('overviewPanel');render();});
  document.querySelectorAll('.navbtn').forEach(b=>{if(b.dataset.panel!=='overviewPanel')b.addEventListener('click',()=>{if(b.dataset.panel==='settingsPanel')$('capGoalInput').value=api.read().settings.goalWeight??'';});});
  document.addEventListener('change',e=>{
    if(['entryDate','weight','startWeight','startDate','importFile'].includes(e.target.id))setTimeout(render,0);
  });
  render();api.openPanel('overviewPanel');
})();