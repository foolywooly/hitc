# Head in the Clouds — v26 Graphics & Motion Guide

The website remains asset-driven: CSS handles layout and restrained transitions; expressive scenery and weather should come from real supplied artwork/animation.

## Current core artwork

| Purpose | Path | Recommended format |
|---|---|---|
| Site watercolor background | `assets/decorations/site-ambient-background.png` | PNG/WebP |
| Aoko character sheet | `assets/characters/aoko.png` | Transparent PNG |
| Momoka character sheet | `assets/characters/momoka-tachibana.png` | Transparent PNG |
| Hisano map | `assets/world/hisano-map.png` | PNG/WebP |
| Hero key visual | `assets/hero/hero-key-visual.png` | PNG/JPG/WebP |
| Chapter art 01 | `assets/preview/chapter-01-key.jpg` | JPG/WebP |

Missing optional art deliberately stays quiet instead of generating fake scenery.

## Hisano 2011 / Then–Now

When a dedicated historical map exists, put it somewhere such as:

`assets/world/hisano-map-2011.png`

Then in `assets.config.js` set:

```js
window.HITC_PERIOD_ASSETS = {
  hisano2011: "assets/world/hisano-map-2011.png"
};
```

Until then, the Then / Now component clearly identifies the older side as a reconstruction framework and never alters the main interactive map.

## Production animation slots

Configure in `window.HITC_ANIMATIONS` inside `assets.config.js`.

| Key | Suggested asset | Use |
|---|---|---|
| `aokoAtmosphere` | `assets/animations/aoko-atmosphere.webm` | Your custom Aoko weather animation |
| `characterAtmosphere` | `assets/animations/character-atmosphere.webm` | Shared Characters nature/air layer |
| `heroClouds` | `assets/animations/hero-clouds.webm` | Hero atmospheric movement |
| `hisanoSea` | `assets/animations/hisano-sea.webm` | Hisano coastal movement |
| `historyEra` | `assets/animations/history-era.webm` | History atmosphere |
| `galleryAtmosphere` | `assets/animations/gallery-atmosphere.webm` | Gallery atmosphere |
| `chapterPortal` | `assets/animations/chapter-portal.webm` | Chapter opening presentation |
| `closingCoast` | `assets/animations/closing-coast.webm` | Final coastline |
| `nightSky` | `assets/animations/night-sky.webm` | Late-site / closing night layer |

Aoko's old generated CSS rain remains disabled. The `aokoAtmosphere` slot is specifically reserved for the animation you supply later.

## Location illustrations

Optional landscape art can be added without changing the map layout:

- `assets/world/locations/northern.jpg`
- `assets/world/locations/shrine.jpg`
- `assets/world/locations/aoko.jpg`
- `assets/world/locations/heights.jpg`
- `assets/world/locations/school.jpg`
- `assets/world/locations/town.jpg`
- `assets/world/locations/resort.jpg`
- `assets/world/locations/solar.jpg`
- `assets/world/locations/port.jpg`
- `assets/world/locations/beaches.jpg`

Around 1600×900 works well.
