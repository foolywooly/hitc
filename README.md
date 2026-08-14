# Head in the Clouds — v33

## Mobile Pocket Edition

This build adds a dedicated phone presentation without changing the desktop art direction. On screens up to 760px wide, the site becomes a section-based pocket companion rather than one enormous vertical page.

## v31 — Guided Hisano presentation

This build focuses on making the two flagship interactions — the **Hisano Map Room** and **Watch Hisano** trailer — feel like deliberate presentation pieces rather than content forced into the page.

See `V31_NOTES.txt` for the concise change log.

### Current presentation

- full opening animation on every visit
- stable sticky header and detailed sound controls
- Story / Characters / Hisano / History / Read / Updates structure
- Aoko, Momoka and Renji locked character-sheet presentation
- Aoko featured voiced scene with subtitles
- shared Characters nature ambience
- Profile / Relations / Notes character presentation
- Hisano map discovery contained entirely inside the map experience
- full-screen Hisano Map Room with field notes and Passport progress
- real-date 2011–2026 History timeline
- empty exhibition-style Gallery slots ready for future artwork
- silent Chapter 1 Open File interaction
- cinematic day-to-night descent and closing sequence
- Letters from Hisano email signup
- authored animation slots for future WebM/MP4 assets
- narrated **Watch Hisano** guided trailer with supplied voiceover and subtle echo
- `情景を読み込み中 / LOADING SCENE` loading language for major visual experiences

### Important files

- `index.html` — structure/content
- `styles.css` — visual system
- `script.js` — core site/audio/map behavior
- `experience-v31.js` — directed presentation, Map Room, Gallery and narrated trailer
- `assets.config.js` — asset/release/newsletter configuration
- `GRAPHICS_GUIDE.md` — artwork and animation slots
- `MUSIC_AND_SOUND_GUIDE.txt` — audio guidance
- `NEWSLETTER_SETUP.txt` — newsletter provider setup
- `V31_NOTES.txt` — v31 changes

### Narrated trailer audio

`assets/audio/hisano-trailer-narration.mp3`

This is the supplied narration with a restrained echo treatment already applied. Replacing this file later preserves the trailer implementation.

### Deployment

The folder can be served locally with VS Code Live Server or deployed as a static site to GitHub Pages, Netlify, Vercel or Cloudflare Pages.


## v34 — Mobile Pocket Edition refinement

The phone presentation is now intentionally different from desktop: one destination at a time, swipe-led content, compact navigation, visual guidance cues, and a mobile Map Room. Desktop remains the original cinematic scroll composition. Mobile visitors can choose **Extended View** to open the desktop composition on the same URL using `?view=desktop`.

Audio now pauses when the browser/app is backgrounded on iOS. Aoko's featured dialogue on desktop is invitation-gated rather than autoplayed. See `V34_NOTES.txt`.
