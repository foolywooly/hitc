(() => {
  'use strict';

  const mq = window.matchMedia('(max-width: 760px)');
  const body = document.body;
  const q = (s, r=document) => r.querySelector(s);
  const qa = (s, r=document) => [...r.querySelectorAll(s)];

  const pageIds = ['top','story','characters','hisano','history','scenes','gallery','preview','updates','about'];
  const coreDock = [
    ['top','Home','⌂'],
    ['characters','Cast','人'],
    ['hisano','Hisano','◎'],
    ['history','History','15'],
    ['preview','Read','頁']
  ];
  let activePage = 'top';
  let trailerWasActive = false;

  function normalizedPage(raw){
    const id = (raw || '').replace(/^#/,'').split('/')[0];
    if (id === 'chapter-one' || id === 'chapter') return 'preview';
    return pageIds.includes(id) ? id : 'top';
  }

  function decorateSections(){
    pageIds.forEach(id => q('#'+id)?.classList.add('mobile-pocket-section'));
  }

  function ensureExtraMenuLinks(){
    const nav = q('.nav-primary');
    if(!nav || q('.mobile-extra-nav', nav)) return;
    const wrap = document.createElement('div');
    wrap.className = 'mobile-extra-nav';
    wrap.innerHTML = `
      <a href="#scenes">Scenes</a>
      <a href="#gallery">Gallery</a>
      <a href="#about">About</a>`;
    nav.appendChild(wrap);
  }

  function ensureDock(){
    if(q('#mobile-pocket-dock')) return;
    const dock = document.createElement('nav');
    dock.id = 'mobile-pocket-dock';
    dock.className = 'mobile-pocket-dock';
    dock.setAttribute('aria-label','Mobile section navigation');
    dock.innerHTML = coreDock.map(([id,label,icon]) =>
      `<a href="#${id}" data-mobile-page="${id}"><span aria-hidden="true">${icon}</span><small>${label}</small></a>`
    ).join('');
    body.appendChild(dock);
  }

  function setActiveVisuals(id){
    qa('.mobile-pocket-section').forEach(section => {
      section.classList.toggle('is-mobile-active', section.id === id);
      section.setAttribute('aria-hidden', section.id === id ? 'false' : 'true');
    });
    qa('[data-mobile-page]').forEach(a => a.classList.toggle('is-active', a.dataset.mobilePage === id));
    body.dataset.mobilePage = id;
  }

  function activatePage(id, {push=false, replace=false, scroll=true}={}){
    if(!mq.matches) return;
    id = normalizedPage(id);
    activePage = id;
    setActiveVisuals(id);
    q('.site-nav')?.classList.remove('open');
    q('.menu-toggle')?.setAttribute('aria-expanded','false');
    if(push) history.pushState({mobilePage:id},'',`#${id}`);
    else if(replace) history.replaceState({mobilePage:id},'',`#${id}`);
    if(scroll){
      requestAnimationFrame(() => window.scrollTo({top:0,left:0,behavior:'auto'}));
    }
    try{ localStorage.setItem('hitc-mobile-page', id); }catch(_){}
  }

  function setupLinkRouting(){
    document.addEventListener('click', e => {
      if(!mq.matches || body.classList.contains('trailer-mode')) return;
      const link = e.target.closest('a[href^="#"]');
      if(!link) return;
      if(link.matches('.chapter-archive-link,[data-silent-ui="true"]')) return;
      const href = link.getAttribute('href') || '';
      const page = normalizedPage(href);
      const raw = href.replace(/^#/,'').split('/')[0];
      if(!pageIds.includes(raw) && raw !== 'chapter-one') return;
      e.preventDefault();
      activatePage(page,{push:true});
    }, true);
  }

  function setupCharacterSwipe(){
    const list = q('.character-list');
    if(!list) return;
    let startX=0,startY=0;
    list.addEventListener('touchstart',e=>{const t=e.touches[0];startX=t.clientX;startY=t.clientY;},{passive:true});
    list.addEventListener('touchend',e=>{
      if(!mq.matches) return;
      const t=e.changedTouches[0];const dx=t.clientX-startX,dy=t.clientY-startY;
      if(Math.abs(dx)<55 || Math.abs(dx)<Math.abs(dy)*1.25) return;
      const tabs=qa('.character-tab'); const current=Math.max(0,tabs.findIndex(b=>b.classList.contains('is-active')));
      const next=Math.max(0,Math.min(tabs.length-1,current+(dx<0?1:-1)));
      if(next!==current) tabs[next].click();
    },{passive:true});
  }

  function setupHistorySwipe(){
    const exp=q('.history-experience'); if(!exp) return;
    let sx=0,sy=0;
    exp.addEventListener('touchstart',e=>{const t=e.touches[0];sx=t.clientX;sy=t.clientY;},{passive:true});
    exp.addEventListener('touchend',e=>{
      if(!mq.matches) return;
      const t=e.changedTouches[0],dx=t.clientX-sx,dy=t.clientY-sy;
      if(Math.abs(dx)<55 || Math.abs(dx)<Math.abs(dy)*1.25) return;
      q(dx<0?'#history-next':'#history-prev')?.click();
    },{passive:true});
  }

  function setupResumeToast(){
    const resume=q('#resume-visit'); if(!resume) return;
    const obs=new MutationObserver(()=>{
      if(!mq.matches || resume.hidden) return;
      clearTimeout(resume._mobileHideTimer);
      resume._mobileHideTimer=setTimeout(()=>{resume.hidden=true;resume.classList.remove('is-open');},6000);
    });
    obs.observe(resume,{attributes:true,attributeFilter:['hidden']});
  }

  function setupTrailerModeRecovery(){
    const obs = new MutationObserver(()=>{
      if(!mq.matches) return;
      const on=body.classList.contains('trailer-mode');
      if(on && !trailerWasActive){
        trailerWasActive=true;
        body.classList.add('mobile-trailer-expanded');
      } else if(!on && trailerWasActive){
        trailerWasActive=false;
        body.classList.remove('mobile-trailer-expanded');
        setActiveVisuals(activePage);
        requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'auto'}));
      }
    });
    obs.observe(body,{attributes:true,attributeFilter:['class']});
  }

  function enterMobile(){
    body.classList.add('mobile-pocket');
    decorateSections();
    ensureExtraMenuLinks();
    ensureDock();
    let initial = normalizedPage(location.hash);
    if(location.hash === '' || location.hash === '#top'){
      try{ initial = localStorage.getItem('hitc-mobile-page') || 'top'; }catch(_){}
    }
    activatePage(initial,{replace:false,scroll:false});
  }

  function leaveMobile(){
    body.classList.remove('mobile-pocket','mobile-trailer-expanded');
    delete body.dataset.mobilePage;
    qa('.mobile-pocket-section').forEach(section=>{
      section.classList.remove('is-mobile-active');
      section.removeAttribute('aria-hidden');
    });
  }

  function syncMode(){ mq.matches ? enterMobile() : leaveMobile(); }

  window.addEventListener('popstate',()=>{ if(mq.matches) activatePage(normalizedPage(location.hash),{scroll:true}); });
  window.addEventListener('hashchange',()=>{ if(mq.matches && !body.classList.contains('trailer-mode')) activatePage(normalizedPage(location.hash),{scroll:true}); });
  mq.addEventListener?.('change',syncMode);

  decorateSections();
  setupLinkRouting();
  setupCharacterSwipe();
  setupHistorySwipe();
  setupResumeToast();
  setupTrailerModeRecovery();
  syncMode();
})();
