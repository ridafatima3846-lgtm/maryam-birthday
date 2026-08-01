/* =====================================================================
   BIRDI — Personal Birthday Streaming Platform
   ---------------------------------------------------------------
   THIS FILE IS YOUR CONTENT CONTROL ROOM.
   Edit titles, descriptions, dates, categories and file paths here.
   Add new movies / memories as new objects inside ITEMS, then add
   their id to any row you like in ROWS.

   REPLACE FILES (drop-in — no editing needed):
     - Birthday song -> drop assets/audio/birthday-song.mp3
     - Photos        -> drop assets/photos/<memory-name>.jpg
                        (e.g. summer-trip.jpg, golden-hour.jpg,
                         late-night-talks.jpg, tiny-moments.jpg, that-laugh.jpg)
     - Videos        -> drop assets/videos/<title-id>.mp4
                        (e.g. the-birthday-movie.mp4, our-friendship.mp4,
                         ep-how-we-met.mp4, ...)
     If a file is missing, the site shows a beautiful animated placeholder
     instead — so it always looks complete, and your real content just
     swaps in when you add it.
   ===================================================================== */

(function (root) {
  "use strict";

  /* ---------------------------------------------------------------
     1) GLOBAL CONFIG  — change the name, messages and audio here
  --------------------------------------------------------------- */
  var CONFIG = {
    // The friend this whole experience was built for
    friendName: "Maryam",

    // Brand name of the platform (change to whatever you like)
    brand: "NETFLIX",

    // Hero tagline + emotional description
    tagline: "A Special Story Made Just For You",
    heroDescription:
      "Twelve months of memories and a lifetime of feelings. This isn't a show to binge — it's a story you lived. Press play on the moments we made together, and don't skip a single one.",

    // Optional background music file. Drop your birthday song into
    // assets/audio/ named exactly "birthday-song.mp3" and it will play
    // automatically — no editing needed. Until the file exists, the
    // built-in gentle music-box theme plays instead (never silent).
    audio: "assets/audio/birthday-song.mp3",
    audioTitle: "NETFLIX Theme",

    // ---- TEASER / COMING SOON MODE -------------------------------
    // While `locked` is true, the site shows ONLY one teaser screen:
    // your picture + "Coming Soon" + the date below. Nothing else can
    // open — perfect until release day. Set `locked: false` to open
    // the full experience.
    locked: false,
    // Password required on the login gate before the site opens
    loginPass: "Maryam12",
    // A short line shown on every page (set to "" to hide)
    banner: "All for you to watch on your birthday day",
    comingSoon: {
      image: "assets/photos/pic1.jpeg",
      label: "NEW PREMIERE",
      date: "14 AUGUST",
      note: "A very special birthday story is almost here…",
      playId: "coming-soon",
      playLabel: "WATCH TEASER"
    },

    // Profile screen
    profile: {
      name: "Maryam",
      subtitle: "Today's special viewer",
      avatar: "assets/posters/avatar.svg"
    },

    // Home hero banner content
    hero: {
      line1: "NEW PREMIERE",
      line2: "COMING SOON",
      tagline: "Releasing 14 August",
      description:
        "Her birthday is coming soon… A very special story arrives on 14 August, with every trip, laugh and memory we made together.",
      bg: "assets/photos/pic1.jpeg",
      playId: "coming-soon",
      playLabel: "WATCH TEASER",
      moreId: ""
    },

    // Birthday Special section (nav "Birthday")
    birthday: {
      kicker: "BIRTHDAY SPECIAL",
      title: "The Birthday Movie",
      heading: "Happy Birthday, Maryam",
      description:
        "Today isn't just another day. It's the release of the most important story of the year — YOUR STORY.",
      playId: "the-birthday-movie"
    },

    // Hidden surprise reveal
    secret: {
      label: "DON'T OPEN THIS YET",
      hint: "One Last Surprise",
      title: "One Last Surprise",
      message: [
        "You made it to the end. That means you followed the whole story — the laughs, the quiet moments, and everything in between.",
        "So here it is: I hope you know how much you are loved. Not just today. Every single day.",
        "Happy Birthday, Maryam. I can't wait to write the next chapter with you."
      ],
      signoff: "— from the person who made this for you"
    },

    // Final cinematic screen
    final: {
      title: "HAPPY BIRTHDAY, MARYAM",
      lines: [
        "Thank you for being one of the most beautiful chapters of my story.",
        "You deserve the whole world — and the whole world starts today.",
        "Make a wish. And never forget how loved you are."
      ],
      sub: "A story made with love",
      brand: "NETFLIX"
    }
  };

  /* ---------------------------------------------------------------
     2) CONTENT ITEMS
        type:
          "video"  -> plays a video file (or cinematic placeholder)
          "photo"  -> photo memory (cinematic slideshow)
          "series" -> a collection of episodes
          "special"-> a flagship birthday movie
        The `video` field is optional. If the file doesn't exist yet,
        the player plays a beautiful animated placeholder film.
  --------------------------------------------------------------- */
  var ITEMS = [
    {
      id: "coming-soon",
      type: "special",
      title: "Coming Soon",
      category: "The Birthday Movie • Releasing Soon",
      duration: "Coming 14 August",
      date: "14 August",
      year: "2026",
      description:
        "The girl's birthday is coming soon. A very special story — her story — arrives on 14 August with every trip, laugh and memory we made together.",
      video: "assets/videos/video3.mp4",
      release: "14 AUGUST",
      subtitle: "Her Birthday Is Coming Soon",
      teaser: true,
      tags: ["coming soon", "teaser", "birthday", "premiere"],
      mcat: "Birthday Memories"
    },
    {
      id: "the-birthday-movie",
      type: "special",
      title: "The Birthday Movie",
      category: "Birthday Special • Made With Love",
      duration: "05:20",
      date: "Today",
      year: "2026",
      description:
        "Today isn't just another day. It's the release of the most important story of the year — YOUR STORY. Press play and let the film begin.",
      video: "assets/videos/the-birthday-movie.mp4",
      tags: ["birthday", "special", "love", "surprise", "movie"],
      mcat: "Birthday Memories",
      featured: true
    },
    {
      id: "our-story",
      type: "series",
      title: "Our Story",
      category: "Series • The Main Chapter",
      duration: "6 Episodes",
      year: "The Full Season",
      description:
        "Every friendship has a story. This is ours — told the way only we know how. Six chapters, six little pieces of everything we've been through.",
      episodes: [
        "ep-how-we-met",
        "ep-the-beginning",
        "ep-crazy-memories",
        "ep-our-best-moments",
        "ep-things-i-never-said",
        "ep-birthday-message"
      ],
      tags: ["series", "story", "friendship", "episodes"],
      mcat: "Friendship"
    },
    {
      id: "ep-how-we-met",
      type: "video",
      episodeOf: "our-story",
      episodeNumber: 1,
      title: "How We Met",
      category: "Our Story • Episode 1",
      duration: "04:12",
      date: "The Beginning",
      year: "Episode 1",
      description:
        "It started with a hello. Nobody knew then that one small moment would become this whole beautiful story.",
      video: "assets/videos/ep-how-we-met.mp4",
      tags: ["series", "story", "episode", "how we met"],
      mcat: "Friendship"
    },
    {
      id: "ep-the-beginning",
      type: "video",
      episodeOf: "our-story",
      episodeNumber: 2,
      title: "The Beginning",
      category: "Our Story • Episode 2",
      duration: "05:04",
      date: "Early Days",
      year: "Episode 2",
      description:
        "The first laughs, the first inside jokes, the first 'we're going to be friends for life' feeling. This is where it all took off.",
      video: "assets/videos/ep-the-beginning.mp4",
      tags: ["series", "story", "episode", "beginning"],
      mcat: "Friendship"
    },
    {
      id: "ep-crazy-memories",
      type: "video",
      episodeOf: "our-story",
      episodeNumber: 3,
      title: "Crazy Memories",
      category: "Our Story • Episode 3",
      duration: "06:31",
      date: "Chaos Days",
      year: "Episode 3",
      description:
        "The plans that went wrong, the jokes that went too far, the stories we still laugh about. Chaos, but make it ours.",
      video: "assets/videos/ep-crazy-memories.mp4",
      tags: ["series", "story", "episode", "crazy", "funny"],
      mcat: "Funny Moments"
    },
    {
      id: "ep-our-best-moments",
      type: "video",
      episodeOf: "our-story",
      episodeNumber: 4,
      title: "Our Best Moments",
      category: "Our Story • Episode 4",
      duration: "05:47",
      date: "Golden Days",
      year: "Episode 4",
      description:
        "The days we'd replay if we could — the wins, the celebrations, the everything we got to share side by side.",
      video: "assets/videos/ep-our-best-moments.mp4",
      tags: ["series", "story", "episode", "best moments"],
      mcat: "Special Days"
    },
    {
      id: "ep-things-i-never-said",
      type: "video",
      episodeOf: "our-story",
      episodeNumber: 5,
      title: "Things I Never Said",
      category: "Our Story • Episode 5",
      duration: "07:02",
      date: "From The Heart",
      year: "Episode 5",
      description:
        "The words I kept too long. The things that matter most. This episode is a little less funny and a lot more honest.",
      video: "assets/videos/ep-things-i-never-said.mp4",
      tags: ["series", "story", "episode", "feelings", "honest"],
      mcat: "Birthday Memories"
    },
    {
      id: "ep-birthday-message",
      type: "video",
      episodeOf: "our-story",
      episodeNumber: 6,
      title: "Birthday Message",
      category: "Our Story • Episode 6",
      duration: "03:58",
      date: "Today",
      year: "Episode 6",
      description:
        "The finale. A message made for today, for you, and for everything you are. Play it when you're ready.",
      video: "assets/videos/ep-birthday-message.mp4",
      tags: ["series", "story", "episode", "birthday", "message"],
      mcat: "Birthday Memories"
    },
    {
      id: "our-friendship",
      type: "video",
      title: "Our Friendship",
      category: "Friendship • Memories",
      duration: "08:32",
      date: "Since Day One",
      year: "2022",
      description:
        "From random conversations to unforgettable memories, this is a little collection of all the moments that made our friendship special.",
      video: "assets/videos/our-friendship.mp4",
      tags: ["friendship", "love", "memories"],
      mcat: "Friendship"
    },
    {
      id: "childhood-memories",
      type: "video",
      title: "Childhood Memories",
      category: "Growing Up • The Early Days",
      duration: "06:15",
      date: "Little Us",
      year: "The Early Years",
      description:
        "The tiny version of you — before everything, before all of this. Some people are magical from the very start.",
      video: "assets/videos/childhood-memories.mp4",
      tags: ["childhood", "growing up", "memories"],
      mcat: "Childhood"
    },
    {
      id: "university-memories",
      type: "video",
      title: "University Memories",
      category: "Campus Days • The Chapter",
      duration: "07:48",
      date: "College Years",
      year: "2024",
      description:
        "The deadlines, the late nights, the cafeteria talks, the 'one more minute' goodbyes. The chapter that shaped us.",
      video: "assets/videos/university-memories.mp4",
      tags: ["university", "campus", "college"],
      mcat: "University"
    },
    {
      id: "best-moments",
      type: "video",
      title: "Best Moments",
      category: "Highlights • The Greatest Hits",
      duration: "09:10",
      date: "All Our Favorites",
      year: "Compilation",
      description:
        "The greatest hits of us. Every smile, every laugh, every little thing worth replaying over and over again.",
      video: "assets/videos/best-moments.mp4",
      tags: ["best moments", "highlights", "favorites"],
      mcat: "Special Days"
    },
    {
      id: "funny-memories",
      type: "video",
      title: "Funny Memories",
      category: "Comedy • Real Life",
      duration: "06:44",
      date: "Laugh Out Loud",
      year: "Comedy Special",
      description:
        "Warning: laughing may occur. Our funniest moments, our worst jokes, and the reasons we can't be trusted in public together.",
      video: "assets/videos/funny-memories.mp4",
      tags: ["funny", "comedy", "laughs"],
      mcat: "Funny Moments"
    },
    {
      id: "birthday-memories",
      type: "video",
      title: "Birthday Memories",
      category: "Celebrations • Cake & Chaos",
      duration: "05:26",
      date: "Every Year Of You",
      year: "2026",
      description:
        "Every candle, every wish, every year of you getting more and more awesome. A montage of all your birthdays so far.",
      video: "assets/videos/birthday-memories.mp4",
      tags: ["birthday", "cake", "celebration"],
      mcat: "Birthday Memories"
    },
    {
      id: "our-favorite-day",
      type: "video",
      title: "Our Favorite Day",
      category: "Special Days • One Perfect Day",
      duration: "04:37",
      date: "One Perfect Day",
      year: "2025",
      description:
        "Some days feel chosen. This is the one we'd both pick — the day it felt like everything in the universe said 'today'.",
      video: "assets/videos/our-favorite-day.mp4",
      tags: ["favorite day", "special"],
      mcat: "Special Days"
    },
    {
      id: "things-i-love-about-you",
      type: "video",
      title: "Things I Love About You",
      category: "Feelings • No Notes",
      duration: "06:59",
      date: "Always True",
      year: "2026",
      description:
        "Your laugh, your eyes when you're excited, the way you make ordinary days feel like adventures. An exhaustive (and growing) list.",
      video: "assets/videos/things-i-love-about-you.mp4",
      tags: ["love", "feelings", "list"],
      mcat: "Friendship"
    },
    {
      id: "the-main-character",
      type: "video",
      title: "The Main Character",
      category: "Cinema • Starring You",
      duration: "05:03",
      date: "Every Frame",
      year: "2026",
      description:
        "Every good story needs a hero. This one stars you — because in every chapter worth telling, you're the main character.",
      video: "assets/videos/the-main-character.mp4",
      tags: ["main character", "hero", "star"],
      mcat: "Birthday Memories"
    },
    {
      id: "the-final-surprise",
      type: "special",
      title: "The Final Surprise",
      category: "Special • Don't Skip",
      duration: "02:45",
      date: "Watch Until The End",
      year: "The End",
      description:
        "The credits of this story hide one more scene. Make sure you watch this to the very, very end. It's important.",
      video: "assets/videos/the-final-surprise.mp4",
      tags: ["surprise", "final", "secret", "end"],
      mcat: "Birthday Memories"
    },
    {
      id: "summer-trip",
      type: "photo",
      title: "Summer Trip",
      category: "Trips • Golden Days",
      date: "Summer 2025",
      description:
        "The sun, the photos, the 'one more picture' until sunset. That trip lives in our memory in 4K.",
      images: ["assets/photos/summer-trip.jpg"],
      poster: "assets/posters/summer-trip.svg",
      tags: ["trip", "summer", "travel"],
      mcat: "Trips"
    },
    {
      id: "golden-hour",
      type: "photo",
      title: "Golden Hour",
      category: "Special Days • Magic Light",
      date: "One Sunset We Kept",
      description:
        "We waited for the perfect light, then we forgot to take the photo because we were too busy laughing. This one's for the record.",
      images: ["assets/photos/golden-hour.jpg"],
      poster: "assets/posters/golden-hour.svg",
      tags: ["golden hour", "sunset", "magic"],
      mcat: "Special Days"
    },
    {
      id: "late-night-talks",
      type: "photo",
      title: "Late Night Talks",
      category: "Random Memories • 3AM Deep",
      date: "Almost Every Night",
      description:
        "The best conversations happen after midnight. The ones about nothing and everything, that somehow fixed the whole week.",
      images: ["assets/photos/late-night-talks.jpg"],
      poster: "assets/posters/late-night-talks.svg",
      tags: ["late night", "talks", "deep"],
      mcat: "Random Memories"
    },
    {
      id: "tiny-moments",
      type: "photo",
      title: "Tiny Moments",
      category: "Random Memories • The Quiet Ones",
      date: "Everyday Magic",
      description:
        "The small things — shared meals, silly songs, quiet victories. Nobody films these, but they're the real film.",
      images: ["assets/photos/tiny-moments.jpg"],
      poster: "assets/posters/tiny-moments.svg",
      tags: ["tiny moments", "everyday"],
      mcat: "Random Memories"
    },
    {
      id: "that-laugh",
      type: "photo",
      title: "That Laugh",
      category: "Funny Moments • Unstoppable",
      date: "The Day We Cried Laughing",
      description:
        "This is the laugh that makes everyone in the room smile without knowing why. One of my favorite sounds in the world.",
      images: ["assets/photos/that-laugh.jpg"],
      poster: "assets/posters/that-laugh.svg",
      tags: ["laugh", "funny"],
      mcat: "Funny Moments"
    }
  ];

  /* ---------------------------------------------------------------
     3) HOME ROWS  (order matters — top row shows first)
  --------------------------------------------------------------- */
  var ROWS = [
    { id: "trending", title: "Trending Now", items: ["coming-soon", "the-birthday-movie", "our-friendship", "funny-memories", "university-memories", "the-final-surprise", "childhood-memories"] },
    { id: "special", title: "Because You're Special", items: ["things-i-love-about-you", "our-favorite-day", "best-moments", "the-main-character", "golden-hour"] },
    { id: "story", title: "Your Story", items: ["our-story", "ep-how-we-met", "ep-the-beginning", "ep-crazy-memories", "ep-our-best-moments", "ep-things-i-never-said", "ep-birthday-message"] },
    { id: "best", title: "Best Memories", items: ["childhood-memories", "best-moments", "summer-trip", "late-night-talks", "tiny-moments", "that-laugh"] },
    { id: "bday", title: "Birthday Specials", items: ["the-birthday-movie", "birthday-memories", "the-final-surprise", "ep-birthday-message"] },
    { id: "friends", title: "Friends & Memories", items: ["our-friendship", "funny-memories", "that-laugh", "late-night-talks", "summer-trip", "our-favorite-day"] },
    { id: "favorites", title: "Favorite Moments", items: ["our-favorite-day", "golden-hour", "best-moments", "tiny-moments", "the-main-character"] },
    { id: "episodes", title: "Special Episodes", items: ["ep-how-we-met", "ep-the-beginning", "ep-crazy-memories", "ep-our-best-moments", "ep-things-i-never-said", "ep-birthday-message"] },
    { id: "love", title: "Made With Love", items: ["things-i-love-about-you", "our-friendship", "our-story", "the-birthday-movie", "birthday-memories", "summer-trip"] }
  ];

  /* ---------------------------------------------------------------
     Helper accessors
  --------------------------------------------------------------- */
  function byId(id) {
    for (var i = 0; i < ITEMS.length; i++) if (ITEMS[i].id === id) return ITEMS[i];
    return null;
  }

  function allItems() { return ITEMS; }
  function allVideos() {
    return ITEMS.filter(function (it) { return it.type === "video" || it.type === "series" || it.type === "special"; });
  }

  root.BIRDI_DATA = {
    CONFIG: CONFIG,
    ITEMS: ITEMS,
    ROWS: ROWS,
    byId: byId,
    allItems: allItems,
    allVideos: allVideos
  };

  if (typeof module !== "undefined" && module.exports) module.exports = root.BIRDI_DATA;
})(typeof window !== "undefined" ? window : globalThis);
