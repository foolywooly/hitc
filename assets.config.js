/*
  HEAD IN THE CLOUDS — ASSET CONFIG
  ---------------------------------
  To add/change site graphics, usually you only need to:
  1) put an image in /assets/...
  2) change the matching src below if the filename differs.

  Missing optional artwork is handled gracefully: the site keeps its layout
  and shows an editorial placeholder instead of a broken image icon.
*/
window.HITC_ASSETS = {
  heroKeyVisual: {
    src: "assets/hero/hero-key-visual.png",
    alt: "Key visual artwork for Head in the Clouds"
  },
  heroCloudOverlay: {
    src: "assets/hero/hero-clouds.png",
    alt: "",
    decorative: true
  },
  storyDivider: {
    src: "assets/decorations/story-divider.png",
    alt: "",
    decorative: true
  },
  characterDecorationLeft: {
    src: "assets/decorations/characters-left.png",
    alt: "",
    decorative: true
  },
  characterDecorationRight: {
    src: "assets/decorations/characters-right.png",
    alt: "",
    decorative: true
  },
  hisanoMap: {
    src: "assets/world/hisano-map.png",
    alt: "Illustrated map of Hisano Island"
  },
  worldDivider: {
    src: "assets/decorations/world-divider.png",
    alt: "",
    decorative: true
  },
  previewPage1: {
    src: "assets/preview/page-01.jpg",
    alt: "Head in the Clouds novel preview artwork one"
  },
  previewPage2: {
    src: "assets/preview/page-02.jpg",
    alt: "Head in the Clouds novel preview artwork two"
  },
  previewPage3: {
    src: "assets/preview/page-03.jpg",
    alt: "Head in the Clouds novel preview artwork three"
  },
  footerDecoration: {
    src: "assets/decorations/footer.png",
    alt: "",
    decorative: true
  }
};


/* SITE EVOLUTION CONFIG
   Change currentChapter when a chapter is published.
   0 = pre-release, 1 = Chapter 1 available, 2 = Chapter 2 available, etc.
   seasonalEvent can be "auto", "summer", "winter", "typhoon", or "none". */
window.HITC_RELEASE = {
  currentChapter: 0,
  siteEdition: "029",
  seasonalEvent: "auto"
};


/* OPTIONAL MOTION ASSETS
   Leave src blank until you have your own animation. When Ben supplies a WebM/MP4,
   place it in assets/animations and set the src here. The site will mount it
   without changing the surrounding layout. */
window.HITC_ANIMATIONS = {
  aokoAtmosphere: { src: "", loop: true, muted: true },
  heroClouds: { src: "", loop: true, muted: true },
  hisanoSea: { src: "", loop: true, muted: true },
  closingCoast: { src: "", loop: true, muted: true },
  characterAtmosphere: { src: "", loop: true, muted: true },
  nightSky: { src: "", loop: true, muted: true },
  thenMapOverlay: { src: "", loop: true, muted: true },
  historyEra: { src: "", loop: true, muted: true },
  galleryAtmosphere: { src: "", loop: true, muted: true },
  chapterPortal: { src: "", loop: true, muted: true },
  storyAtmosphere: { src: "", loop: true, muted: true },
  charactersNature: { src: "", loop: true, muted: true },
  historySky: { src: "", loop: true, muted: true },
  readAtmosphere: { src: "", loop: true, muted: true },
  scenesAtmosphere: { src: "", loop: true, muted: true }
};

/* NEWSLETTER CONNECTION
   The form is fully styled and validated in local preview. To make it send real
   subscriptions on the public site, paste your mailing provider's form/API endpoint
   below. Set json:false for classic form endpoints that expect URL-encoded data. */
window.HITC_NEWSLETTER = {
  endpoint: "",
  method: "POST",
  json: true
};


/* OPTIONAL LOCATION ILLUSTRATIONS
   Add artwork gradually. The map field-note panel will automatically use a file
   when it exists; otherwise it keeps an elegant placeholder without a broken image. */
window.HITC_LOCATION_IMAGES = {
  northern: "assets/world/locations/northern.jpg",
  shrine: "assets/world/locations/shrine.jpg",
  aoko: "assets/world/locations/aoko.jpg",
  heights: "assets/world/locations/heights.jpg",
  school: "assets/world/locations/school.jpg",
  town: "assets/world/locations/town.jpg",
  resort: "assets/world/locations/resort.jpg",
  solar: "assets/world/locations/solar.jpg",
  port: "assets/world/locations/port.jpg",
  beaches: "assets/world/locations/beaches.jpg"
};


/* OPTIONAL PERIOD ARTWORK
   Add a dedicated 2011 Hisano map when it exists. Until then the Then / Now
   feature explicitly presents its older side as a reconstruction framework. */
window.HITC_PERIOD_ASSETS = {
  hisano2011: ""
};


/* OPTIONAL SCORE VARIANTS / v29
   The current background-music.mp3 remains the fallback. If later you export
   matching morning/dusk/chapter/ending variants, put them in assets/audio and
   set the paths here. v29 will crossfade only when a real variant exists. */
window.HITC_SCORE_VARIANTS = {
  morning: "",
  afternoon: "",
  dusk: "",
  chapter: "",
  ending: ""
};
