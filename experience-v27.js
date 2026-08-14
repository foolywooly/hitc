(() => {
  'use strict';
  const q=(s,r=document)=>r.querySelector(s);
  const qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,Number(n)||0));
  const body=document.body;
  const release=window.HITC_RELEASE || {currentChapter:0,seasonalEvent:'auto'};
  const animations=window.HITC_ANIMATIONS || {};
  const audioApi=window.HITC_AUDIO_API || {};
  const audioState=window.HITC_AUDIO_STATE || {music:1,environment:1,ui:1};
  const reduceQuery=window.matchMedia('(prefers-reduced-motion: reduce)');
  const isReduced=()=>reduceQuery.matches || body.classList.contains('user-reduced-motion');

  const save=(k,v)=>{try{localStorage.setItem(k,typeof v==='string'?v:JSON.stringify(v));}catch(_){}};
  const load=(k,fallback='')=>{try{const v=localStorage.getItem(k);return v===null?fallback:v;}catch(_){return fallback;}};
  const loadJSON=(k,fallback)=>{try{const v=JSON.parse(localStorage.getItem(k));return v??fallback;}catch(_){return fallback;}};

  // -----------------------------------------------------------------------
  // 01 / The site is a directed day on Hisano, not an archive application.
  // -----------------------------------------------------------------------
  const sectionMeta={
    top:{n:'00',label:'HOME',weather:['☀','Hisano · Morning calm'],phase:'morning'},
    story:{n:'01',label:'STORY',weather:['☁','Hisano · High cloud'],phase:'morning'},
    characters:{n:'02',label:'CHARACTERS',weather:['◌','Hisano · Garden breeze'],phase:'late-morning'},
    hisano:{n:'03',label:'HISANO',weather:['≋','Hisano · Sea wind'],phase:'afternoon'},
    history:{n:'04',label:'HISTORY',weather:['◌','Hisano · Pressure steady'],phase:'golden'},
    gallery:{n:'05',label:'GALLERY',weather:['◌','Hisano · Light falling'],phase:'golden'},
    preview:{n:'06',label:'READ',weather:['☁','Hisano · Dusk gathering'],phase:'dusk'},
    updates:{n:'07',label:'UPDATES',weather:['◌','Hisano · Visibility soft'],phase:'blue'},
    about:{n:'08',label:'ABOUT',weather:['✦','Hisano · After sunset'],phase:'night'},
    'chapter-one':{n:'09',label:'CHAPTER 01',weather:['✦','Hisano · Night'],phase:'night'}
  };
  const sectionEls=Object.keys(sectionMeta).map(id=>q(`#${id}`)).filter(Boolean);
  let currentSection='top';
  const memory=q('#section-memory');
  const weather=q('#weather-indicator');
  const weatherDot=q('.weather-indicator-dot',weather);
  const weatherText=q('.weather-indicator-text',weather);
  const progressFill=q('#site-progress-fill');
  const progressLabel=q('#site-progress-label');

  function setCurrentSection(id){
    if(!sectionMeta[id]) return;
    currentSection=id;
    body.dataset.currentSection=id;
    const m=sectionMeta[id];
    if(memory) memory.innerHTML=`<span>${m.n}</span> / ${m.label}`;
    if(weatherDot) weatherDot.textContent=m.weather[0];
    if(weatherText) weatherText.textContent=m.weather[1];
    if(progressLabel) progressLabel.textContent=m.label;
    sectionEls.forEach(el=>el.classList.toggle('is-current-scene',el.id===id));
    qa('.nav-primary a').forEach(a=>{
      const target=(a.getAttribute('href')||'').slice(1);
      a.classList.toggle('is-context',target===id);
    });
    save('hitc-last-section-v25',id);
  }
  if('IntersectionObserver' in window){
    const obs=new IntersectionObserver(entries=>{
      const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
      if(visible) setCurrentSection(visible.target.id);
    },{threshold:[.2,.38,.58],rootMargin:'-72px 0px -25% 0px'});
    sectionEls.forEach(el=>obs.observe(el));
  }

  // Smooth narrative darkness: starts immediately, ends almost black, always behind UI.
  let visualJourney=0, journeyTarget=0, journeyFrame=0, lastScrollY=window.scrollY;
  function calculateJourney(){
    const max=Math.max(1,document.documentElement.scrollHeight-innerHeight);
    journeyTarget=clamp(window.scrollY/max);
    if(!journeyFrame) journeyFrame=requestAnimationFrame(animateJourney);
  }
  function animateJourney(){
    const goingUp=journeyTarget<visualJourney;
    const alpha=isReduced()?1:(goingUp?.19:.075);
    visualJourney += (journeyTarget-visualJourney)*alpha;
    if(Math.abs(journeyTarget-visualJourney)<.0006) visualJourney=journeyTarget;
    const dusk=.012 + Math.pow(visualJourney,1.42)*.978;
    body.style.setProperty('--scroll-dusk',dusk.toFixed(4));
    body.style.setProperty('--journey',visualJourney.toFixed(4));
    body.style.setProperty('--journey-percent',`${(visualJourney*100).toFixed(2)}%`);
    if(progressFill) progressFill.style.height=`${Math.max(2,visualJourney*100)}%`;
    const start=10*60+18, end=20*60+7;
    const min=Math.round(start+(end-start)*visualJourney);
    const clock=q('#hisano-clock'); if(clock) clock.textContent=`${String(Math.floor(min/60)).padStart(2,'0')}:${String(min%60).padStart(2,'0')}`;
    const phase=visualJourney<.16?'morning':visualJourney<.34?'late-morning':visualJourney<.51?'afternoon':visualJourney<.66?'golden':visualJourney<.79?'dusk':visualJourney<.9?'blue':'night';
    body.dataset.dayPhase=phase;
    body.classList.toggle('deep-hisano',visualJourney>.68);
    body.classList.toggle('hisano-night',visualJourney>.88);
    updateWeatherJournal(visualJourney);
    if(Math.abs(journeyTarget-visualJourney)>.0006) journeyFrame=requestAnimationFrame(animateJourney); else journeyFrame=0;
  }
  function updateWeatherJournal(p){
    const journal=q('#journal-weather'); if(!journal) return;
    let text='pressure steady / wind east';
    if(p>.28) text='sea breeze / pressure steady';
    if(p>.52) text='pressure falling / light unchanged';
    if(p>.70) text='visibility soft / forecast unchanged';
    if(p>.84) text='clear sky / pressure still falling';
    if(p>.94) text='forecast nominal / reading inconsistent';
    journal.textContent=text;
    const date=q('#journal-date'); if(date) date.textContent='13.08.2026';
  }
  window.addEventListener('scroll',()=>{lastScrollY=window.scrollY;calculateJourney();},{passive:true});
  window.addEventListener('resize',calculateJourney,{passive:true});
  calculateJourney();

  // Very small depth motion from the supplied watercolor only.
  function updateParallax(){
    if(isReduced()) return;
    const y=visualJourney;
    body.style.setProperty('--parallax-back-y',`${(y*-7).toFixed(2)}px`);
    body.style.setProperty('--parallax-mid-y',`${(y*-13).toFixed(2)}px`);
    body.style.setProperty('--parallax-front-y',`${(y*-20).toFixed(2)}px`);
  }
  window.setInterval(updateParallax,180);

  // -----------------------------------------------------------------------
  // 02 / Full intro every time + useful preload + returning detail.
  // -----------------------------------------------------------------------
  const preload=[
    'assets/decorations/site-ambient-background.png','assets/characters/aoko.png',
    'assets/characters/momoka-tachibana.png','assets/world/hisano-map.png'
  ];
  const loadFill=q('#opening-load-fill');
  let loaded=0;
  preload.forEach(src=>{const im=new Image();const done=()=>{loaded++;if(loadFill)loadFill.style.width=`${loaded/preload.length*100}%`;};im.onload=im.onerror=done;im.src=src;});
  let visits=Number(load('hitc-visit-count-v25','0'))||0; visits++; save('hitc-visit-count-v25',String(visits));
  const returnDetail=q('#opening-return-detail');
  if(returnDetail && visits>1){
    const mapCount=loadJSON('hitc-map-discovery',[]).length;
    returnDetail.textContent=mapCount>=10?'HISANO REMEMBERS YOUR ROUTE':visits>3?'ANOTHER DAY ON HISANO':'RETURNING TO HISANO';
  }
  const skip=q('#skip-intro');
  const finishIntro=()=>skip?.click();
  document.addEventListener('keydown',e=>{
    if(!q('#opening-sequence')) return;
    if(['Escape','Enter',' '].includes(e.key)){e.preventDefault();finishIntro();}
  });

  // -----------------------------------------------------------------------
  // 03 / Compact, stable header behavior.
  // -----------------------------------------------------------------------
  const header=q('.site-header'); let prevY=scrollY;
  window.addEventListener('scroll',()=>{
    if(!header)return;const y=scrollY;
    header.classList.toggle('is-compact',y>160&&y>prevY+2);
    if(y<110||y<prevY-7) header.classList.remove('is-compact');
    prevY=y;
  },{passive:true});

  // -----------------------------------------------------------------------
  // 04 / Settings, mute-all, performance and resume.
  // -----------------------------------------------------------------------
  const drawer=q('#control-drawer'), settingsOpen=q('#settings-open');
  function openDrawer(){if(!drawer)return;drawer.hidden=false;requestAnimationFrame(()=>drawer.classList.add('is-open'));settingsOpen?.setAttribute('aria-expanded','true');}
  function closeDrawer(){if(!drawer)return;drawer.classList.remove('is-open');settingsOpen?.setAttribute('aria-expanded','false');setTimeout(()=>{if(!drawer.classList.contains('is-open'))drawer.hidden=true;},180);}
  settingsOpen?.addEventListener('click',()=>drawer?.hidden?openDrawer():closeDrawer());
  q('#settings-close')?.addEventListener('click',closeDrawer);
  const ranges=[['music-volume','music-volume-output','music','setMusicLevel'],['environment-volume','environment-volume-output','environment','setEnvironmentLevel'],['ui-volume','ui-volume-output','ui','setUiLevel']];
  ranges.forEach(([id,out,key,method])=>{const input=q(`#${id}`),output=q(`#${out}`);if(!input)return;input.value=Math.round(clamp(audioState[key])*100);if(output)output.textContent=`${input.value}%`;input.addEventListener('input',()=>{const v=clamp(input.value/100);if(output)output.textContent=`${input.value}%`;audioApi[method]?.(v);});});
  const reduced=q('#reduced-motion-toggle'); if(reduced){const saved=load('hitc-user-reduced-motion')==='true';reduced.checked=saved;body.classList.toggle('user-reduced-motion',saved);reduced.addEventListener('change',()=>{body.classList.toggle('user-reduced-motion',reduced.checked);save('hitc-user-reduced-motion',String(reduced.checked));});}
  q('#restart-intro')?.addEventListener('click',()=>{location.hash='#top';location.reload();});
  q('#reset-discoveries')?.addEventListener('click',()=>{if(q('#reset-discoveries').dataset.armed!=='1'){q('#reset-discoveries').dataset.armed='1';q('#reset-discoveries').textContent='Click again to confirm';setTimeout(()=>{const b=q('#reset-discoveries');if(b){b.dataset.armed='0';b.textContent='Reset map stamps';}},2800);return;}localStorage.removeItem('hitc-map-discovery');location.reload();});

  const mute=q('#mute-all');
  mute?.addEventListener('click',()=>{
    const sound=q('#sound-toggle'),music=q('#music-toggle');
    const muted=mute.getAttribute('aria-pressed')==='true';
    if(!muted){
      if(sound?.getAttribute('aria-pressed')!=='true') sound.click();
      if(music?.getAttribute('aria-pressed')!=='true') music.click();
    }else{
      if(sound?.getAttribute('aria-pressed')==='true') sound.click();
      if(music?.getAttribute('aria-pressed')==='true') music.click();
    }
    mute.setAttribute('aria-pressed',String(!muted));
    const label=q('.mute-all-label',mute);if(label)label.textContent=!muted?'Unmute':'Mute';
  });

  // Performance: preserve smoothness rather than forcing effects.
  const lite=(navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=4)||(navigator.deviceMemory&&navigator.deviceMemory<=4);
  body.classList.toggle('performance-lite',!!lite);
  const perf=q('#performance-status'); if(perf)perf.textContent=`Performance · Auto / ${lite?'Lite':'Full'}`;

  // Resume is optional and never replaces the full intro.
  const resume=q('#resume-visit');
  const last=load('hitc-last-section-v25','top');
  if(resume&&visits>1&&last!=='top'){
    const label=q('#resume-visit-label');if(label)label.textContent=`Return to ${sectionMeta[last]?.label||'Hisano'}`;
    setTimeout(()=>{resume.hidden=false;requestAnimationFrame(()=>resume.classList.add('is-visible'));},2900);
  }
  q('#resume-visit-go')?.addEventListener('click',()=>{q(`#${last}`)?.scrollIntoView({behavior:isReduced()?'auto':'smooth'});resume?.classList.remove('is-visible');});
  q('#resume-visit-dismiss')?.addEventListener('click',()=>{resume?.classList.remove('is-visible');setTimeout(()=>{if(resume)resume.hidden=true;},180);});

  // -----------------------------------------------------------------------
  // 05 / Character presence + elegant profile / relations / notes.
  // -----------------------------------------------------------------------
  const relationshipData={
    aoko:[
      {code:'02',name:'Momoka',jp:'橘 桃花',text:'She asks questions I would rather leave unanswered. Somehow, that also makes the room feel less quiet.'},
      {code:'03',name:'Renji',jp:'転校生',text:'He looks at the rules as though someone has merely forgotten to challenge them.'}
    ],
    momoka:[
      {code:'01',name:'Aoko',jp:'青子',text:'She notices every storm before it arrives, but never admits when one is already inside the room.'},
      {code:'03',name:'Renji',jp:'転校生',text:'Terrible at leaving a mystery alone. Conveniently, so am I.'}
    ],
    renji:[
      {code:'01',name:'Aoko',jp:'青子',text:'Everyone speaks about what she can do before they speak about who she is.'},
      {code:'02',name:'Momoka',jp:'橘 桃花',text:'She grins whenever something stops making sense. I am beginning to understand why.'}
    ]
  };
  const noteData={
    aoko:'Design note / calm silhouettes, restrained gesture, weather held at the edge rather than performed.',
    momoka:'Design note / an investigative energy that breaks the island’s careful stillness.',
    renji:'Design note / the outsider’s file remains visually incomplete until final character art arrives.'
  };

  function softlySetNatureVolume(target, duration=300){
    const nature=q('#character-nature');
    if(!nature || nature.paused) return;
    const start=Number.isFinite(nature.volume)?nature.volume:0;
    const began=performance.now();
    const step=now=>{
      const p=Math.min(1,(now-began)/duration);
      const e=1-Math.pow(1-p,3);
      nature.volume=start+(target-start)*e;
      if(p<1)requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  qa('.character-profile[data-character]').forEach(profile=>{
    const copy=q('.character-copy',profile),key=profile.dataset.character;if(!copy)return;
    const existing=[...copy.children].map(n=>n.cloneNode(true));
    const currentName=(q('h3',profile)?.textContent||key).trim().split(' ')[0];
    const currentCode=key==='aoko'?'01':key==='momoka'?'02':'03';
    const relations=relationshipData[key]||[];

    const sub=document.createElement('div');
    sub.className='character-subnav';
    sub.innerHTML='<button class="is-active" data-char-view="profile" data-ui-family="paper" type="button">Profile</button><button data-char-view="relations" data-ui-family="paper" type="button">Relations</button><button data-char-view="notes" data-ui-family="paper" type="button">Notes</button>';

    const stage=document.createElement('div');stage.className='character-copy-stage';
    const profilePanel=document.createElement('div');profilePanel.dataset.charPanel='profile';profilePanel.className='character-copy-panel is-active';existing.forEach(n=>profilePanel.appendChild(n));

    const rel=document.createElement('div');
    rel.dataset.charPanel='relations';rel.className='character-copy-panel character-relations-panel';rel.hidden=true;
    rel.innerHTML=`
      <div class="relationship-spread">
        <header class="relationship-spread-head">
          <span>RELATIONSHIP STUDY / ${currentCode}</span>
          <small>彼らを結ぶもの</small>
        </header>
        <div class="relationship-current">
          <span>${currentCode} / PERSPECTIVE</span>
          <strong>${currentName}</strong>
        </div>
        <div class="relationship-connections">
          ${relations.map((r,i)=>`<article class="relationship-entry" data-relation-index="0${i+1}">
            <div class="relationship-name"><span>${r.code}</span><strong>${r.name}</strong><small>${r.jp}</small></div>
            <i aria-hidden="true"></i>
            <p>${r.text}</p>
          </article>`).join('')}
        </div>
        <footer><span>HISANO CHARACTER FILE</span><em>Relations are recorded from ${currentName}'s point of view.</em></footer>
      </div>`;

    const notes=document.createElement('div');notes.dataset.charPanel='notes';notes.className='character-copy-panel character-notes-panel';notes.hidden=true;notes.innerHTML=`<span>PRODUCTION NOTE / ${key.toUpperCase()}</span><p>${noteData[key]||''}</p><small>Character presentation can evolve with future chapter releases without changing the sheet geometry.</small>`;
    copy.innerHTML='';copy.append(sub,stage);stage.append(profilePanel,rel,notes);

    sub.addEventListener('click',e=>{
      const b=e.target.closest('[data-char-view]');if(!b)return;
      qa('button',sub).forEach(x=>x.classList.toggle('is-active',x===b));
      qa('[data-char-panel]',stage).forEach(p=>{const on=p.dataset.charPanel===b.dataset.charView;p.hidden=!on;p.classList.toggle('is-active',on);});
      profile.classList.toggle('is-relations-open',b.dataset.charView==='relations');
      const base=.145*(audioState.environment??1);
      softlySetNatureVolume(b.dataset.charView==='relations'?base*.78:base,360);
    });
  });
  qa('.character-tab').forEach(tab=>tab.addEventListener('click',()=>{
    save('hitc-last-character-v25',tab.dataset.characterTarget||'aoko-profile');
    history.replaceState(null,'',`#character/${(tab.dataset.characterTarget||'aoko-profile').replace('-profile','')}`);
    const base=.145*(audioState.environment??1);softlySetNatureVolume(base,260);
  }));
  const storedChar=load('hitc-last-character-v25',''); if(storedChar){const t=q(`.character-tab[data-character-target="${storedChar}"]`); if(t)setTimeout(()=>t.click(),40);}

  // One subtle presence effect: artwork breathes by 1px, no synthetic rain.
  const characterSection=q('#characters');
  characterSection?.addEventListener('pointermove',e=>{if(isReduced())return;const r=characterSection.getBoundingClientRect();const x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;body.style.setProperty('--character-presence-x',`${(x*1.5).toFixed(2)}px`);body.style.setProperty('--character-presence-y',`${(y*1.2).toFixed(2)}px`);});

  // -----------------------------------------------------------------------
  // 06 / Full-screen Hisano map room, map-only discovery, passport.
  // -----------------------------------------------------------------------
  const room=q('#map-room-overlay'),roomCanvas=q('#map-room-canvas'),roomNote=q('#map-room-note');
  if(roomCanvas){
    qa('.map-hotspot').forEach(source=>{
      const b=document.createElement('button');b.type='button';b.className='map-room-hotspot';b.style.cssText=source.getAttribute('style')||'';b.dataset.location=source.dataset.location;b.setAttribute('aria-label',source.getAttribute('aria-label')||source.dataset.location);b.innerHTML='<i></i><span>'+((source.querySelector('span')?.textContent)||source.dataset.location)+'</span>';roomCanvas.appendChild(b);
      b.addEventListener('click',()=>{source.click();setTimeout(()=>{if(roomNote)roomNote.innerHTML=`<span>LOCATION FILE / ${source.querySelector('span')?.textContent||''}</span><h3>${q('#map-info-title')?.textContent||''}</h3><p>${q('#map-public-record p')?.textContent||''}</p><button type="button" data-room-return>View on main map ↙</button>`;},30);});
    });
    roomNote?.addEventListener('click',e=>{if(!e.target.closest('[data-room-return]'))return;closeMapRoom();q('#hisano')?.scrollIntoView({behavior:isReduced()?'auto':'smooth'});});
  }
  function openMapRoom(){if(!room)return;room.hidden=false;requestAnimationFrame(()=>room.classList.add('is-open'));body.classList.add('modal-open');}
  function closeMapRoom(){if(!room)return;room.classList.remove('is-open');body.classList.remove('modal-open');setTimeout(()=>{if(!room.classList.contains('is-open'))room.hidden=true;},220);}
  q('#map-room-open')?.addEventListener('click',openMapRoom);q('#map-room-close')?.addEventListener('click',closeMapRoom);

  const passport=q('#passport-overlay');
  function renderPassport(){const wrap=q('#passport-stamps');if(!wrap)return;const found=new Set(loadJSON('hitc-map-discovery',[]));const labels={northern:'Northern Wilds',shrine:'Hisano Shrine',aoko:"Aoko's House",heights:'Hinomiya Heights',school:'High School',town:'Town Center',resort:'Shiomi Resort',solar:'Solar Fields',port:'Higashi Port',beaches:'Southern Beaches'};wrap.innerHTML=Object.entries(labels).map(([k,v])=>`<div class="passport-stamp ${found.has(k)?'is-found':''}"><span>${found.has(k)?'✦':'○'}</span><strong>${v}</strong></div>`).join('');const pr=q('#passport-progress');if(pr)pr.textContent=`${found.size} / 10 FIELD STAMPS`;}
  q('#passport-open')?.addEventListener('click',()=>{renderPassport();if(passport)passport.hidden=false;});
  q('#passport-overlay [data-close-overlay]')?.addEventListener('click',()=>{if(passport)passport.hidden=true;});

  // Then / now direct comparison; main map is never filtered or altered.
  const thenRange=q('#then-now-range'),thenStage=q('#then-now-stage');
  thenRange?.addEventListener('input',()=>thenStage?.style.setProperty('--then-reveal',`${thenRange.value}%`));

  // Tourism map links use the main map, no gating.


  const periodMap=window.HITC_PERIOD_ASSETS?.hisano2011;
  if(periodMap){const histImg=q('.then-now-historical>img');if(histImg){const probe=new Image();probe.onload=()=>{histImg.src=periodMap;histImg.style.opacity='1';histImg.style.filter='none';q('.then-now-reconstruction-wash')?.remove();qa('.then-tag').forEach(x=>x.hidden=true);};probe.src=periodMap;}}

  // -----------------------------------------------------------------------
  // 07 / Hisano calendar is a real, direct calendar — no archive dependency.
  // -----------------------------------------------------------------------
  const calendar=q('#island-calendar-inline'),calDetail=q('#calendar-detail-inline');
  const calEvents={
    '2026-04-06':['Spring term begins','Hisano High / school year','Students return to Hisano High for the first term of the 2026 school year.'],
    '2026-06-14':['Rain observance','Hisano Shrine / early summer','A small shrine observance for safe rain and calm seas before the height of summer.'],
    '2026-07-18':['Southern beach season','South coast / tourism','Beach facilities move into peak-season operation along the southern coast.'],
    '2026-08-15':['Hisano summer festival','Town Center / lantern night','Lanterns, food stalls and late ferries keep the town awake beyond its usual rhythm.'],
    '2026-09-01':['Typhoon preparedness day','Municipal / island-wide','Public checks for coastal barriers, transport plans and emergency supplies.'],
    '2026-11-08':['Autumn shrine market','Hisano Shrine / local stalls','A quieter market built around local food, crafts and the end of the tourism rush.']
  };
  let calMonth=7; const monthNames=['January','February','March','April','May','June','July','August','September','October','November','December'];
  function renderCal(){if(!calendar)return;const year=2026;const first=new Date(year,calMonth,1);const days=new Date(year,calMonth+1,0).getDate();const offset=(first.getDay()+6)%7;let cells='';for(let i=0;i<offset;i++)cells+='<span class="calendar-day calendar-day-empty"></span>';for(let d=1;d<=days;d++){const iso=`${year}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;const ev=calEvents[iso];const today=iso==='2026-08-13';cells+=ev?`<button class="calendar-day has-event${today?' is-today':''}" data-cal-date="${iso}" type="button"><span>${d}</span><i></i><small>${ev[0]}</small></button>`:`<span class="calendar-day${today?' is-today':''}"><span>${d}</span>${today?'<em>Today</em>':''}</span>`;}calendar.innerHTML=`<div class="calendar-nav"><button data-cal-move="-1" type="button">←</button><div><span>HISANO / 2026</span><strong>${monthNames[calMonth]}</strong><small>Island life</small></div><button data-cal-move="1" type="button">→</button></div><div class="calendar-weekdays">${['MON','TUE','WED','THU','FRI','SAT','SUN'].map(x=>`<span>${x}</span>`).join('')}</div><div class="calendar-month-grid">${cells}</div>`;}
  calendar?.addEventListener('click',e=>{const mv=e.target.closest('[data-cal-move]');if(mv){calMonth=(calMonth+Number(mv.dataset.calMove)+12)%12;renderCal();return;}const day=e.target.closest('[data-cal-date]');if(!day)return;qa('[data-cal-date]',calendar).forEach(x=>x.classList.toggle('is-active',x===day));const ev=calEvents[day.dataset.calDate];if(calDetail&&ev)calDetail.innerHTML=`<span>${day.dataset.calDate.split('-').reverse().join('.')} / ISLAND LIFE</span><strong>${ev[0]}</strong><small>${ev[1]}</small><p>${ev[2]}</p>`;});
  renderCal();

  // -----------------------------------------------------------------------
  // 08 / History: stable real-date timeline + cinematic environmental state.
  // -----------------------------------------------------------------------
  const markers=qa('.history-marker');let historyIndex=0;
  const detailYear=q('#history-detail-year'),detailTitle=q('#history-detail-title'),detailText=q('#history-detail-text'),position=q('#history-position'),historyScene=q('#history-era-scene');
  function selectHistory(i,{push=true,focus=false}={}){if(!markers.length)return;historyIndex=(i+markers.length)%markers.length;const m=markers[historyIndex];markers.forEach((x,j)=>{x.classList.toggle('is-active',j===historyIndex);x.setAttribute('aria-selected',String(j===historyIndex));});if(detailYear)detailYear.textContent=m.dataset.date||m.dataset.year;if(detailTitle)detailTitle.textContent=m.dataset.title;if(detailText)detailText.textContent=m.dataset.text;if(position)position.textContent=`${String(historyIndex+1).padStart(2,'0')} / ${String(markers.length).padStart(2,'0')}`;q('#history-view-map')?.setAttribute('data-location',m.dataset.location||'town');if(historyScene){historyScene.dataset.era=String(historyIndex);q('.history-era-year',historyScene).textContent=(m.dataset.year||'').slice(-4);};body.dataset.historyEra=String(historyIndex);if(push)history.replaceState(null,'',`#history/${historyIndex+1}`);save('hitc-history-index-v25',String(historyIndex));if(focus)m.focus({preventScroll:true});}
  markers.forEach((m,i)=>m.addEventListener('click',()=>selectHistory(i)));
  q('#history-prev')?.addEventListener('click',()=>selectHistory(historyIndex-1,{focus:true}));q('#history-next')?.addEventListener('click',()=>selectHistory(historyIndex+1,{focus:true}));
  q('#history-view-map')?.addEventListener('click',e=>{const k=e.currentTarget.dataset.location;q('#hisano')?.scrollIntoView({behavior:isReduced()?'auto':'smooth'});setTimeout(()=>q(`.map-hotspot[data-location="${k}"]`)?.click(),520);});
  const savedHistory=Number(load('hitc-history-index-v25','0'))||0;selectHistory(savedHistory,{push:false});

  // Keyboard polish.
  document.addEventListener('keydown',e=>{if(e.target.matches('input,textarea,select'))return;if(e.key==='Escape'){closeMapRoom();closeJump();closeDrawer();q('#reading-progress-popover')&&(q('#reading-progress-popover').hidden=true);q('#reader-mode-overlay')&&(q('#reader-mode-overlay').hidden=true);q('#chapter-opening-overlay')&&(q('#chapter-opening-overlay').hidden=true);}if(currentSection==='history'&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){e.preventDefault();selectHistory(historyIndex+(e.key==='ArrowRight'?1:-1),{focus:true});}});

  // -----------------------------------------------------------------------
  // 09 / Reading memory, evolving presentation, chapter portal and reader mode.
  // -----------------------------------------------------------------------
  let readingProgress=Number(load('hitc-reader-progress','0'))||0;
  const readingPop=q('#reading-progress-popover');
  function applyReadingProgress(){const status=q('#reading-memory-status');if(status)status.textContent=readingProgress?`Through Chapter ${readingProgress}`:'Not started';body.dataset.readerProgress=String(readingProgress);qa('[data-reading-progress]').forEach(b=>b.classList.toggle('is-active',Number(b.dataset.readingProgress)===readingProgress));const notes={aoko:['','Later presentation note: calm is not the same thing as happy.','Her file now avoids calling restraint a virtue.','The word “essential” has been removed from one public description.'],momoka:['','Her notes increasingly describe the weather as a story, not a fact.','A later clipping calls the forecast “too useful to question.”','Several source names are now withheld.'],renji:['','His arrival date becomes a recurring reference point.','Later pages identify him as a witness rather than an outsider.','The island’s public language around him becomes noticeably careful.']};qa('.character-profile[data-character]').forEach(p=>{let evo=q('.reader-evolution-v25',p);if(!evo){evo=document.createElement('p');evo.className='reader-evolution-v25';q('[data-char-panel="notes"]',p)?.appendChild(evo);}if(evo){evo.hidden=!readingProgress;evo.textContent=notes[p.dataset.character]?.[Math.min(readingProgress,3)]||'';}});}
  q('#reading-memory-open')?.addEventListener('click',()=>{if(readingPop){readingPop.hidden=false;requestAnimationFrame(()=>readingPop.classList.add('is-open'));}});q('#reading-progress-close')?.addEventListener('click',()=>{if(readingPop){readingPop.classList.remove('is-open');setTimeout(()=>readingPop.hidden=true,160);}});qa('[data-reading-progress]').forEach(b=>b.addEventListener('click',()=>{readingProgress=Number(b.dataset.readingProgress||0);save('hitc-reader-progress',String(readingProgress));applyReadingProgress();setTimeout(()=>{if(readingPop)readingPop.hidden=true;},120);}));applyReadingProgress();

  // Release-aware chapter cards and launch mode.
  const currentChapter=Number(release.currentChapter||0);body.dataset.releaseChapter=String(currentChapter);if(currentChapter>0){body.classList.add('chapter-launch-live');const hero=q('.hero-copy');if(hero&&!q('.release-ribbon',hero)){const r=document.createElement('a');r.href='#preview';r.className='release-ribbon';r.innerHTML=`<span>NOW AVAILABLE</span><strong>Chapter ${currentChapter}</strong><i>Read ↘</i>`;hero.prepend(r);}}
  qa('.chapter-entry').forEach((entry,i)=>{const chapter=i+1;const available=currentChapter>=chapter;entry.dataset.publicationStatus=available?'available':chapter===currentChapter+1?'coming-soon':'locked';entry.classList.toggle('is-locked',!available&&chapter>currentChapter+1);const status=q('.chapter-status',entry);if(status)status.textContent=available?'Available':chapter===currentChapter+1?'Coming soon':'Locked';if(available&&chapter===1){const link=q('.chapter-archive-link',entry);if(link){link.textContent=load('hitc-chapter-1-started')==='true'?'Continue Chapter 1 ↘':'Open Chapter 1 ↘';}}});

  const chapterLink=q('.chapter-archive-link');const chapterOverlay=q('#chapter-opening-overlay');const chapterAction=q('#chapter-opening-action');
  chapterLink?.addEventListener('click',e=>{e.preventDefault();save('hitc-chapter-1-started','true');if(chapterOverlay){chapterOverlay.hidden=false;requestAnimationFrame(()=>chapterOverlay.classList.add('is-open'));body.classList.add('chapter-portal-open');}history.replaceState(null,'','#chapter/1');});
  q('.chapter-opening-close')?.addEventListener('click',()=>{if(chapterOverlay){chapterOverlay.classList.remove('is-open');chapterOverlay.hidden=true;}body.classList.remove('chapter-portal-open');history.replaceState(null,'','#preview');});
  chapterAction?.addEventListener('click',()=>{if(currentChapter>=1){if(chapterOverlay)chapterOverlay.hidden=true;const reader=q('#reader-mode-overlay');if(reader)reader.hidden=false;}else{if(chapterOverlay)chapterOverlay.hidden=true;q('#preview')?.scrollIntoView({behavior:isReduced()?'auto':'smooth'});}body.classList.remove('chapter-portal-open');});
  q('#reader-mode-close')?.addEventListener('click',()=>{const r=q('#reader-mode-overlay');if(r)r.hidden=true;});

  // -----------------------------------------------------------------------
  // 10 / Updates + newsletter presentation.
  // -----------------------------------------------------------------------
  qa('[data-update-filter]').forEach(b=>b.addEventListener('click',()=>{qa('[data-update-filter]').forEach(x=>x.classList.toggle('is-active',x===b));qa('[data-update-category]').forEach(item=>item.hidden=b.dataset.updateFilter!=='all'&&item.dataset.updateCategory!==b.dataset.updateFilter);}));
  const newsletter=q('#newsletter-form'),email=q('#newsletter-email'),newsletterStatus=q('#newsletter-status'),newsletterConfig=window.HITC_NEWSLETTER||{};
  newsletter?.addEventListener('submit',async e=>{e.preventDefault();const value=email?.value.trim()||'';if(!/^\S+@\S+\.\S+$/.test(value)){newsletter.classList.add('has-error');if(newsletterStatus)newsletterStatus.textContent='Enter a valid email address.';return;}newsletter.classList.remove('has-error');const button=q('button[type="submit"]',newsletter);if(button)button.disabled=true;try{if(newsletterConfig.endpoint){const res=await fetch(newsletterConfig.endpoint,{method:newsletterConfig.method||'POST',headers:newsletterConfig.json===false?undefined:{'Content-Type':'application/json'},body:newsletterConfig.json===false?new URLSearchParams({email:value}):JSON.stringify({email:value,source:'Head in the Clouds website'})});if(!res.ok)throw new Error();}else save('hitc-newsletter-preview-email',value);newsletter.classList.add('is-success');newsletter.innerHTML='<div class="letter-registered"><span>HISANO POST / REGISTERED</span><strong>Letter registered.</strong><p>The next dispatch from Hisano will find you.</p></div>';}catch(_){if(newsletterStatus)newsletterStatus.textContent='That did not go through. Please try again.';}finally{if(button)button.disabled=false;}});
  const storedMail=load('hitc-newsletter-preview-email','');if(storedMail&&email)email.value=storedMail;

  // -----------------------------------------------------------------------
  // 11 / Animation asset framework: real authored motion can replace placeholders.
  // -----------------------------------------------------------------------
  const animationTargets={
    heroClouds:'.hero',
    aokoAtmosphere:'#aoko-custom-atmosphere',
    characterAtmosphere:'#character-wide-atmosphere',
    hisanoSea:'.hisano-section',
    thenMapOverlay:'#then-now-stage',
    historyEra:'#history-era-scene',
    galleryAtmosphere:'#gallery',
    chapterPortal:'#chapter-opening-overlay',
    closingCoast:'.closing-sequence',
    nightSky:'.closing-sequence'
  };
  Object.entries(animationTargets).forEach(([key,selector])=>{const cfg=animations[key];if(!cfg?.src)return;const target=q(selector);if(!target)return;const video=document.createElement('video');video.className=`production-animation production-animation-${key}`;video.src=cfg.src;video.autoplay=true;video.loop=cfg.loop!==false;video.muted=cfg.muted!==false;video.playsInline=true;video.setAttribute('aria-hidden','true');target.prepend(video);video.play().catch(()=>{});});

  // -----------------------------------------------------------------------
  // 12 / Seasonal edition, release event and score-aware breathing.
  // -----------------------------------------------------------------------
  let season=release.seasonalEvent||'auto';if(season==='auto'){const m=new Date().getMonth()+1;season=[12,1,2].includes(m)?'winter':[6,7,8].includes(m)?'summer':[9,10,11].includes(m)?'autumn':'spring';}if(season!=='none')body.classList.add(`season-${season}`);
  const music=q('#background-music');
  setInterval(()=>{if(!music||music.paused||isReduced())return;const breath=(Math.sin(music.currentTime*.23)+1)/2;body.style.setProperty('--score-breath',breath.toFixed(3));},350);

  // -----------------------------------------------------------------------
  // 13 / Hash/deep-link support without turning the site into a mini-game.
  // -----------------------------------------------------------------------
  function handleHash(){const h=location.hash;if(h.startsWith('#character/')){const key=h.split('/')[1];q('#characters')?.scrollIntoView({behavior:'auto'});q(`.character-tab[data-character-target="${key}-profile"]`)?.click();return;}if(h.startsWith('#history/')){q('#history')?.scrollIntoView({behavior:'auto'});selectHistory((Number(h.split('/')[1])||1)-1,{push:false});return;}if(h.startsWith('#hisano/')){const key=h.split('/')[1];q('#hisano')?.scrollIntoView({behavior:'auto'});setTimeout(()=>q(`.map-hotspot[data-location="${key}"]`)?.click(),30);return;}if(h==='#chapter/1'){q('#preview')?.scrollIntoView({behavior:'auto'});}}
  window.addEventListener('popstate',handleHash);setTimeout(handleHash,60);
  qa('.map-hotspot,.map-location-list [data-location]').forEach(b=>b.addEventListener('click',()=>history.replaceState(null,'',`#hisano/${b.dataset.location}`)));

  // A very subtle visual director's cut for repeat visits; full intro timing remains identical.
  if(visits>1)body.classList.add('returning-visitor');if(visits>3)body.classList.add('frequent-visitor');


  // v27 keeps hover silent. Deliberate click sonics are handled centrally in script.js;
  // Open Chapter remains the intentionally silent exception.
})();
