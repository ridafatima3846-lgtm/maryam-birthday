# BIRDI 🎬 — A Personal Birthday Streaming Platform

BIRDI is a NETFLIX-style streaming website built as a birthday surprise for one
very special person. Instead of movies, it streams **your friend's own videos,
photos and memories** — presented like a premium streaming service.

> No server, no build step. Open `index.html` and it runs. Put it on any static
> host (GitHub Pages, Netlify, Vercel, your phone) and send her the link.

---

## Quick start

1. **Open it** — double-click `index.html` (works from `file://`), or run a local
   server:

   ```
   npx serve .
   # or:  python -m http.server 8000
   ```

2. **Replace the name & messages** — edit `js/data.js` (section 1, `CONFIG`).
   The friend's name, hero text, final message and surprise message all live here.

3. **Add your own photos & videos** — drop files into `assets/` and point the
   items in `js/data.js` at them. Full example below.

---

## How the placeholder system works

This site works **out of the box with zero media files**, so you can preview the
whole experience immediately:

- **Posters** — every title has an automatically-generated cinematic SVG poster
  in `assets/posters/`. Replace them by pointing an item's `poster` field at your
  own image (e.g. `poster: "assets/photos/friends.jpg"`).
- **Videos** — if an item's video file is missing, the player plays a beautiful
  animated *"placeholder film"* with the title on it. Drop in a real `.mp4` and it
  plays automatically — no code changes needed.
- **Music** — if `CONFIG.audio` is empty, a gentle ambient theme is synthesised
  in the browser (no file needed). Add your own `.mp3` and set the path to use it.

This means you can hand her the link today, and the videos she would have missed
still look intentional and cinematic.

---

## Customising the content

Everything is in **`js/data.js`** — one file, plain objects, no build tools.

### 1) The basics (`CONFIG`)

```js
CONFIG = {
  friendName: "Maryam",           // her name, everywhere
  brand: "NETFLIX",               // platform name
  tagline: "A Special Story Made Just For You",
  heroDescription: "...",         // short emotional paragraph
  audio: "assets/audio/birthday-song.mp3",  // drop birthday-song.mp3 in assets/audio/
  audioTitle: "NETFLIX Theme",
  profile: { name: "Maryam", subtitle: "Today's special viewer", avatar: "assets/posters/avatar.svg" },
  hero: {                        // home banner
    line1: "HAPPY BIRTHDAY,",
    line2: "MARYAM",
    tagline: "...",
    description: "...",
    bg: "assets/posters/hero.svg",        // backdrop (replace with her photo)
    playId: "the-birthday-movie",         // what PLAY opens
    moreId: "our-story"                   // what MORE INFO opens
  },
  birthday: { kicker, title, heading, description, playId },
  secret:   { label, hint, title, message: [...], signoff },
  final:    { title, lines: [...], sub, brand }
}
```

### 2) Adding a video

Add an object to the `ITEMS` array:

```js
{
  id: "our-first-memory",                 // unique, used in links & My List
  type: "video",                          // video | photo | series | special
  title: "Our First Memory",
  category: "Friendship • Memories",
  duration: "05:42",
  date: "March 15, 2023",                 // optional
  year: "2023",                           // optional
  description: "The beginning of our beautiful friendship.",
  poster: "assets/posters/our-first-memory.svg",  // or your own photo
  video: "assets/videos/our-first-memory.mp4",    // optional — placeholder film if missing
  subtitles: "assets/subtitles/our-first-memory.vtt", // optional
  tags: ["friendship", "love"],
  mcat: "Friendship"                      // used by the Memories filter (see list below)
}
```

Then add `"our-first-memory"` to any row in `ROWS`, e.g. `trending`, or create a
new row:

```js
{ id: "new", title: "Made With Love", items: ["our-first-memory", ...] }
```

### 3) Adding a photo memory

```js
{
  id: "beach-day",
  type: "photo",
  title: "Beach Day",
  category: "Trips • Salt & Sun",
  date: "Summer 2025",
  description: "We got lost, got sunburned, and found the best day ever.",
  images: ["assets/photos/beach-1.jpg", "assets/photos/beach-2.jpg"], // slideshow images
  poster: "assets/photos/beach-1.jpg",
  tags: ["trip", "beach"],
  mcat: "Trips"
}
```

### 4) Adding episodes to the series

Episodes are normal items with two extra fields:

```js
{
  id: "ep-the-beginning",
  type: "video",
  episodeOf: "our-story",     // parent series id
  episodeNumber: 2,
  title: "The Beginning",
  duration: "05:04",
  ...
}
```

They appear automatically in the series' episode list on its details page.

### 5) Regenerating placeholder posters

After adding new items, regenerate their cinematic posters:

```
cd tools
npm install        # only needed once
npm run posters
```

`generate-posters.js` reads `js/data.js` and writes an SVG poster for every item.

---

## The Memories filter categories

Each memory item has an `mcat` field, matched against the filter chips:

`Childhood` • `Friendship` • `University` • `Trips` • `Funny Moments` • `Special Days` • `Random Memories` • `Birthday Memories`

---

## Features (all included)

- Cinematic **loading screen** → **"Who's watching?" profile** → home
- Full-screen **hero banner** with birthday title + PLAY / MORE INFO
- 9 horizontal **streaming rows** with hover-reveal movie cards
- **Details pages** with backdrop, description, duration, category, My List,
  episodes and "More Like This"
- **Cinematic player**: play/pause, seek, volume, speed (0.5–2×), captions,
  picture-in-picture, fullscreen, keyboard shortcuts, auto-hiding controls,
  cinematic fade-in, and an **"Up Next" end screen**
- **Memories page** with category filters + **photo slideshow** (prev/next)
- **Birthday Special** page → the flagship birthday movie
- **Search** with live results and quick chips
- **My List** saved in `localStorage`
- **Secret surprise** ("DON'T OPEN THIS YET") with confetti reveal
- **Final message** screen with floating hearts and music
- **Background music** that starts after the first tap, mutes, and ducks while
  videos play
- Fully **responsive** (desktop / tablet / mobile)

---

## Project structure

```
├── index.html            # single-page shell
├── css/styles.css        # the whole cinematic theme
├── js/
│   ├── data.js           # ★ ALL CONTENT — edit this
│   ├── store.js          # localStorage (My List, settings)
│   ├── music.js          # background music engine
│   ├── player.js         # video player + placeholder film
│   └── app.js            # router + screens
├── assets/
│   ├── posters/          # generated SVG posters, hero, logo, avatar
│   ├── photos/           # ← drop your photos here
│   ├── videos/           # ← drop your .mp4 files here
│   └── audio/            # ← drop your music here
└── tools/
    ├── generate-posters.js   # poster generator
    ├── smoke-test.js         # runs the whole site in jsdom and checks every flow
    └── player-test.js        # tests the video player end-to-end
```

---

## Testing

```
cd tools
npm install
npm test            # full site flow (27 checks)
npm run test:player # video player (14 checks)
```

---

## Deploying & sending the link

The site is fully static — put the whole folder on any host:

- **GitHub Pages** — push the folder to a repo → Settings → Pages → deploy
- **Netlify** — drag & drop the folder at app.netlify.com
- **Vercel** — `vercel` from the folder

Then just send her the URL. When she opens it: loader → her profile →
**HAPPY BIRTHDAY** hero → her own personal library. 🎉
