(() => {
  const assetConfig = window.HITC_ASSETS || {};

  // ---------- Asset slots ----------
  function loadAssetIntoSlot(slot) {
    const key = slot.dataset.slot;
    const config = assetConfig[key];
    const image = slot.querySelector('[data-asset-image]');
    if (!config || !image || !config.src) return;

    const probe = new Image();
    probe.onload = () => {
      image.src = config.src;
      image.alt = config.decorative ? '' : (config.alt || '');
      if (config.decorative) image.setAttribute('aria-hidden', 'true');
      image.classList.add('loaded');
      slot.classList.add('has-image');
    };
    probe.onerror = () => slot.classList.remove('has-image');
    probe.src = config.src;
  }

  document.querySelectorAll('[data-slot]').forEach(loadAssetIntoSlot);

  // Simple decorative image elements that use data-asset rather than a slot wrapper.
  document.querySelectorAll('[data-asset]').forEach(image => {
    const config = assetConfig[image.dataset.asset];
    if (!config || !config.src) return;
    const probe = new Image();
    probe.onload = () => {
      image.src = config.src;
      image.classList.add('loaded');
    };
    probe.src = config.src;
  });

  // ---------- Sticky header depth ----------
  const stickyHeader = document.querySelector('.site-header');
  const updateHeaderDepth = () => {
    if (!stickyHeader) return;
    stickyHeader.classList.toggle('is-scrolled', window.scrollY > 8);
  };
  updateHeaderDepth();
  window.addEventListener('scroll', updateHeaderDepth, { passive: true });

  // ---------- Mobile navigation ----------
  const menu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.site-nav');
  if (menu && nav) {
    menu.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menu.setAttribute('aria-expanded', String(open));
    });
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      nav.classList.remove('open');
      menu.setAttribute('aria-expanded', 'false');
    }));
  }

  // ---------- Scroll reveal ----------
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || !('IntersectionObserver' in window)) {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
  } else {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  }

  // ---------- Contextual magical UI sound + background music ----------
  const soundToggle = document.getElementById('sound-toggle');
  const soundLabel = soundToggle?.querySelector('.sound-label');
  const musicToggle = document.getElementById('music-toggle');
  const musicLabel = musicToggle?.querySelector('.music-label');
  const backgroundMusic = document.getElementById('background-music');

  const clamp01 = value => Math.max(0, Math.min(1, Number(value)));
  const audioState = window.HITC_AUDIO_STATE = window.HITC_AUDIO_STATE || { music:1, environment:1, ui:1 };
  try {
    const storedMusic = localStorage.getItem('hitc-volume-music');
    const storedEnvironment = localStorage.getItem('hitc-volume-environment');
    const storedUi = localStorage.getItem('hitc-volume-ui');
    if (storedMusic !== null) audioState.music = clamp01(storedMusic);
    if (storedEnvironment !== null) audioState.environment = clamp01(storedEnvironment);
    if (storedUi !== null) audioState.ui = clamp01(storedUi);
  } catch (_) {}

  let soundMuted = false;
  let musicMuted = false;
  let audioContext = null;

  try {
    soundMuted = localStorage.getItem('hitc-sound-muted') === 'true';
    // Music intentionally starts enabled on every fresh page launch.
    // The visitor can still toggle it off for the current session.
    musicMuted = false;
    localStorage.setItem('hitc-music-muted', 'false');
  } catch (_) {
    musicMuted = false;
  }

  function updateSoundUI() {
    if (!soundToggle) return;
    soundToggle.setAttribute('aria-pressed', String(soundMuted));
    if (soundLabel) soundLabel.textContent = soundMuted ? 'Sound off' : 'Sound on';
  }

  function updateMusicUI() {
    if (!musicToggle) return;
    musicToggle.setAttribute('aria-pressed', String(musicMuted));
    if (musicLabel) musicLabel.textContent = musicMuted ? 'Music off' : 'Music on';
  }

  function getAudioContext() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      if (!audioContext) audioContext = new Ctx();
      window.HITC_AUDIO_CONTEXT = audioContext;
      if (audioContext.state === 'suspended' && !document.hidden) audioContext.resume();
      return audioContext;
    } catch (_) {
      return null;
    }
  }

  // v26 sound language: water/glass, paper/fabric, wind/nature and quiet utility cues.
  // These are deliberately tiny and contextual. Hover is silent; click carries the response.
  function connectWithPan(node, ctx, pan = 0) {
    let output = node;
    if (typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.value = Math.max(-.72, Math.min(.72, pan));
      node.connect(panner);
      output = panner;
    }
    output.connect(ctx.destination);

    // v29 spatial polish: every section has a microscopic acoustic "room".
    // This is deliberately far below the direct signal — felt more than heard.
    try {
      const section = document.body?.dataset?.currentSection || 'top';
      const spaces = {
        top:[.055,.032], story:[.075,.030], characters:[.085,.026],
        hisano:[.105,.028], history:[.038,.018], gallery:[.050,.020],
        scenes:[.092,.025], preview:[.028,.014], updates:[.045,.018], about:[.060,.018]
      };
      const [delayTime, wet] = spaces[section] || [.05,.018];
      const delay = ctx.createDelay(.2);
      const wetGain = ctx.createGain();
      delay.delayTime.value = delayTime;
      wetGain.gain.value = wet * Math.max(.25, audioState.ui);
      output.connect(delay).connect(wetGain).connect(ctx.destination);
    } catch (_) {}
  }

  function elementPan(target) {
    const rect = target?.getBoundingClientRect?.();
    if (!rect || !window.innerWidth) return 0;
    return Math.max(-.65, Math.min(.65, ((rect.left + rect.width / 2) / window.innerWidth - .5) * 1.3));
  }

  const UI_SOUND_GAIN = 2.75;

  function quietTone(ctx, {freq=900, endFreq=freq, type='sine', gain=.003, duration=.11, delay=0, pan=0}={}) {
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (endFreq > 0 && endFreq !== freq) osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration);
    amp.gain.setValueAtTime(.0001, t);
    amp.gain.exponentialRampToValueAtTime(Math.max(.00012, gain * UI_SOUND_GAIN * audioState.ui), t + .008);
    amp.gain.exponentialRampToValueAtTime(.0001, t + duration);
    osc.connect(amp);
    connectWithPan(amp, ctx, pan);
    osc.start(t); osc.stop(t + duration + .025);
  }

  function quietNoise(ctx, {gain=.0026, duration=.12, frequency=1450, type='bandpass', pan=0}={}) {
    const frames = Math.max(64, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i=0;i<frames;i++) {
      const tail = Math.pow(1 - i / frames, 2.15);
      data[i] = (Math.random() * 2 - 1) * tail;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = .72;
    const amp = ctx.createGain();
    const t = ctx.currentTime;
    amp.gain.setValueAtTime(.0001, t);
    amp.gain.exponentialRampToValueAtTime(Math.max(.00012, gain * UI_SOUND_GAIN * audioState.ui), t + .009);
    amp.gain.exponentialRampToValueAtTime(.0001, t + duration);
    source.connect(filter).connect(amp);
    connectWithPan(amp, ctx, pan);
    source.start(t); source.stop(t + duration + .02);
  }

  function playInterfaceSound(kind = 'utility', target = null, force = false) {
    if ((soundMuted || audioState.ui <= 0) && !force) return;
    if (window.HITC_SUPPRESS_UI_SOUND) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const pan = elementPan(target);

    // v27: each major part of the site has a small sonic signature. These are
    // still short UI cues rather than musical stingers, but they are now
    // deliberately audible and distinct enough to become part of the site's identity.
    switch (kind) {
      case 'home': // title / return home: clear, airy three-point bell
        quietTone(ctx,{freq:720,endFreq:760,type:'sine',gain:.0027,duration:.115,pan});
        quietTone(ctx,{freq:1440,endFreq:1510,gain:.00185,duration:.17,delay:.018,pan});
        quietTone(ctx,{freq:2160,endFreq:2050,gain:.0009,duration:.19,delay:.038,pan});
        break;
      case 'story': // water landing on glass
        quietTone(ctx,{freq:690,endFreq:500,type:'sine',gain:.0031,duration:.13,pan});
        quietTone(ctx,{freq:1310,endFreq:1180,gain:.00145,duration:.17,delay:.022,pan});
        quietNoise(ctx,{gain:.00082,duration:.075,frequency:2100,pan});
        break;
      case 'characters': // paper sheet + soft air through fabric
        quietNoise(ctx,{gain:.00275,duration:.13,frequency:1850,pan});
        quietTone(ctx,{freq:805,endFreq:740,type:'triangle',gain:.0015,duration:.105,delay:.012,pan});
        quietTone(ctx,{freq:1160,endFreq:1090,gain:.0008,duration:.14,delay:.034,pan});
        break;
      case 'hisano': // compass / coastal glass chime
        quietTone(ctx,{freq:560,endFreq:590,type:'triangle',gain:.0024,duration:.105,pan});
        quietTone(ctx,{freq:840,endFreq:900,gain:.00195,duration:.135,delay:.015,pan});
        quietTone(ctx,{freq:1120,endFreq:1060,gain:.00105,duration:.17,delay:.035,pan});
        break;
      case 'history': // archival card movement + restrained mechanical tick
        quietNoise(ctx,{gain:.00255,duration:.11,frequency:1320,pan});
        quietTone(ctx,{freq:390,endFreq:375,type:'triangle',gain:.0020,duration:.075,delay:.008,pan});
        quietTone(ctx,{freq:780,endFreq:750,type:'sine',gain:.0010,duration:.10,delay:.035,pan});
        break;
      case 'read': // deeper book-opening resonance; chapter OPEN FILE itself remains silent
        quietTone(ctx,{freq:440,endFreq:405,type:'triangle',gain:.00245,duration:.12,pan});
        quietTone(ctx,{freq:880,endFreq:820,gain:.0015,duration:.16,delay:.018,pan});
        quietTone(ctx,{freq:1320,endFreq:1240,gain:.00072,duration:.18,delay:.042,pan});
        break;
      case 'updates': // postal stamp + bright registration bell
        quietNoise(ctx,{gain:.0027,duration:.082,frequency:860,pan});
        quietTone(ctx,{freq:610,endFreq:600,type:'triangle',gain:.0017,duration:.08,delay:.006,pan});
        quietTone(ctx,{freq:1220,endFreq:1280,gain:.0010,duration:.12,delay:.034,pan});
        break;
      case 'gallery': // clean photographic/glass flick
        quietTone(ctx,{freq:980,endFreq:1040,gain:.0021,duration:.09,pan});
        quietTone(ctx,{freq:1710,endFreq:1600,gain:.00105,duration:.14,delay:.018,pan});
        break;
      case 'about': // warmer, lower editorial tone
        quietTone(ctx,{freq:520,endFreq:545,type:'triangle',gain:.0020,duration:.10,pan});
        quietTone(ctx,{freq:780,endFreq:800,gain:.0010,duration:.14,delay:.02,pan});
        break;
      case 'water':
        quietTone(ctx,{freq:1080,endFreq:720,gain:.0032,duration:.115,pan});
        quietTone(ctx,{freq:1620,endFreq:1320,gain:.00145,duration:.16,delay:.018,pan});
        break;
      case 'glass':
        quietTone(ctx,{freq:1260,endFreq:1380,gain:.0028,duration:.09,pan});
        quietTone(ctx,{freq:1880,endFreq:1790,gain:.0012,duration:.13,delay:.014,pan});
        break;
      case 'paper':
        quietNoise(ctx,{gain:.0027,duration:.105,frequency:1750,pan});
        quietTone(ctx,{freq:610,endFreq:560,type:'triangle',gain:.00115,duration:.07,delay:.012,pan});
        break;
      case 'wind':
        quietNoise(ctx,{gain:.0020,duration:.17,frequency:1120,pan});
        quietTone(ctx,{freq:930,endFreq:1010,gain:.00065,duration:.18,delay:.022,pan});
        break;
      case 'stamp':
        quietNoise(ctx,{gain:.0027,duration:.075,frequency:900,pan});
        quietTone(ctx,{freq:430,endFreq:410,type:'triangle',gain:.0017,duration:.075,delay:.006,pan});
        break;
      case 'menu': // tiny metallic fold for compact menu
        quietTone(ctx,{freq:690,endFreq:740,type:'triangle',gain:.0019,duration:.075,pan});
        quietTone(ctx,{freq:1035,endFreq:1110,gain:.0008,duration:.105,delay:.016,pan});
        break;
      case 'toggle': // controls cog / utility hardware
        quietTone(ctx,{freq:620,endFreq:590,type:'square',gain:.00095,duration:.045,pan});
        quietTone(ctx,{freq:940,endFreq:900,type:'triangle',gain:.00125,duration:.075,delay:.014,pan});
        break;
      case 'utility':
      default:
        quietTone(ctx,{freq:760,endFreq:735,type:'triangle',gain:.0020,duration:.07,pan});
        break;
    }
  }

  function classifyInterfaceSound(target) {
    if (!target) return null;
    // The Chapter 1 Open File / chapter archive entry is intentionally the site's
    // one silent primary interaction. Do not allow generic delegation to override it.
    if (target.matches('.chapter-archive-link,[data-silent-ui="true"]') || target.closest('.chapter-archive-link,[data-silent-ui="true"]')) return null;

    const explicitSound = target.dataset.sound || target.closest('[data-sound]')?.dataset.sound;
    const explicitMap = {
      home:'home', story:'story', characters:'characters', hisano:'hisano', history:'history',
      preview:'read', chapter:'read', updates:'updates', menu:'menu', toggle:'toggle', default:'utility'
    };
    if (explicitSound && explicitMap[explicitSound]) return explicitMap[explicitSound];

    const family = target.dataset.uiFamily || target.closest('[data-ui-family]')?.dataset.uiFamily;
    if (family) return family === 'water' ? 'water' : family === 'paper' ? 'paper' : family === 'wind' ? 'wind' : family === 'history' ? 'history' : 'utility';

    if (target.closest('.map-hotspot,.map-location-list,.map-info-tabs,.map-room-overlay,.passport-overlay')) return 'hisano';
    if (target.closest('.character-selector,.character-subnav,.character-copy-stage')) return 'characters';
    if (target.closest('.history-experience')) return 'history';
    if (target.closest('.calendar-inline,.island-calendar')) return 'hisano';
    if (target.closest('.newsletter-form')) return target.matches('[type="submit"]') ? 'updates' : 'paper';
    if (target.closest('.lore-secret,.closing-star')) return 'wind';
    if (target.matches('.archive-overlay-close,.chapter-opening-close,#reader-mode-close,#settings-close,#resume-visit-dismiss')) return 'paper';
    if (target.matches('.weather-indicator')) return 'wind';

    const section = target.closest('section')?.id;
    const sectionMap = {
      top:'home', story:'story', characters:'characters', hisano:'hisano', history:'history',
      gallery:'gallery', preview:'read', updates:'updates', about:'about'
    };
    if (section && sectionMap[section]) return sectionMap[section];

    if (target.closest('.footer-links,.site-footer')) return 'about';
    return 'utility';
  }

  function triggerPageRipple(target, event) {
    if (!target || reduceMotion || document.body.classList.contains('user-reduced-motion')) return;
    // Main-page clicks keep the quiet water-ripple language. Header controls use
    // their own sparkle system, so the two interaction styles never overlap.
    if (!target.closest('main') || target.closest('.site-header')) return;
    const layer = document.getElementById('interaction-ripple-layer');
    if (!layer) return;
    const rect = target.getBoundingClientRect();
    const hasPointer = Number.isFinite(event?.clientX) && Number.isFinite(event?.clientY) && (event.clientX !== 0 || event.clientY !== 0);
    const x = hasPointer ? event.clientX : rect.left + rect.width / 2;
    const y = hasPointer ? event.clientY : rect.top + rect.height / 2;
    const ripple = document.createElement('span');
    ripple.className = 'interaction-ripple';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    layer.appendChild(ripple);
    window.setTimeout(() => ripple.remove(), 780);
  }

  function triggerHeaderSparkle(target, event) {
    if (!target || reduceMotion || document.body.classList.contains('user-reduced-motion')) return;
    if (!target.matches('.brand,.nav-primary a,.nav-cta')) return;
    const rect = target.getBoundingClientRect();
    const x = Number.isFinite(event?.clientX) && event.clientX ? event.clientX : rect.left + rect.width / 2;
    const y = Number.isFinite(event?.clientY) && event.clientY ? event.clientY : rect.top + rect.height / 2;
    const burst = document.createElement('span');
    burst.className = 'header-click-sparkle';
    burst.style.left = `${x}px`;
    burst.style.top = `${y}px`;
    const vectors = [[-22,-14],[-7,-23],[13,-18],[24,-2],[-18,9],[8,16]];
    vectors.forEach((v,i) => {
      const star = document.createElement('i');
      star.textContent = i % 2 ? '·' : '✦';
      star.style.setProperty('--spark-x', `${v[0]}px`);
      star.style.setProperty('--spark-y', `${v[1]}px`);
      star.style.setProperty('--spark-delay', `${i * 12}ms`);
      burst.appendChild(star);
    });
    document.body.appendChild(burst);
    target.classList.remove('nav-click-flash');
    void target.offsetWidth;
    target.classList.add('nav-click-flash');
    window.setTimeout(() => target.classList.remove('nav-click-flash'), 430);
    window.setTimeout(() => burst.remove(), 650);
  }

  // Only one music fade is allowed to run at a time. Without this guard,
  // a previous fade-in can keep fighting a later fade-out (or vice versa),
  // which makes the Music button appear to work only once.
  let musicFadeFrame = null;
  let musicFadeToken = 0;
  const MUSIC_BASE_VOLUME = 0.14;
  const getMusicVolume = () => MUSIC_BASE_VOLUME * audioState.music;

  function cancelMusicFade() {
    musicFadeToken += 1;
    if (musicFadeFrame !== null) {
      cancelAnimationFrame(musicFadeFrame);
      musicFadeFrame = null;
    }
  }

  function fadeMusicTo(target, duration = 1.1, pauseWhenDone = false) {
    if (!backgroundMusic) return Promise.resolve();
    cancelMusicFade();
    const token = musicFadeToken;
    const startVolume = Number.isFinite(backgroundMusic.volume) ? backgroundMusic.volume : 0;
    const started = performance.now();

    return new Promise(resolve => {
      const step = now => {
        // A newer toggle has taken over, so this old fade must stop immediately.
        if (token !== musicFadeToken) {
          resolve();
          return;
        }

        const progress = Math.min(1, (now - started) / (duration * 1000));
        backgroundMusic.volume = Math.max(0, Math.min(1, startVolume + (target - startVolume) * progress));

        if (progress < 1) {
          musicFadeFrame = requestAnimationFrame(step);
          return;
        }

        musicFadeFrame = null;
        if (pauseWhenDone && musicMuted && token === musicFadeToken) {
          backgroundMusic.pause();
          backgroundMusic.volume = 0;
        }
        resolve();
      };

      musicFadeFrame = requestAnimationFrame(step);
    });
  }

  async function startMusic() {
    if (!backgroundMusic || musicMuted) return;
    try {
      cancelMusicFade();
      // Resume from the same point in the song rather than restarting it.
      if (backgroundMusic.paused) {
        backgroundMusic.volume = 0;
        await backgroundMusic.play();
      }
      if (!musicMuted) await fadeMusicTo(getMusicVolume(), 1.15, false);
    } catch (error) {
      musicMuted = true;
      cancelMusicFade();
      backgroundMusic?.pause();
      updateStoredPreferences();
      updateMusicUI();
      console.warn('Background music could not start:', error);
    }
  }

  async function stopMusic() {
    if (!backgroundMusic) return;
    if (backgroundMusic.paused) {
      cancelMusicFade();
      backgroundMusic.volume = 0;
      return;
    }
    await fadeMusicTo(0, .55, true);
  }

  function updateStoredPreferences() {
    try {
      localStorage.setItem('hitc-sound-muted', String(soundMuted));
      localStorage.setItem('hitc-music-muted', String(musicMuted));
    } catch (_) {}
  }

  updateSoundUI();
  updateMusicUI();

  // Try to begin the soundtrack as soon as the site loads. Browsers may block
  // audible autoplay; if they do, the first visitor interaction unlocks it.
  let autoplayNeedsGesture = false;
  async function attemptLaunchMusic() {
    if (!backgroundMusic || musicMuted) return;
    try {
      backgroundMusic.volume = 0;
      await backgroundMusic.play();
      autoplayNeedsGesture = false;
      await fadeMusicTo(getMusicVolume(), 1.35, false);
    } catch (_) {
      autoplayNeedsGesture = true;
      backgroundMusic.pause();
      backgroundMusic.volume = 0;
    }
  }

  // Defer one tick so the audio element has been parsed and attached.
  window.setTimeout(() => { void attemptLaunchMusic(); }, 0);

  const unlockLaunchMusic = () => {
    if (!musicMuted && backgroundMusic?.paused) {
      autoplayNeedsGesture = false;
      void startMusic();
    }
  };
  document.addEventListener('pointerdown', unlockLaunchMusic, { once:true, passive:true });
  document.addEventListener('keydown', unlockLaunchMusic, { once:true });

  document.addEventListener('click', event => {
    const target = event.target.closest('a[href],button');
    if (!target || target.disabled) return;
    if (target.getAttribute('aria-disabled') === 'true') event.preventDefault();
    if (target.closest('.site-header')) triggerHeaderSparkle(target, event);
    else triggerPageRipple(target, event);

    if (target === soundToggle) {
      const wasMuted = soundMuted;
      if (!wasMuted) playInterfaceSound('utility', target, true);
      soundMuted = !soundMuted;
      updateStoredPreferences();
      updateSoundUI();
      if (wasMuted && !soundMuted) playInterfaceSound('glass', target, true);
      return;
    }

    if (target === musicToggle) {
      playInterfaceSound('glass', target);
      musicMuted = !musicMuted;
      updateStoredPreferences();
      updateMusicUI();
      if (musicMuted) void stopMusic(); else void startMusic();
      return;
    }

    const family = classifyInterfaceSound(target);
    if (family) playInterfaceSound(family, target);

    // Any deliberate interaction is also a safe browser-gesture opportunity
    // to start the soundtrack after autoplay has been blocked.
    if (!musicMuted && backgroundMusic?.paused) startMusic();
  });

  document.addEventListener('change', event => {
    const input = event.target.closest('input[type="range"],input[type="checkbox"]');
    if (input) playInterfaceSound('utility', input);
  });



  // ---------- Living Hisano: opening sequence, weather, archive, map, lore ----------
  const watercolorBloom = document.getElementById('watercolor-bloom');
  const weatherIndicator = document.getElementById('weather-indicator');
  const weatherIndicatorDot = weatherIndicator?.querySelector('.weather-indicator-dot');
  const weatherIndicatorText = weatherIndicator?.querySelector('.weather-indicator-text');
  const sectionMemory = document.getElementById('section-memory');
  const seaAmbience = document.getElementById('environment-sea');
  const rainAmbience = document.getElementById('environment-rain');
  const natureAmbience = document.getElementById('character-nature');
  const nightAmbience = document.getElementById('environment-night');
  let activeSectionId = 'top';
  let activeCharacter = 'aoko';
  document.body.dataset.characterAtmosphere = activeCharacter;
  let lastEnvironmentKey = '';
  let environmentFadeTimer = null;

  function triggerWatercolorBloom(x = window.innerWidth * .5, y = window.innerHeight * .5) {
    if (!watercolorBloom || reduceMotion) return;
    watercolorBloom.style.setProperty('--bloom-x', `${x}px`);
    watercolorBloom.style.setProperty('--bloom-y', `${y}px`);
    watercolorBloom.classList.remove('is-active');
    void watercolorBloom.offsetWidth;
    watercolorBloom.classList.add('is-active');
  }

  // The full opening sequence intentionally plays on every visit.
  // Returning visitors still get memory-aware details after the intro, but the
  // title animation itself is never shortened. It can always be skipped.
  const openingSequence = document.getElementById('opening-sequence');
  const skipIntro = document.getElementById('skip-intro');
  function finishOpeningSequence() {
    if (!openingSequence || openingSequence.classList.contains('is-leaving')) return;
    openingSequence.classList.add('is-leaving');
    document.body.classList.remove('intro-active');
    window.setTimeout(() => openingSequence.remove(), 700);
  }
  if (openingSequence) {
    if (reduceMotion) {
      openingSequence.remove();
    } else {
      document.body.classList.add('intro-active');
      window.setTimeout(finishOpeningSequence, 2250);
      skipIntro?.addEventListener('click', finishOpeningSequence);
    }
  }

  const weatherStates = {
    top:        { state:'bright', icon:'☀', label:'Hisano · Calm', title:'Calm sky over Hisano' },
    story:      { state:'overcast', icon:'☁', label:'Hisano · Overcast', title:'Cloud cover gathering' },
    characters: { state:'rain', icon:'☂', label:'Hisano · Light rain', title:'Aoko weather state' },
    hisano:     { state:'sea', icon:'≋', label:'Hisano · Sea wind', title:'Coastal air over Hisano' },
    history:    { state:'clear', icon:'◌', label:'Hisano · Pressure steady', title:'Public history of Hisano' },
    scenes:     { state:'sea', icon:'≋', label:'Hisano · Evening air', title:'Evening air across Hisano' },
    gallery:    { state:'clear', icon:'◌', label:'Hisano · Light falling', title:'Late light over Hisano' },
    preview:    { state:'overcast', icon:'☁', label:'Hisano · Dusk gathering', title:'Dusk gathering over Hisano' },
    updates:    { state:'mist', icon:'◌', label:'Hisano · Visibility soft', title:'Blue-hour mist over Hisano' },
    about:      { state:'mist', icon:'✦', label:'Hisano · After sunset', title:'After sunset on Hisano' },
    'chapter-one': { state:'clear', icon:'✦', label:'Hisano · Night', title:'Night over Hisano' }
  };
  const characterWeather = {
    aoko: { state:'breeze', icon:'◌', label:'Hisano · Garden breeze', title:'Shared character atmosphere' },
    momoka: { state:'breeze', icon:'◌', label:'Hisano · Garden breeze', title:'Shared character atmosphere' },
    renji: { state:'breeze', icon:'◌', label:'Hisano · Garden breeze', title:'Shared character atmosphere' }
  };

  const environmentAudios = { sea:seaAmbience, rain:rainAmbience, nature:natureAmbience, night:nightAmbience };
  const environmentFadeFrames = new WeakMap();
  const environmentStopTimers = new Map();

  function fadeEnvironmentElement(audio, target, duration = 850, pauseAtZero = false, resetAtZero = false) {
    if (!audio) return;
    const oldFrame = environmentFadeFrames.get(audio);
    if (oldFrame) cancelAnimationFrame(oldFrame);
    const from = Number.isFinite(audio.volume) ? audio.volume : 0;
    const to = Math.max(0, Math.min(1, target));
    const began = performance.now();
    const step = now => {
      const p = Math.min(1, (now - began) / Math.max(1, duration));
      const eased = 1 - Math.pow(1 - p, 3);
      audio.volume = from + (to - from) * eased;
      if (p < 1) {
        environmentFadeFrames.set(audio, requestAnimationFrame(step));
      } else {
        environmentFadeFrames.delete(audio);
        if (pauseAtZero && to <= 0.001) {
          audio.pause();
          if (resetAtZero) audio.currentTime = 0;
        }
      }
    };
    environmentFadeFrames.set(audio, requestAnimationFrame(step));
  }

  function clearEnvironmentTimer(kind) {
    const timer = environmentStopTimers.get(kind);
    if (timer) clearTimeout(timer);
    environmentStopTimers.delete(kind);
  }

  function stopEnvironmentAudio(immediate = false) {
    Object.entries(environmentAudios).forEach(([kind,audio]) => {
      clearEnvironmentTimer(kind);
      if (!audio) return;
      if (immediate) {
        const frame = environmentFadeFrames.get(audio);
        if (frame) cancelAnimationFrame(frame);
        environmentFadeFrames.delete(audio);
        audio.pause();
        audio.currentTime = 0;
        audio.volume = 0;
      } else {
        fadeEnvironmentElement(audio, 0, 900, true, true);
      }
    });
    if (environmentFadeTimer) clearInterval(environmentFadeTimer);
    environmentFadeTimer = null;
  }

  function environmentTarget(kind) {
    const base = kind === 'sea' ? .165 : kind === 'rain' ? .185 : kind === 'nature' ? .145 : .105;
    return base * audioState.environment;
  }

  function playEnvironmentAudio(kind) {
    if (soundMuted) return;
    const audio = environmentAudios[kind] || null;
    if (!audio) return;
    const key = `${activeSectionId}:${kind}`;
    if (lastEnvironmentKey === key && !audio.paused) return;
    lastEnvironmentKey = key;

    // Crossfade rather than hard-switching ambience. The active bed arrives
    // slowly while the previous environment recedes underneath it.
    Object.entries(environmentAudios).forEach(([otherKind,otherAudio]) => {
      clearEnvironmentTimer(otherKind);
      if (!otherAudio || otherAudio === audio) return;
      fadeEnvironmentElement(otherAudio, 0, 1050, true, true);
    });

    if (audio.paused || audio.ended) {
      if (kind === 'sea' || kind === 'rain') audio.currentTime = 0;
      audio.volume = Math.min(audio.volume || 0, environmentTarget(kind));
      audio.play().catch(() => {});
    }
    fadeEnvironmentElement(audio, environmentTarget(kind), 1350, false, false);

    // Nature/night are persistent section beds; sea/rain remain short accents.
    if (kind === 'sea' || kind === 'rain') {
      const linger = kind === 'sea' ? 5200 : 4500;
      environmentStopTimers.set(kind, window.setTimeout(() => {
        fadeEnvironmentElement(audio, 0, 1250, true, true);
        environmentStopTimers.delete(kind);
      }, linger));
    }
  }

  const sectionMemoryLabels = {
    top:['00','HOME'], story:['01','STORY'], characters:['02','CHARACTERS'], hisano:['03','HISANO'], history:['04','HISTORY'], scenes:['05','SCENES'], gallery:['06','GALLERY'], preview:['07','READ'], updates:['08','UPDATES'], about:['09','ABOUT'], 'chapter-one':['10','CHAPTER 01']
  };

  function updateSectionMemory(sectionId) {
    if (!sectionMemory) return;
    const [number,label] = sectionMemoryLabels[sectionId] || sectionMemoryLabels.top;
    sectionMemory.innerHTML = `<span>${number}</span> / ${label}`;
  }

  function setWeather(sectionId, { allowSound = true } = {}) {
    activeSectionId = sectionId;
    updateSectionMemory(sectionId);
    let weather = weatherStates[sectionId] || weatherStates.top;
    if (sectionId === 'characters') weather = characterWeather[activeCharacter] || characterWeather.aoko;
    document.body.dataset.weather = weather.state;
    if (weatherIndicatorDot) weatherIndicatorDot.textContent = weather.icon;
    if (weatherIndicatorText) weatherIndicatorText.textContent = weather.label;
    if (weatherIndicator) weatherIndicator.title = `${weather.title}. Click for a hidden field note.`;
    if (!allowSound) return;
    if (sectionId === 'hisano') {
      playEnvironmentAudio('sea');
    } else if (sectionId === 'top' || sectionId === 'story' || sectionId === 'characters' || sectionId === 'gallery') {
      playEnvironmentAudio('nature');
    } else if (sectionId === 'updates' || sectionId === 'about' || sectionId === 'chapter-one') {
      playEnvironmentAudio('night');
    } else if (sectionId !== 'scenes') {
      stopEnvironmentAudio();
      lastEnvironmentKey = '';
    }
  }

  setWeather('top', { allowSound:false });
  const atmosphereSections = ['top','story','characters','hisano','history','scenes','gallery','preview','updates','about','chapter-one']
    .map(id => document.getElementById(id)).filter(Boolean);
  if ('IntersectionObserver' in window) {
    const weatherObserver = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting && entry.intersectionRatio >= .28)
        .sort((a,b) => b.intersectionRatio - a.intersectionRatio);
      if (visible[0]) setWeather(visible[0].target.id);
    }, { threshold:[.28,.45,.62], rootMargin:'-70px 0px -18% 0px' });
    atmosphereSections.forEach(section => weatherObserver.observe(section));
  }

  // Character archive tabs keep one identically-sized profile in the stage.
  const characterTabs = [...document.querySelectorAll('.character-tab')];
  const characterProfiles = [...document.querySelectorAll('.character-profile[data-character]')];
  function selectCharacter(targetId, sourceEvent) {
    const next = document.getElementById(targetId);
    if (!next) return;
    characterProfiles.forEach(profile => {
      const selected = profile === next;
      profile.hidden = !selected;
      profile.classList.toggle('is-active', selected);
    });
    characterTabs.forEach(tab => {
      const selected = tab.dataset.characterTarget === targetId;
      tab.classList.toggle('is-active', selected);
      tab.setAttribute('aria-selected', String(selected));
    });
    activeCharacter = next.dataset.character || 'aoko';
    document.body.dataset.characterAtmosphere = activeCharacter;
    if (activeSectionId === 'characters') setWeather('characters');
    const rect = next.getBoundingClientRect();
    triggerWatercolorBloom(sourceEvent?.clientX ?? rect.left + rect.width/2, sourceEvent?.clientY ?? rect.top + Math.min(rect.height/2, 320));
  }
  characterTabs.forEach(tab => tab.addEventListener('click', event => selectCharacter(tab.dataset.characterTarget, event)));

  // Interactive Hisano Archive: field notes, discovery state, public records and margin notes.
  const mapLocations = {
    northern:{
      title:'Northern Wilds',
      text:'The northern part of the island remains largely untouched. Dense forests and rugged terrain are home to diverse wildlife and pristine nature.',
      margin:'Survey markers stop appearing several kilometres before the old northern ridge. No public record explains why.'
    },
    shrine:{
      title:'Hisano Shrine',
      text:'A long-standing shrine that has been the spiritual heart of the island for generations. Locals visit to pray for fair weather, safe harvests, and peaceful lives.',
      margin:'Weather prayers became noticeably shorter after the tourism boom. Older prayer boards use a name that has since been painted over.'
    },
    aoko:{
      title:"Aoko's House",
      text:"A quiet house on a hill overlooking the town. Surrounded by trees and gardens, it is Aoko's carefully protected sanctuary.",
      margin:'There are no tourist photographs taken from the eastern road after sunset. The road is public.'
    },
    heights:{
      title:'Hinomiya Heights',
      text:'A serene residential district built along the slopes, known for clean air, beautiful views, and a strong sense of community.',
      margin:'Residents describe the district as unusually sheltered from storms. Insurance records agree. Meteorological records do not.'
    },
    school:{
      title:'Hisano High School',
      text:'The island’s public high school. Overlooking the town and sea, the campus emphasizes environmental education and community involvement.',
      margin:'The roof weather station has recorded three impossible pressure changes. Each occurred during school hours.'
    },
    town:{
      title:'Town Center',
      text:'The heart of the island: shops, cafés, schools, hospitals, public transport, and the year-round pulse of tourism.',
      margin:'The oldest businesses all remember the first year without a typhoon. They disagree about what happened the night before it.'
    },
    resort:{
      title:'Shiomi Resort',
      text:'A luxury resort district with hotels, onsen, and wellness facilities, designed around the island’s sustainability-focused image.',
      margin:'Promotional material promises “weather you can plan around.” The phrase appeared in print before the resort opened.'
    },
    port:{
      title:'Higashi Port',
      text:'The main port and docks. Ferries and fishing boats connect Hisano to the mainland and nearby islands.',
      margin:'Several captains keep handwritten weather logs instead of trusting the island forecast. None will explain why.'
    },
    beaches:{
      title:'Southern Beaches',
      text:'Crystal-clear water and pale sand make the southern beaches a centre for swimming, snorkelling, and summer festivals.',
      margin:'A photograph from fifteen summers ago shows everyone looking inland while the sea behind them is perfectly calm.'
    },
    solar:{
      title:'Solar Fields',
      text:'Large solar installations feed Hisano’s modern districts and reinforce the island’s reputation for sustainable living.',
      margin:'Output projections assume an unusual number of clear days. The calculation predates the panels.'
    }
  };
  const mapInfo = document.getElementById('map-info-card');
  const mapInfoTitle = document.getElementById('map-info-title');
  const mapInfoStatus = document.getElementById('map-info-status');
  const mapPublicRecord = document.getElementById('map-public-record');
  const mapMarginNote = document.getElementById('map-margin-note');
  const mapPublicTab = document.getElementById('map-public-tab');
  const mapMarginTab = document.getElementById('map-margin-tab');
  const mapDiscoveryCount = document.getElementById('map-discovery-count');
  const mapDiscoveryFill = document.getElementById('map-discovery-fill');
  const hotspotButtons = [...document.querySelectorAll('.map-hotspot')];
  const mapListButtons = [...document.querySelectorAll('.map-location-list [data-location]')];
  const mapTotalLocations = Object.keys(mapLocations).length;
  let selectedMapLocation = null;
  let activeMapTab = 'public';
  let discoveredLocations = new Set();

  try {
    const saved = JSON.parse(localStorage.getItem('hitc-map-discovery') || '[]');
    if (Array.isArray(saved)) discoveredLocations = new Set(saved.filter(key => mapLocations[key]));
  } catch (_) {}

  function saveDiscovery() {
    try { localStorage.setItem('hitc-map-discovery', JSON.stringify([...discoveredLocations])); } catch (_) {}
  }

  function updateMapDiscoveryUI() {
    const count = discoveredLocations.size;
    if (mapDiscoveryCount) mapDiscoveryCount.textContent = `${count} / ${mapTotalLocations} map stamps`;
    if (mapDiscoveryFill) mapDiscoveryFill.style.width = `${(count / mapTotalLocations) * 100}%`;
    hotspotButtons.forEach(btn => btn.classList.toggle('is-discovered', discoveredLocations.has(btn.dataset.location)));
    mapListButtons.forEach(btn => btn.classList.toggle('is-discovered', discoveredLocations.has(btn.dataset.location)));
  }

  function renderMapNote() {
    if (!selectedMapLocation) return;
    const location = mapLocations[selectedMapLocation];
    if (!location) return;
    if (mapInfoTitle) mapInfoTitle.textContent = location.title;
    if (mapInfoStatus) mapInfoStatus.textContent = `FIELD NOTE / ${discoveredLocations.has(selectedMapLocation) ? 'DISCOVERED' : 'UNOPENED'}`;
    if (mapPublicRecord) mapPublicRecord.innerHTML = `<p>${location.text}</p>`;
    if (mapMarginNote) mapMarginNote.innerHTML = `<p>${location.margin || 'No handwritten annotation has been recovered for this file.'}</p>`;
  }

  function setMapTab(tab) {
    activeMapTab = tab === 'margin' ? 'margin' : 'public';
    const showPublic = activeMapTab === 'public';
    if (mapPublicRecord) mapPublicRecord.hidden = !showPublic;
    if (mapMarginNote) mapMarginNote.hidden = showPublic;
    if (mapPublicTab) {
      mapPublicTab.classList.toggle('is-active', showPublic);
      mapPublicTab.setAttribute('aria-selected', String(showPublic));
    }
    if (mapMarginTab) {
      mapMarginTab.classList.toggle('is-active', !showPublic);
      mapMarginTab.setAttribute('aria-selected', String(!showPublic));
    }
    if (!showPublic && selectedMapLocation) triggerWatercolorBloom(window.innerWidth * .58, window.innerHeight * .55);
  }

  function selectMapLocation(key, event) {
    const location = mapLocations[key];
    if (!location || !mapInfo) return;
    selectedMapLocation = key;
    const wasNew = !discoveredLocations.has(key);
    discoveredLocations.add(key);
    saveDiscovery();
    updateMapDiscoveryUI();
    renderMapNote();
    setMapTab('public');
    hotspotButtons.forEach(btn => btn.classList.toggle('is-active', btn.dataset.location === key));
    mapListButtons.forEach(btn => btn.classList.toggle('is-active', btn.dataset.location === key));
    const target = event?.currentTarget;
    const rect = target?.getBoundingClientRect();
    triggerWatercolorBloom(event?.clientX ?? (rect ? rect.left + rect.width/2 : window.innerWidth*.5), event?.clientY ?? (rect ? rect.top + rect.height/2 : window.innerHeight*.5));
    if (wasNew && discoveredLocations.size === mapTotalLocations && loreNote && loreNoteText) {
      loreNoteText.textContent = 'Every marked place on the island map has been visited. Your Hisano field stamps are complete.';
      loreNote.hidden = false;
    }
  }

  hotspotButtons.forEach(btn => {
    btn.addEventListener('click', event => selectMapLocation(btn.dataset.location, event));
    btn.addEventListener('mouseenter', () => btn.classList.add('is-hovered'));
    btn.addEventListener('mouseleave', () => btn.classList.remove('is-hovered'));
  });
  mapListButtons.forEach(btn => btn.addEventListener('click', event => selectMapLocation(btn.dataset.location, event)));
  mapPublicTab?.addEventListener('click', () => setMapTab('public'));
  mapMarginTab?.addEventListener('click', () => setMapTab('margin'));
  updateMapDiscoveryUI();

  // Hidden field notes / easter eggs.
  const loreNote = document.getElementById('lore-note');
  const loreNoteText = document.getElementById('lore-note-text');
  const loreNotes = {
    calm:'Aoko learned early that everyone congratulated the blue sky before asking how she felt.',
    forecast:'Hisano’s forecasts have been unusually reliable for fifteen years. Most visitors call it luck.',
    'fifteen-years':'The tourism boom and the island’s perfect climate began in the same year. Official histories rarely place those facts side by side.',
    shoreline:'At low tide, the old seawall still carries a faded line: “Do not thank the sky where she can hear you.”'
  };
  let weatherSecretClicks = 0;
  let weatherSecretTimer = null;
  weatherIndicator?.addEventListener('click', event => {
    weatherSecretClicks += 1;
    if (weatherSecretTimer) clearTimeout(weatherSecretTimer);
    weatherSecretTimer = setTimeout(() => { weatherSecretClicks = 0; }, 4200);
    if (weatherSecretClicks < 5) return;
    weatherSecretClicks = 0;
    document.body.classList.add('sunshower-secret');
    if (weatherIndicatorDot) weatherIndicatorDot.textContent = '☀☂';
    if (weatherIndicatorText) weatherIndicatorText.textContent = 'Hisano · Sunshower';
    if (loreNote && loreNoteText) {
      loreNoteText.textContent = '“Sometimes I think the rain is the only part of me that gets to say what it wants.” — Aoko';
      loreNote.hidden = false;
    }
    triggerWatercolorBloom(event.clientX, event.clientY);
    playEnvironmentAudio('rain');
    window.setTimeout(() => {
      document.body.classList.remove('sunshower-secret');
      setWeather(activeSectionId, { allowSound:false });
    }, 5200);
  });

  document.querySelectorAll('.lore-secret').forEach(secret => secret.addEventListener('click', event => {
    const text = loreNotes[secret.dataset.loreId];
    if (!text || !loreNote || !loreNoteText) return;
    loreNoteText.textContent = text;
    loreNote.hidden = false;
    triggerWatercolorBloom(event.clientX, event.clientY);
  }));
  document.getElementById('lore-note-close')?.addEventListener('click', () => { if (loreNote) loreNote.hidden = true; });

  // Closing sequence: soften the music as the island fades out, then restore it if the visitor scrolls back up.
  const closingSequence = document.getElementById('closing-sequence');
  let closingMusicDipped = false;
  if (closingSequence && 'IntersectionObserver' in window) {
    const closingObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio > .42) {
          closingSequence.classList.add('is-near-end');
          if (!musicMuted && backgroundMusic && !backgroundMusic.paused && !closingMusicDipped) {
            closingMusicDipped = true;
            void fadeMusicTo(getMusicVolume() * .10, 1.95, false);
          }
        } else if (closingMusicDipped) {
          closingSequence.classList.remove('is-near-end');
          closingMusicDipped = false;
          if (!musicMuted && backgroundMusic && !backgroundMusic.paused) void fadeMusicTo(getMusicVolume(), 1.2, false);
        }
      });
    }, { threshold:[.18,.42,.7] });
    closingObserver.observe(closingSequence);
  }

  // Keep environmental audio tied to the master Sound toggle.
  soundToggle?.addEventListener('click', () => {
    if (soundMuted) {
      stopEnvironmentAudio(true);
      lastEnvironmentKey = '';
    } else if (activeSectionId === 'hisano') {
      playEnvironmentAudio('sea');
    } else if (activeSectionId === 'characters' || activeSectionId === 'gallery') {
      playEnvironmentAudio('nature');
    }
  });

  window.HITC_AUDIO_API = {
    setMusicLevel(value) {
      audioState.music = clamp01(value);
      try { localStorage.setItem('hitc-volume-music', String(audioState.music)); } catch (_) {}
      if (!musicMuted && backgroundMusic && !backgroundMusic.paused) void fadeMusicTo(getMusicVolume(), .24, false);
    },
    setEnvironmentLevel(value) {
      audioState.environment = clamp01(value);
      try { localStorage.setItem('hitc-volume-environment', String(audioState.environment)); } catch (_) {}
      const active = [natureAmbience, nightAmbience, seaAmbience, rainAmbience].find(a => a && !a.paused);
      if (active) {
        const kind = active === natureAmbience ? 'nature' : active === nightAmbience ? 'night' : active === seaAmbience ? 'sea' : 'rain';
        active.volume = environmentTarget(kind);
      }
    },
    setUiLevel(value) {
      audioState.ui = clamp01(value);
      try { localStorage.setItem('hitc-volume-ui', String(audioState.ui)); } catch (_) {}
    },
    playEnvironment(kind) { playEnvironmentAudio(kind); },
    stopEnvironment() { stopEnvironmentAudio(); lastEnvironmentKey = ''; },
    musicTarget() { return getMusicVolume(); },
    duckMusic(factor = .24, duration = .9) {
      if (!musicMuted && backgroundMusic && !backgroundMusic.paused) void fadeMusicTo(getMusicVolume() * Math.max(0, Math.min(1, factor)), duration, false);
    },
    restoreMusic(duration = 1.15) {
      if (!musicMuted && backgroundMusic && !backgroundMusic.paused) void fadeMusicTo(getMusicVolume(), duration, false);
    },
    musicMuted() { return musicMuted; },
    soundMuted() { return soundMuted; },
    playUi(kind, target) { playInterfaceSound(kind, target); }
  };

})();
