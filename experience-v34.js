(() => {
  'use strict';

  const MOBILE_MAX = 760;
  const mq = window.matchMedia(`(max-width:${MOBILE_MAX}px)`);
  const body = document.body;
  const q = (s, r=document) => r.querySelector(s);
  const qa = (s, r=document) => [...r.querySelectorAll(s)];
  const forceDesktop = (() => { try { return new URLSearchParams(location.search).get('view') === 'desktop'; } catch (_) { return false; } })();

  const pageIds = ['top','story','characters','hisano','history','scenes','gallery','preview','updates','about'];
  const dockPages = [
    ['top','Home','⌂'],
    ['characters','Cast','人'],
    ['hisano','Hisano','◎'],
    ['history','History','15'],
    ['preview','Read','頁']
  ];
  let activePage = 'top';
  let transitionTimer = 0;
  let trailerWasActive = false;

  function normalize(raw){
    const id=(raw||'').replace(/^#/,'').split('/')[0];
    if(id==='chapter-one'||id==='chapter') return 'preview';
    return pageIds.includes(id)?id:'top';
  }

  // -------------------------------------------------------------------
  // AUDIO LIFECYCLE / iPhone background safety
  // -------------------------------------------------------------------
  const backgroundResume = new Set();
  function pauseAllForBackground(){
    document.querySelectorAll('audio').forEach(audio=>{
      try{
        if(!audio.paused && !audio.ended){
          if(audio.loop || audio.id==='background-music') backgroundResume.add(audio.id);
          audio.pause();
        }
      }catch(_){}
    });
    try { window.HITC_AUDIO_CONTEXT?.suspend?.(); } catch (_) {}
    try { window.HITC_TRAILER_API?.stop?.(); } catch (_) {}
    try { window.HITC_AOKO_SCENE_API?.stop?.(); } catch (_) {}
  }
  function resumeLoopsAfterReturn(){
    if(document.hidden) return;
    try { window.HITC_AUDIO_CONTEXT?.resume?.(); } catch (_) {}
    const ids=[...backgroundResume]; backgroundResume.clear();
    ids.forEach(id=>{
      const audio=document.getElementById(id);
      if(!audio) return;
      try { audio.play()?.catch?.(()=>{}); } catch (_) {}
    });
  }
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden) pauseAllForBackground(); else setTimeout(resumeLoopsAfterReturn,120);
  });
  window.addEventListener('pagehide',pauseAllForBackground);
  window.addEventListener('pageshow',e=>{ if(e.persisted) setTimeout(resumeLoopsAfterReturn,150); });
  window.addEventListener('blur',()=>{ if(document.hidden) pauseAllForBackground(); });

  // -------------------------------------------------------------------
  // AOKO / desktop invitation gate
  // -------------------------------------------------------------------
  const aokoInvite=q('#aoko-cloud-invitation');
  const aokoFeature=q('#aoko-feature');
  const aokoYes=q('#aoko-cloud-yes');
  const aokoNo=q('#aoko-cloud-no');
  aokoYes?.addEventListener('click',()=>{
    if(!aokoFeature) return;
    aokoInvite?.classList.add('is-opening');
    setTimeout(()=>{
      aokoFeature.hidden=false;
      aokoFeature.classList.add('is-seen','is-invited');
      aokoInvite?.setAttribute('hidden','');
      if(!mq.matches){
        aokoFeature.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'center'});
        setTimeout(()=>{ if(!body.classList.contains('trailer-mode')) window.HITC_AOKO_SCENE_API?.play?.({force:true}); },520);
      }
    },260);
  });
  aokoNo?.addEventListener('click',()=>{
    if(!aokoInvite) return;
    const p=q('p',aokoInvite); if(p) p.textContent='Then let the clouds keep their answer for now.';
    aokoInvite.classList.add('is-declined');
  });
  new MutationObserver(()=>{
    if(body.classList.contains('trailer-mode')) window.HITC_AOKO_SCENE_API?.stop?.();
  }).observe(body,{attributes:true,attributeFilter:['class']});

  // -------------------------------------------------------------------
  // MOBILE POCKET EDITION
  // -------------------------------------------------------------------
  function decorateSections(){ pageIds.forEach(id=>q('#'+id)?.classList.add('mobile-pocket-section')); }

  function ensureCloudTransition(){
    if(q('#mobile-cloud-transition')) return;
    const el=document.createElement('div'); el.id='mobile-cloud-transition'; el.className='mobile-cloud-transition'; el.setAttribute('aria-hidden','true');
    el.innerHTML='<i></i><i></i><span></span>';
    body.appendChild(el);
  }

  function ensureDock(){
    if(q('#mobile-pocket-dock')) return;
    const dock=document.createElement('nav'); dock.id='mobile-pocket-dock'; dock.className='mobile-pocket-dock'; dock.setAttribute('aria-label','Pocket Edition navigation');
    dock.innerHTML=dockPages.map(([id,label,icon])=>`<a href="#${id}" data-mobile-page="${id}"><span aria-hidden="true">${icon}</span><small>${label}</small></a>`).join('');
    body.appendChild(dock);
  }

  function ensureMenuExtras(){
    const nav=q('.nav-primary'); if(!nav) return;
    if(!q('.mobile-extra-nav',nav)){
      const extra=document.createElement('div'); extra.className='mobile-extra-nav';
      extra.innerHTML='<a href="#scenes">Scenes</a><a href="#gallery">Gallery</a><a href="#updates">Updates</a><a href="#about">About</a>';
      nav.appendChild(extra);
    }
    if(!q('#mobile-extended-view')){
      const utility=q('.nav-utilities')||q('.site-nav');
      const a=document.createElement('a'); a.id='mobile-extended-view'; a.className='mobile-extended-view'; a.href='?view=desktop#top';
      a.innerHTML='<span>EXTENDED VIEW</span><small>Open the full desktop composition ↗</small>';
      utility?.appendChild(a);
    }
  }

  function ensureDesktopReturn(){
    if(!forceDesktop || q('#return-pocket-view')) return;
    const a=document.createElement('a'); a.id='return-pocket-view'; a.className='return-pocket-view'; a.href=location.pathname+'#top'; a.textContent='Pocket Edition ↙'; body.appendChild(a);
  }

  function ensureSwipeHint(scroller,label='Swipe'){
    if(!scroller || scroller.parentElement?.querySelector(':scope > .mobile-swipe-hint')) return;
    const hint=document.createElement('div'); hint.className='mobile-swipe-hint'; hint.setAttribute('aria-hidden','true');
    hint.innerHTML=`<b>‹</b><span>${label}</span><b>›</b>`;
    scroller.insertAdjacentElement('afterend',hint);
    const dismiss=()=>{ hint.classList.add('is-used'); try{localStorage.setItem('hitc-mobile-swipe-seen','1');}catch(_){} };
    scroller.addEventListener('scroll',dismiss,{passive:true,once:true});
    scroller.addEventListener('touchend',dismiss,{passive:true,once:true});
  }

  function ensureScrollCue(){
    if(q('#mobile-scroll-cue')) return;
    const cue=document.createElement('button'); cue.type='button'; cue.id='mobile-scroll-cue'; cue.className='mobile-scroll-cue'; cue.setAttribute('aria-label','Scroll for more');
    cue.innerHTML='<span>⌄</span><small>MORE</small>';
    cue.addEventListener('click',()=>window.scrollBy({top:Math.min(innerHeight*.62,520),behavior:'smooth'}));
    body.appendChild(cue);
    window.addEventListener('scroll',()=>updateScrollCue(),{passive:true});
  }

  function updateScrollCue(){
    const cue=q('#mobile-scroll-cue'); if(!cue || !body.classList.contains('mobile-pocket')) return;
    const canScroll=document.documentElement.scrollHeight>innerHeight+120;
    const nearTop=scrollY<90;
    cue.classList.toggle('is-visible',canScroll&&nearTop&&!body.classList.contains('trailer-mode'));
  }

  function addGuidance(){
    ensureSwipeHint(q('.character-selector'),'Swipe cast');
    ensureSwipeHint(q('.history-timeline'),'Move through years');
    ensureSwipeHint(q('.scene-strip'),'Swipe scenes');
    ensureSwipeHint(q('.gallery-showcase'),'Swipe artwork');
    ensureSwipeHint(q('.novel-archive'),'Swipe chapters');
    ensureSwipeHint(q('.updates-list'),'Swipe dispatches');
  }

  function setVisuals(id){
    qa('.mobile-pocket-section').forEach(section=>{
      const active=section.id===id;
      section.classList.toggle('is-mobile-active',active);
      section.setAttribute('aria-hidden',active?'false':'true');
    });
    qa('[data-mobile-page]').forEach(a=>a.classList.toggle('is-active',a.dataset.mobilePage===id));
    body.dataset.mobilePage=id;
  }

  function hardTop(){
    try{ history.scrollRestoration='manual'; }catch(_){}
    document.documentElement.scrollTop=0; document.body.scrollTop=0; window.scrollTo(0,0);
    requestAnimationFrame(()=>{document.documentElement.scrollTop=0;document.body.scrollTop=0;window.scrollTo(0,0);updateScrollCue();});
  }

  function applyPage(id,{push=false,replace=false}={}){
    id=normalize(id); activePage=id; setVisuals(id);
    q('.site-nav')?.classList.remove('open'); q('.menu-toggle')?.setAttribute('aria-expanded','false');
    if(push) history.pushState({mobilePage:id},'',`#${id}`); else if(replace) history.replaceState({mobilePage:id},'',`#${id}`);
    hardTop();
    try{localStorage.setItem('hitc-mobile-page',id);}catch(_){}
  }

  function activatePage(id,{push=false,replace=false,animate=true}={}){
    if(!mq.matches||forceDesktop) return;
    clearTimeout(transitionTimer);
    const cloud=q('#mobile-cloud-transition');
    if(!animate || id===activePage){ applyPage(id,{push,replace}); return; }
    cloud?.classList.add('is-active');
    transitionTimer=setTimeout(()=>{
      applyPage(id,{push,replace});
      setTimeout(()=>cloud?.classList.remove('is-active'),210);
    },180);
  }

  function setupRouting(){
    document.addEventListener('click',e=>{
      if(!mq.matches||forceDesktop||body.classList.contains('trailer-mode')) return;
      const link=e.target.closest('a[href^="#"]'); if(!link) return;
      if(link.matches('.chapter-archive-link,[data-silent-ui="true"]')) return;
      const raw=(link.getAttribute('href')||'').replace(/^#/,'').split('/')[0];
      if(!pageIds.includes(raw)&&raw!=='chapter-one') return;
      e.preventDefault(); activatePage(normalize(raw),{push:true,animate:true});
    },true);
  }

  function setupCharacterSwipe(){
    const list=q('.character-list'); if(!list) return; let sx=0,sy=0;
    list.addEventListener('touchstart',e=>{const t=e.touches[0];sx=t.clientX;sy=t.clientY;},{passive:true});
    list.addEventListener('touchend',e=>{ if(!mq.matches||forceDesktop)return;const t=e.changedTouches[0],dx=t.clientX-sx,dy=t.clientY-sy;if(Math.abs(dx)<48||Math.abs(dx)<Math.abs(dy)*1.2)return;const tabs=qa('.character-tab'),i=Math.max(0,tabs.findIndex(x=>x.classList.contains('is-active'))),n=Math.max(0,Math.min(tabs.length-1,i+(dx<0?1:-1)));tabs[n]?.click();},{passive:true});
  }

  function setupHistorySwipe(){
    const exp=q('.history-experience'); if(!exp)return; let sx=0,sy=0;
    exp.addEventListener('touchstart',e=>{const t=e.touches[0];sx=t.clientX;sy=t.clientY;},{passive:true});
    exp.addEventListener('touchend',e=>{if(!mq.matches||forceDesktop)return;const t=e.changedTouches[0],dx=t.clientX-sx,dy=t.clientY-sy;if(Math.abs(dx)<48||Math.abs(dx)<Math.abs(dy)*1.2)return;q(dx<0?'#history-next':'#history-prev')?.click();},{passive:true});
  }

  function setupResumeToast(){
    const resume=q('#resume-visit'); if(!resume)return;
    const hide=()=>{resume.hidden=true;resume.classList.remove('is-open');};
    const obs=new MutationObserver(()=>{if(!mq.matches||forceDesktop||resume.hidden)return;clearTimeout(resume._mobileTimer);resume._mobileTimer=setTimeout(hide,4200);});
    obs.observe(resume,{attributes:true,attributeFilter:['hidden']});
  }

  function setupTrailerRecovery(){
    const obs=new MutationObserver(()=>{
      if(!mq.matches||forceDesktop)return;
      const on=body.classList.contains('trailer-mode');
      if(on&&!trailerWasActive){trailerWasActive=true;body.classList.add('mobile-trailer-expanded');}
      else if(!on&&trailerWasActive){trailerWasActive=false;body.classList.remove('mobile-trailer-expanded');setVisuals(activePage);hardTop();}
    });
    obs.observe(body,{attributes:true,attributeFilter:['class']});
  }

  function compactMobileText(){
    // Keeps the same facts, but removes desktop-only framing that causes enormous mobile pages.
    q('#characters .section-heading-row')?.classList.add('mobile-collapsible-heading');
    q('#preview .section-heading-row')?.classList.add('mobile-collapsible-heading');
    q('#scenes .section-heading-row')?.classList.add('mobile-collapsible-heading');
    q('#gallery .section-heading-row')?.classList.add('mobile-collapsible-heading');
    q('#updates .updates-title')?.classList.add('mobile-collapsible-heading');
  }

  function enterMobile(){
    if(forceDesktop)return;
    body.classList.add('mobile-pocket'); decorateSections(); ensureCloudTransition(); ensureDock(); ensureMenuExtras(); ensureScrollCue(); compactMobileText(); addGuidance();
    let initial=normalize(location.hash);
    if(!location.hash||location.hash==='#top'){ try{initial=localStorage.getItem('hitc-mobile-page')||'top';}catch(_){} }
    applyPage(initial,{replace:false});
  }

  function leaveMobile(){
    body.classList.remove('mobile-pocket','mobile-trailer-expanded'); delete body.dataset.mobilePage;
    qa('.mobile-pocket-section').forEach(section=>{section.classList.remove('is-mobile-active');section.removeAttribute('aria-hidden');});
  }

  function syncMode(){ if(mq.matches&&!forceDesktop) enterMobile(); else leaveMobile(); }

  window.addEventListener('popstate',()=>{if(mq.matches&&!forceDesktop)activatePage(normalize(location.hash),{animate:true});});
  mq.addEventListener?.('change',syncMode);
  setupRouting(); setupCharacterSwipe(); setupHistorySwipe(); setupResumeToast(); setupTrailerRecovery(); ensureDesktopReturn(); syncMode();
})();
