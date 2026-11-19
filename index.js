(() => {
  const EXT_NAME = "st-cozy-vinyl";
  const PROMPT_KEY = "cozy_vinyl_prompt";
  const DEFAULT_PROMPT = `At the very end of every response, include a soundtrack widget matching the current scene's mood using this exact format:\n[vinyl: Song Title | Artist | Emoji + Short Vibe | A short fitting lyric line or poetic description of the scene's atmosphere in Russian]`;

  const defaultSettings = {
    pluginEnabled: true,
    enabled: false,
    autoWidget: true,
    sound: true,
    soundMode: "auto",
    volume: 0.45,
    quietVolume: 0.3,
    autoSpin: true,
    compactMode: false,
    cozyMascot: true,
    favorites: [],
    theme: "glass"
  };

  const SOUND_MODES = ["lofi", "rain", "storm", "fire", "fireflies"];
  const SOUND_NAMES = {
    lofi: "🎹 Lo-Fi и винил",
    rain: "🌧️ Шум дождя",
    storm: "⛈️ Дождь и гроза",
    fire: "🔥 Треск костра",
    fireflies: "✨ Светлячки"
  };

  const THEME_DRINKS = {
    latte: "☕",
    pink: "🌸",
    dark: "☕",
    matcha: "🍵",
    glass: "☕",
    noir: "🍷",
    neon: "🍸"
  };

  const THEME_CLASSES = [
    "st-vinyl-theme-pink",
    "st-vinyl-theme-dark",
    "st-vinyl-theme-matcha",
    "st-vinyl-theme-glass",
    "st-vinyl-theme-noir",
    "st-vinyl-theme-neon"
  ];

  // Коллекция атмосферных пластинок и звуков под разные вайбы сцены
  const MOOD_TRACKS = [
    {
      re: /гроз|гром|молн|ливен|шторм|буря|storm|thunder/i,
      vibe: "⛈️ Дождь и гроза",
      sound: "storm",
      tracks: [
        ["Riders on the Storm", "The Doors"],
        ["Sweater Weather", "The Neighbourhood"],
        ["snowfall", "Øneheart & reidenshi"],
        ["Way Down We Go", "KALEO"]
      ]
    },
    {
      re: /дожд|капл|окн|зонт|туч|пасмурн|сыро|rain|window/i,
      vibe: "🌧️ Шум дождя",
      sound: "rain",
      tracks: [
        ["Sweater Weather", "The Neighbourhood"],
        ["snowfall", "Øneheart & reidenshi"],
        ["Rainy Night in Soho", "The Pogues"],
        ["Stan", "Lofi Fruits Music"]
      ]
    },
    {
      re: /кост[её]р|камин|ог[оня]|плам|искр|угол|дров|чай|кофе|какао|кафе|кружк|плед|уют|таверн|дом|coffee|tea|warm|cozy|fire/i,
      vibe: "🔥 Треск костра",
      sound: "fire",
      tracks: [
        ["Coffee Breath", "Sofia Mills"],
        ["death bed (coffee for your head)", "Powfu & beabadoobee"],
        ["Sunday Morning", "Maroon 5"],
        ["Chamber of Reflection", "Mac DeMarco"]
      ]
    },
    {
      re: /ноч|лун|звезд|светляч|лес|сад|трав|темнот|полноч|спать|сон|кроват|тишин|night|moon|dark|sleep|forest/i,
      vibe: "✨ Светлячки",
      sound: "fireflies",
      tracks: [
        ["Apocalypse", "Cigarettes After Sex"],
        ["Space Song", "Beach House"],
        ["Midnight City", "M83"],
        ["After Dark", "Mr.Kitty"]
      ]
    },
    {
      re: /губ|объяти|нежн|сердц|люб|поцел|щек|румян|дыхани|коснул|ладон|тепл|палат|бинт|пластыр|утро|kiss|love|heart|touch/i,
      vibe: "🎹 Lo-Fi Нежность",
      sound: "lofi",
      tracks: [
        ["Sunsetz", "Cigarettes After Sex"],
        ["Medicine", "Daughter"],
        ["Mystery of Love", "Sufjan Stevens"],
        ["Je te laisserai des mots", "Patrick Watson"]
      ]
    },
    {
      re: /взгляд|опасн|кров|злост|крик|битв|меч|страх|рык|сжал|тен|холод|fight|blood|danger/i,
      vibe: "⛈️ Гроза и буря",
      sound: "storm",
      tracks: [
        ["505", "Arctic Monkeys"],
        ["Way Down We Go", "KALEO"],
        ["Do I Wanna Know?", "Arctic Monkeys"],
        ["The Hills", "The Weeknd"]
      ]
    },
    {
      re: /.*/,
      vibe: "🎹 Lo-Fi и винил",
      sound: "lofi",
      tracks: [
        ["Resonance", "HOME"],
        ["Sparks", "Coldplay"],
        ["cardigan", "Taylor Swift"],
        ["Softcore", "The Neighbourhood"]
      ]
    }
  ];

  function hashText(str) {
    let h = 2166136261;
    const len = str.length;
    const step = Math.max(1, Math.floor(len / 200));
    for (let i = 0; i < len; i += step) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h;
  }

  function extractQuote(text) {
    const clean = text.replace(/\[vinyl:[\s\S]*?\]/gi, "").replace(/\s+/g, " ").trim();
    const sentences = clean.split(/(?<=[.!?…])\s+/).filter(s => s.length >= 25 && s.length <= 130);
    if (sentences.length > 0) {
      return sentences[sentences.length - 1].replace(/^["«„]|["»“]$/g, "");
    }
    return clean.slice(0, 95) + (clean.length > 95 ? "…" : "");
  }

  function pickAutoTrack(text, shift = 0) {
    const group = MOOD_TRACKS.find(g => g.re.test(text)) || MOOD_TRACKS[MOOD_TRACKS.length - 1];
    const idx = (hashText(text) + shift) % group.tracks.length;
    const [title, artist] = group.tracks[idx];
    return {
      title,
      artist,
      vibe: group.vibe,
      sound: group.sound,
      lyric: extractQuote(text)
    };
  }

  function getSettings() {
    const ctx = window.SillyTavern?.getContext?.();
    if (!ctx) return defaultSettings;
    if (!ctx.extensionSettings[EXT_NAME]) {
      ctx.extensionSettings[EXT_NAME] = { ...defaultSettings };
    }
    const s = ctx.extensionSettings[EXT_NAME];
    for (const k of Object.keys(defaultSettings)) {
      if (s[k] === undefined) s[k] = defaultSettings[k];
    }
    if (!Array.isArray(s.favorites)) s.favorites = [];
    return s;
  }

  function makeFavKey(title = "", artist = "") {
    return `${String(title).trim().toLowerCase()}|${String(artist).trim().toLowerCase()}`;
  }

  function isTrackFavorited(title, artist) {
    const s = getSettings();
    const key = makeFavKey(title, artist);
    return s.favorites.some(f => makeFavKey(f.title, f.artist) === key);
  }

  function applyTheme() {
    const s = getSettings();
    document.body.classList.remove(...THEME_CLASSES);
    if (s.theme && s.theme !== "latte") {
      document.body.classList.add(`st-vinyl-theme-${s.theme}`);
    }
    document.body.classList.toggle("st-vinyl-hide-mascot", s.cozyMascot === false);
    document.body.classList.toggle("st-vinyl-disabled", s.pluginEnabled === false);

    // Обновляем иконку напитка в чашке под выбранную тему
    const drinkIcon = THEME_DRINKS[s.theme] || "☕";
    document.querySelectorAll(".st-vinyl-cup-icon").forEach(el => {
      el.textContent = drinkIcon;
    });
  }

  function updatePrompt() {
    const ctx = window.SillyTavern?.getContext?.();
    if (!ctx?.setExtensionPrompt) return;
    const { enabled, pluginEnabled } = getSettings();
    ctx.setExtensionPrompt(PROMPT_KEY, pluginEnabled !== false && enabled ? DEFAULT_PROMPT : "", 1, 0);
  }

  function detectSoundMode(vibeText = "", extraText = "") {
    const v = String(vibeText).toLowerCase();
    if (/гроз|гром|молн|шторм|буря|storm|thunder|⛈|⚡/.test(v)) return "storm";
    if (/дожд|капл|ливень|пасмурн|туч|сыро|зонт|rain|🌧|☔/.test(v)) return "rain";
    if (/кост[её]р|камин|ог[оня]|плам|искр|угол|дров|чай|кофе|какао|fire|🔥|☕/.test(v)) return "fire";
    if (/светляч|ноч|лун|звезд|лес|сад|тишин|сон|спать|полноч|firefl|night|moon|✨|🌙|🌌/.test(v)) return "fireflies";
    if (/lo-?fi|винил|пластинк|нежност|палат|бинт|утро|vinyl|🎹|💿|🩹/.test(v)) return "lofi";

    const full = `${vibeText} ${extraText}`;
    const matched = MOOD_TRACKS.find(g => g.re.test(full));
    return matched ? matched.sound : "lofi";
  }

  function resolveCardSound(card) {
    const s = getSettings();
    if (!card) return s.soundMode && s.soundMode !== "auto" ? s.soundMode : "lofi";
    if (card.dataset.manualSound) {
      return card.dataset.manualSound;
    }
    if (s.soundMode && s.soundMode !== "auto" && SOUND_MODES.includes(s.soundMode)) {
      return s.soundMode;
    }
    const badgeText = card.querySelector(".st-vinyl-vibe")?.textContent || "";
    const fromBadge = detectSoundMode(badgeText);
    if (fromBadge !== "lofi" || /lo-?fi|винил|🎹/i.test(badgeText)) {
      card.dataset.sound = fromBadge;
      return fromBadge;
    }
    return card.dataset.sound || fromBadge || "lofi";
  }

  // Атмосферный звуковой движок
  let audioCtx = null;
  let stopAudioFn = null;
  let currentMasterGain = null;
  let activeAudioCard = null;
  let iosUnlockAudioEl = null;

  const SILENT_WAV_URI = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";

  function unlockAudioEngine() {
    try {
      if (navigator.audioSession && navigator.audioSession.type !== "playback") {
        navigator.audioSession.type = "playback";
      }
    } catch (e) {}

    try {
      if (!iosUnlockAudioEl) {
        iosUnlockAudioEl = new Audio(SILENT_WAV_URI);
        iosUnlockAudioEl.setAttribute("playsinline", "true");
        iosUnlockAudioEl.volume = 0.01;
      }
      const p = iosUnlockAudioEl.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } catch (e) {}

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!audioCtx || audioCtx.state === "closed") {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === "suspended" || audioCtx.state === "interrupted") {
      try { audioCtx.resume(); } catch (e) {}
    }

    try {
      const buf = audioCtx.createBuffer(1, 1, 22050);
      const src = audioCtx.createBufferSource();
      src.buffer = buf;
      src.connect(audioCtx.destination);
      src.start(0);
    } catch (e) {}

    return audioCtx;
  }

  function getMasterVolume() {
    const s = getSettings();
    const raw = typeof s.quietVolume === "number" ? s.quietVolume : 0.3;
    return Math.max(0.05, Math.min(1, raw)) * 1.45;
  }

  // 🐾 Мягкое мурчание котика при поглаживании (клике по котику)
  function playCatPurr() {
    const s = getSettings();
    if (!s.sound) return;
    const ctx = unlockAudioEngine();
    if (!ctx) return;

    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.value = Math.min(0.65, getMasterVolume() * 0.75);
    master.connect(ctx.destination);

    // Бархатистое вибро-мурчание
    const carrier = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const purrFilter = ctx.createBiquadFilter();
    const purrGain = ctx.createGain();

    carrier.type = "triangle";
    carrier.frequency.setValueAtTime(52, now);
    carrier.frequency.linearRampToValueAtTime(64, now + 0.35);
    carrier.frequency.linearRampToValueAtTime(48, now + 0.85);

    lfo.type = "sine";
    lfo.frequency.value = 24;
    lfoGain.gain.value = 18;

    purrFilter.type = "lowpass";
    purrFilter.frequency.value = 220;

    purrGain.gain.setValueAtTime(0.001, now);
    purrGain.gain.linearRampToValueAtTime(0.24, now + 0.12);
    purrGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    lfo.connect(lfoGain);
    lfoGain.connect(carrier.frequency);
    carrier.connect(purrFilter);
    purrFilter.connect(purrGain);
    purrGain.connect(master);

    carrier.start(now);
    lfo.start(now);
    carrier.stop(now + 0.92);
    lfo.stop(now + 0.92);

    // Нежный колокольчик-мяу поверх мурчания
    const meow = ctx.createOscillator();
    const meowGain = ctx.createGain();
    meow.type = "sine";
    meow.frequency.setValueAtTime(580, now + 0.08);
    meow.frequency.exponentialRampToValueAtTime(760, now + 0.22);
    meow.frequency.exponentialRampToValueAtTime(510, now + 0.55);
    meowGain.gain.setValueAtTime(0.001, now + 0.08);
    meowGain.gain.linearRampToValueAtTime(0.09, now + 0.16);
    meowGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.58);
    meow.connect(meowGain);
    meowGain.connect(master);
    meow.start(now + 0.08);
    meow.stop(now + 0.6);
  }

  // 🎚️ Винтажный звук плавной остановки моторчика пластинки при паузе
  function playVinylSpinDown() {
    const s = getSettings();
    if (!s.sound || !audioCtx) return;
    try {
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(155, now);
      osc.frequency.exponentialRampToValueAtTime(34, now + 0.38);
      g.gain.setValueAtTime(0.12 * Math.min(1, getMasterVolume()), now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(g);
      g.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.42);
    } catch (e) {}
  }

  function syncPowerControlsUi() {
    const s = getSettings();
    const isOff = s.pluginEnabled === false;

    const masterBtn = document.getElementById("st_vinyl_master_toggle");
    const masterLbl = document.getElementById("st_vinyl_master_label");
    if (masterBtn) {
      masterBtn.classList.toggle("is-off", isOff);
    }
    if (masterLbl) {
      masterLbl.textContent = isOff
        ? "Расширение выключено — нажмите, чтобы включить"
        : "Расширение включено (нажмите, чтобы выключить)";
    }

    const wandBtn = document.getElementById("st_vinyl_wand_toggle");
    const wandLbl = document.getElementById("st_vinyl_wand_label");
    const wandIcon = document.getElementById("st_vinyl_wand_icon");
    if (wandLbl) {
      wandLbl.textContent = isOff ? "Включить Cozy Vinyl" : "Выключить Cozy Vinyl";
    }
    if (wandIcon) {
      wandIcon.style.color = isOff ? "#ff5c74" : "#4ade80";
    }
    if (wandBtn) {
      wandBtn.classList.toggle("is-off", isOff);
    }
  }

  function syncCardVisualState() {
    const isOff = getSettings().pluginEnabled === false;
    document.querySelectorAll(".st-vinyl-card").forEach((c) => {
      const label = c.querySelector(".st-vinyl-label");
      if (c === activeAudioCard) {
        c.classList.add("is-playing", "is-audio-on");
        c.classList.remove("is-stopping");
        if (label) label.textContent = "🔊 NOW PLAYING";
      } else {
        c.classList.remove("is-audio-on");
        if (label) {
          label.textContent = c.classList.contains("is-playing") ? "NOW PLAYING" : "PAUSED";
        }
      }

      // Синхронизируем сердечко избранного
      const favBtn = c.querySelector(".st-vinyl-fav-btn");
      if (favBtn) {
        const fav = isTrackFavorited(c.dataset.title || "", c.dataset.artist || "");
        favBtn.classList.toggle("is-fav", fav);
        favBtn.textContent = fav ? "♥" : "♡";
      }

      // Синхронизируем кнопку выключения ⏻ на карточке
      const powerBtn = c.querySelector(".st-vinyl-power-btn");
      if (powerBtn) {
        powerBtn.classList.toggle("is-off", isOff);
        powerBtn.title = isOff ? "Включить расширение Cozy Vinyl" : "Выключить расширение Cozy Vinyl";
      }
    });

    syncPowerControlsUi();
  }

  function stopVinylSound(withSpinDown = false) {
    const prevCard = activeAudioCard;
    if (stopAudioFn) {
      stopAudioFn();
      stopAudioFn = null;
    }
    if (withSpinDown) {
      playVinylSpinDown();
      if (prevCard) {
        prevCard.classList.add("is-stopping");
        setTimeout(() => prevCard.classList.remove("is-stopping"), 420);
      }
    }
    currentMasterGain = null;
    activeAudioCard = null;
    syncCardVisualState();
  }

  function startVinylSound(cardSoundMode = "lofi", cardEl = null) {
    stopVinylSound(false);
    const s = getSettings();
    if (!s.sound) return;

    const mode = cardSoundMode || (s.soundMode && s.soundMode !== "auto" ? s.soundMode : "lofi");
    const ctx = unlockAudioEngine();
    if (!ctx) return;

    if (cardEl) {
      cardEl.dataset.sound = mode;
    }
    activeAudioCard = cardEl;
    syncCardVisualState();

    let active = true;
    const timers = [];
    const sources = [];

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 18;
    compressor.ratio.value = 3.5;
    compressor.attack.value = 0.005;
    compressor.release.value = 0.2;
    compressor.connect(ctx.destination);

    const masterGain = ctx.createGain();
    masterGain.gain.value = getMasterVolume();
    masterGain.connect(compressor);
    currentMasterGain = masterGain;

    const createNoiseSource = (typeFn) => {
      const bufferSize = ctx.sampleRate * 3;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = typeFn(white, i, lastOut);
        lastOut = data[i];
      }
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      sources.push(src);
      return src;
    };

    const playNeedleDrop = () => {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(190, now);
      osc.frequency.exponentialRampToValueAtTime(55, now + 0.045);
      g.gain.setValueAtTime(0.18, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(g);
      g.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.055);
    };
    playNeedleDrop();

    if (mode === "rain" || mode === "storm") {
      const rainSrc = createNoiseSource((w, _, last) => (last + 0.12 * w) / 1.12);
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = mode === "storm" ? 760 : 920;
      filter.Q.value = 0.65;

      const gain = ctx.createGain();
      gain.gain.value = mode === "storm" ? 0.28 : 0.22;

      rainSrc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      rainSrc.start();

      const playDrop = () => {
        if (!active) return;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sine";
        const freq = 680 + Math.random() * 620;
        const now = ctx.currentTime;
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.28, now + 0.045);
        g.gain.setValueAtTime(0.001, now);
        g.gain.exponentialRampToValueAtTime(0.045, now + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0005, now + 0.085);
        osc.connect(g);
        g.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.09);
      };
      playDrop();
      timers.push(setInterval(playDrop, 290));

      if (mode === "storm") {
        const playThunder = () => {
          if (!active) return;
          const thSrc = createNoiseSource((w, _, last) => (last + 0.04 * w) / 1.04);
          const thFilter = ctx.createBiquadFilter();
          thFilter.type = "lowpass";
          thFilter.frequency.value = 185;
          const thGain = ctx.createGain();
          const now = ctx.currentTime;
          thGain.gain.setValueAtTime(0.001, now);
          thGain.gain.linearRampToValueAtTime(0.45, now + 0.35);
          thGain.gain.exponentialRampToValueAtTime(0.16, now + 1.4);
          thGain.gain.linearRampToValueAtTime(0.32, now + 1.9);
          thGain.gain.exponentialRampToValueAtTime(0.001, now + 4.1);
          thSrc.connect(thFilter);
          thFilter.connect(thGain);
          thGain.connect(masterGain);
          thSrc.start(now);
          thSrc.stop(now + 4.2);
        };
        setTimeout(playThunder, 250);
        timers.push(setInterval(playThunder, 6200));
      }
    } else if (mode === "fire") {
      const warmth = createNoiseSource((w, _, last) => (last + 0.04 * w) / 1.04);
      const lowFilter = ctx.createBiquadFilter();
      lowFilter.type = "lowpass";
      lowFilter.frequency.value = 190;
      const warmGain = ctx.createGain();
      warmGain.gain.value = 0.25;
      warmth.connect(lowFilter);
      lowFilter.connect(warmGain);
      warmGain.connect(masterGain);
      warmth.start();

      const crackleNoise = createNoiseSource((w) => w);
      crackleNoise.start();

      const triggerCracklePop = (freq, duration, peakGain, qVal = 2.0) => {
        if (!active) return;
        const now = ctx.currentTime;
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = freq;
        bp.Q.value = qVal;

        const g = ctx.createGain();
        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(peakGain, now + 0.003);
        g.gain.exponentialRampToValueAtTime(0.0005, now + duration);

        crackleNoise.connect(bp);
        bp.connect(g);
        g.connect(masterGain);

        setTimeout(() => {
          try {
            crackleNoise.disconnect(bp);
            bp.disconnect();
            g.disconnect();
          } catch (e) {}
        }, Math.ceil(duration * 1000) + 40);
      };

      triggerCracklePop(1650, 0.024, 0.24, 2.2);

      const fireTimer = setInterval(() => {
        if (!active) return;
        if (Math.random() < 0.78) {
          const freq = 1200 + Math.random() * 1900;
          const dur = 0.016 + Math.random() * 0.024;
          const peak = 0.16 + Math.random() * 0.18;
          triggerCracklePop(freq, dur, peak, 2.2);
        }
        if (Math.random() < 0.38) {
          setTimeout(() => {
            if (!active) return;
            triggerCracklePop(1700 + Math.random() * 1400, 0.014 + Math.random() * 0.016, 0.14 + Math.random() * 0.14, 2.5);
          }, 35 + Math.random() * 60);
        }
        if (Math.random() < 0.24) {
          triggerCracklePop(380 + Math.random() * 360, 0.04 + Math.random() * 0.03, 0.18 + Math.random() * 0.12, 1.4);
        }
      }, 155);
      timers.push(fireTimer);
    } else if (mode === "fireflies") {
      const nightAir = createNoiseSource((w) => w * 0.04);
      const airFilter = ctx.createBiquadFilter();
      airFilter.type = "bandpass";
      airFilter.frequency.value = 2400;
      airFilter.Q.value = 2.5;
      const airGain = ctx.createGain();
      airGain.gain.value = 0.06;
      nightAir.connect(airFilter);
      airFilter.connect(airGain);
      airGain.connect(masterGain);
      nightAir.start();

      const chimeNotes = [329.63, 392.00, 493.88, 523.25, 659.25, 783.99, 987.77];
      const playChime = () => {
        if (!active) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = chimeNotes[Math.floor(Math.random() * chimeNotes.length)];
        const now = ctx.currentTime;
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.095, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0005, now + 2.4);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 2.5);
      };
      playChime();
      timers.push(setInterval(playChime, 1250));
    } else {
      const vinylNoise = createNoiseSource((w) => w * (Math.random() > 0.992 ? 0.45 : 0.045));
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 1150;
      filter.Q.value = 0.9;
      const noiseGain = ctx.createGain();
      noiseGain.gain.value = 0.11;
      vinylNoise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(masterGain);
      vinylNoise.start();

      const chords = [
        [261.63, 329.63, 392.00, 493.88],
        [220.00, 261.63, 329.63, 392.00],
        [174.61, 220.00, 261.63, 349.23],
        [196.00, 246.94, 293.66, 392.00]
      ];
      let chordIdx = 0;
      const playChord = () => {
        if (!active) return;
        const chord = chords[chordIdx % chords.length];
        chordIdx++;
        const now = ctx.currentTime;
        chord.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = i % 2 === 0 ? "triangle" : "sine";
          osc.frequency.value = freq;
          const lp = ctx.createBiquadFilter();
          lp.type = "lowpass";
          lp.frequency.value = 920;
          const startAt = now + i * 0.09;
          gain.gain.setValueAtTime(0.001, startAt);
          gain.gain.exponentialRampToValueAtTime(0.095, startAt + 0.12);
          gain.gain.exponentialRampToValueAtTime(0.0008, now + 2.35);
          osc.connect(lp);
          lp.connect(gain);
          gain.connect(masterGain);
          osc.start(startAt);
          osc.stop(now + 2.45);
        });
      };
      playChord();
      timers.push(setInterval(playChord, 2350));
    }

    stopAudioFn = () => {
      active = false;
      timers.forEach(clearInterval);
      sources.forEach((s) => {
        try { s.stop(); } catch (e) {}
      });
    };
  }

  function setPluginEnabled(nextState, notify = false) {
    const s = getSettings();
    s.pluginEnabled = Boolean(nextState);

    if (!s.pluginEnabled) {
      stopVinylSound(false);
      document.querySelectorAll("#chat .st-vinyl-auto-mount").forEach((el) => el.remove());
    }

    applyTheme();
    updatePrompt();
    syncCardVisualState();

    const ctx = window.SillyTavern?.getContext?.();
    ctx?.saveSettingsDebounced?.();

    if (s.pluginEnabled) {
      scanChat();
      if (notify && window.toastr?.success) {
        window.toastr.success("Плеер Cozy Vinyl снова включён 🎵");
      }
    } else if (notify && window.toastr?.info) {
      window.toastr.info("Плеер Cozy Vinyl выключен. Включить обратно можно в меню ✨ или в настройках расширения.");
    }
  }

  function escapeHtml(str = "") {
    return str.replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  }

  function cleanTagField(str = "") {
    return String(str)
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\s+/g, " ")
      .trim();
  }

  const VINYL_REGEX = /\[vinyl:\s*([^|\]]+?)\s*\|\s*([^|\]]+?)\s*\|\s*([^|\]]+?)(?:\s*\|\s*([\s\S]+?))?\s*\](?!\s*—)/gi;

  // SVG уютного котика на крышке виниловой деки и иконка выключения ⏻
  const CAT_SVG = `<svg viewBox="0 0 32 20" aria-hidden="true"><path class="st-cat-tail" d="M6 15 C2 14, 1 9, 4 7"/><g class="st-cat-body"><ellipse cx="15" cy="14" rx="8.5" ry="5"/><circle cx="23" cy="11" r="4.2"/><polygon points="20,8 21.2,3.5 23.8,7.2"/><polygon points="23.5,7.2 26.2,3.8 26.8,8.5"/></g></svg><span class="st-cat-zzz">zZz</span><span class="st-cat-heart">♥</span>`;
  const POWER_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.77.04"/></svg>`;

  function buildVinylHtml(title, artist, vibe, lyric, sound = "") {
    const s = getSettings();
    const cleanTitle = cleanTagField(title);
    const cleanArtist = cleanTagField(artist);
    const cleanVibe = cleanTagField(vibe);
    const cleanLyric = lyric ? cleanTagField(lyric) : "";

    const resolvedSound = sound || detectSoundMode(cleanVibe, `${cleanTitle} ${cleanLyric}`);
    const playClass = s.autoSpin ? "is-playing" : "";
    const compactClass = s.compactMode ? "is-compact" : "";
    const statusText = s.autoSpin ? "NOW PLAYING" : "PAUSED";
    const fav = isTrackFavorited(cleanTitle, cleanArtist);
    const drinkIcon = THEME_DRINKS[s.theme] || "☕";
    const isOff = s.pluginEnabled === false;
    const powerTitle = isOff ? "Включить расширение Cozy Vinyl" : "Выключить расширение Cozy Vinyl";

    const t = escapeHtml(cleanTitle);
    const a = escapeHtml(cleanArtist);
    const v = escapeHtml(cleanVibe);
    const lEsc = escapeHtml(cleanLyric);

    const titleMarquee = cleanTitle.length > 26 ? "is-marquee" : "";
    const artistMarquee = cleanArtist.length > 32 ? "is-marquee" : "";

    const l = cleanLyric
      ? `<div class="st-vinyl-wave"></div><div class="st-vinyl-lyric">«${lEsc}»</div>`
      : "";

    return `<div class="st-vinyl-card ${playClass} ${compactClass}" data-sound="${resolvedSound}" data-title="${t}" data-artist="${a}" data-vibe="${v}" data-lyric="${lEsc}" title="Нажми на пластинку для звука, на котика — чтобы погладить, на плашку вайба — для смены погоды"><div class="st-vinyl-fx"><span class="st-vinyl-ember e1"></span><span class="st-vinyl-ember e2"></span><span class="st-vinyl-ember e3"></span><span class="st-vinyl-firefly f1"></span><span class="st-vinyl-firefly f2"></span><span class="st-vinyl-firefly f3"></span></div><div class="st-vinyl-deck"><div class="st-vinyl-cat" title="Погладить котика">${CAT_SVG}</div><div class="st-vinyl-disc"></div><div class="st-vinyl-sheen"></div><div class="st-vinyl-arm"></div><div class="st-vinyl-led"></div><div class="st-vinyl-cup"><span class="st-vinyl-steam s1"></span><span class="st-vinyl-steam s2"></span><span class="st-vinyl-cup-icon">${drinkIcon}</span></div><div class="st-vinyl-notes"><span class="st-vinyl-note n1">♪</span><span class="st-vinyl-note n2">♫</span><span class="st-vinyl-note n3">✦</span></div></div><div class="st-vinyl-info"><div class="st-vinyl-top"><span class="st-vinyl-status"><span class="st-vinyl-eq"><span></span><span></span><span></span><span></span></span><span class="st-vinyl-label">${statusText}</span></span><span class="st-vinyl-actions"><span class="st-vinyl-vibe" title="Нажми, чтобы переключить атмосферу (Lo-Fi / Дождь / Гроза / Костёр / Светлячки)">${v}</span><span class="st-vinyl-fav-btn ${fav ? "is-fav" : ""}" title="Сохранить пластинку в коллекцию">${fav ? "♥" : "♡"}</span><span class="st-vinyl-mini-btn" title="Свернуть / развернуть плеер">${s.compactMode ? "+" : "–"}</span><span class="st-vinyl-power-btn ${isOff ? "is-off" : ""}" title="${powerTitle}">${POWER_SVG}</span></span></div><div class="st-vinyl-title-wrap"><div class="st-vinyl-title ${titleMarquee}">${t}</div></div><div class="st-vinyl-artist-wrap"><div class="st-vinyl-artist ${artistMarquee}">${a}</div></div>${l}</div></div>`;
  }

  function renderFavoritesShelf() {
    const listEl = document.getElementById("st_vinyl_shelf_list");
    const countEl = document.getElementById("st_vinyl_shelf_count");
    if (!listEl) return;

    const s = getSettings();
    const favs = Array.isArray(s.favorites) ? s.favorites : [];
    if (countEl) countEl.textContent = String(favs.length);

    if (favs.length === 0) {
      listEl.innerHTML = `<div class="st-vinyl-shelf-empty">Нажми <b>♡</b> на любой пластинке в чате, чтобы сохранить любимый трек и цитату на свою полку ✨</div>`;
      return;
    }

    listEl.innerHTML = favs
      .map(f => buildVinylHtml(f.title, f.artist, f.vibe || "🎹 Lo-Fi и винил", f.lyric || "", f.sound || ""))
      .join("");
  }

  function toggleFavoriteFromCard(card) {
    const s = getSettings();
    const title = card.dataset.title || card.querySelector(".st-vinyl-title")?.textContent || "Unknown";
    const artist = card.dataset.artist || card.querySelector(".st-vinyl-artist")?.textContent || "Unknown";
    const vibe = card.querySelector(".st-vinyl-vibe")?.textContent || card.dataset.vibe || "🎹 Lo-Fi и винил";
    const lyric = card.dataset.lyric || "";
    const sound = resolveCardSound(card);

    const key = makeFavKey(title, artist);
    const idx = s.favorites.findIndex(f => makeFavKey(f.title, f.artist) === key);

    if (idx >= 0) {
      s.favorites.splice(idx, 1);
    } else {
      s.favorites.unshift({ title, artist, vibe, lyric, sound });
    }

    const ctx = window.SillyTavern?.getContext?.();
    ctx?.saveSettingsDebounced?.();
    syncCardVisualState();
    renderFavoritesShelf();
  }

  function renderVinylInElement(el) {
    if (!el) return false;
    const html = el.innerHTML || "";
    const text = el.textContent || "";
    if (!/\[vinyl:/i.test(html) && !/\[vinyl:/i.test(text)) return false;

    VINYL_REGEX.lastIndex = 0;
    if (VINYL_REGEX.test(html)) {
      VINYL_REGEX.lastIndex = 0;
      el.innerHTML = html.replace(VINYL_REGEX, (_, title, artist, vibe, lyric) => {
        const detectedSound = detectSoundMode(cleanTagField(vibe), `${cleanTagField(title)} ${cleanTagField(lyric || "")}`);
        return buildVinylHtml(title, artist, vibe, lyric, detectedSound);
      });
      return true;
    }

    VINYL_REGEX.lastIndex = 0;
    if (VINYL_REGEX.test(text)) {
      VINYL_REGEX.lastIndex = 0;
      const match = VINYL_REGEX.exec(text);
      if (match) {
        const [fullMatch, title, artist, vibe, lyric] = match;
        const detectedSound = detectSoundMode(cleanTagField(vibe), `${cleanTagField(title)} ${cleanTagField(lyric || "")}`);
        const cardHtml = buildVinylHtml(title, artist, vibe, lyric, detectedSound);
        el.innerHTML = html.replace(escapeHtml(fullMatch), cardHtml);
        return true;
      }
    }
    return false;
  }

  function isDomStreamingNow() {
    const stopBtn = document.getElementById("mes_stop");
    if (stopBtn && stopBtn.offsetParent !== null && getComputedStyle(stopBtn).display !== "none") {
      return true;
    }
    if (document.body.classList.contains("generating")) return true;
    return false;
  }

  let isScanning = false;

  function scanChat() {
    if (isScanning) return;
    const settings = getSettings();
    if (settings.pluginEnabled === false) {
      document.querySelectorAll("#chat .st-vinyl-auto-mount").forEach((el) => el.remove());
      return;
    }

    isScanning = true;

    try {
      const streaming = isDomStreamingNow();
      const allMessages = Array.from(document.querySelectorAll("#chat .mes"));

      allMessages.forEach((mes, idx) => {
        const mesText = mes.querySelector(".mes_text");
        if (!mesText) return;

        const isLastMessage = idx === allMessages.length - 1;

        if (renderVinylInElement(mesText) || mesText.querySelector(".st-vinyl-card")) {
          const autoMount = mes.querySelector(".st-vinyl-auto-mount");
          if (autoMount) autoMount.remove();
          return;
        }

        const rawText = (mesText.innerText || "").trim();
        if (/\[vinyl:[^\]]*$/i.test(rawText)) {
          const autoMount = mes.querySelector(".st-vinyl-auto-mount");
          if (autoMount) autoMount.remove();
          return;
        }

        if (streaming && isLastMessage) {
          const autoMount = mes.querySelector(".st-vinyl-auto-mount");
          if (autoMount) autoMount.remove();
          return;
        }

        const isUser = mes.getAttribute("is_user") === "true";
        const isSystem = mes.getAttribute("is_system") === "true";
        if (isUser || isSystem) return;

        let mount = mes.querySelector(".st-vinyl-auto-mount");
        if (settings.autoWidget === false) {
          if (mount) mount.remove();
          return;
        }

        if (rawText.length < 15) return;

        const swipeId = mes.getAttribute("swipeid") || "";
        const stateKey = `${rawText.length}:${hashText(rawText)}:${swipeId}`;
        if (mount && mount.dataset.stateKey === stateKey) return;

        const auto = pickAutoTrack(rawText);
        if (!mount) {
          mount = document.createElement("div");
          mount.className = "st-vinyl-auto-mount";
          mesText.insertAdjacentElement("afterend", mount);
        }
        mount.dataset.stateKey = stateKey;
        mount.innerHTML = buildVinylHtml(auto.title, auto.artist, auto.vibe, auto.lyric, auto.sound);
      });

      syncCardVisualState();
    } finally {
      isScanning = false;
    }
  }

  document.addEventListener("pointerdown", (e) => {
    if (!e.target.closest) return;
    if (e.target.closest(".st-vinyl-power-btn")) return;
    if (e.target.closest(".st-vinyl-card")) {
      unlockAudioEngine();
    }
  }, { passive: true });

  document.addEventListener("touchend", (e) => {
    if (!e.target.closest) return;
    if (e.target.closest(".st-vinyl-power-btn")) return;
    if (e.target.closest(".st-vinyl-card")) {
      unlockAudioEngine();
    }
  }, { passive: true });

  // Обработка кликов по кнопке выключения, котику, избранному, сворачиванию, вайбу и пластинке
  document.addEventListener("click", (e) => {
    const card = e.target.closest?.(".st-vinyl-card");
    if (!card) return;

    // 0. Кнопка выключения / включения расширения (⏻) на карточке
    const powerBtn = e.target.closest(".st-vinyl-power-btn");
    if (powerBtn) {
      e.stopPropagation();
      const sNow = getSettings();
      const isCurrentlyOn = sNow.pluginEnabled !== false;
      const inChat = Boolean(card.closest("#chat"));
      setPluginEnabled(inChat ? false : !isCurrentlyOn, true);
      return;
    }

    // 1. Погладить котика на деке -> мурчание и сердечко
    const catEl = e.target.closest(".st-vinyl-cat");
    if (catEl) {
      e.stopPropagation();
      catEl.classList.remove("is-purring");
      void catEl.offsetWidth;
      catEl.classList.add("is-purring");
      playCatPurr();
      return;
    }

    // 2. Кнопка «В избранное» (♡ / ♥)
    const favBtn = e.target.closest(".st-vinyl-fav-btn");
    if (favBtn) {
      e.stopPropagation();
      toggleFavoriteFromCard(card);
      return;
    }

    // 3. Кнопка сворачивания/разворачивания карточки (– / +)
    const miniBtn = e.target.closest(".st-vinyl-mini-btn");
    if (miniBtn) {
      e.stopPropagation();
      const compact = card.classList.toggle("is-compact");
      miniBtn.textContent = compact ? "+" : "–";
      return;
    }

    const s = getSettings();

    // 4. Плашка вайба справа сверху — переключает звук И визуальный эффект карточки по кругу
    const vibeBadge = e.target.closest(".st-vinyl-vibe");
    if (vibeBadge) {
      e.stopPropagation();
      const current = resolveCardSound(card);
      const nextIdx = (SOUND_MODES.indexOf(current) + 1) % SOUND_MODES.length;
      const nextSound = SOUND_MODES[nextIdx];
      card.dataset.sound = nextSound;
      card.dataset.manualSound = nextSound;
      vibeBadge.textContent = SOUND_NAMES[nextSound];
      card.classList.add("is-playing");
      if (!s.sound) s.sound = true;
      startVinylSound(nextSound, card);
      return;
    }

    const soundToPlay = resolveCardSound(card);

    // 5. Первый клик по пластинке запускает звук
    if (activeAudioCard !== card) {
      if (!s.sound) {
        s.sound = true;
        const soundChk = document.getElementById("st_vinyl_sound");
        if (soundChk) soundChk.checked = true;
      }
      card.classList.remove("is-stopping");
      card.classList.add("is-playing");
      startVinylSound(soundToPlay, card);
      return;
    }

    // 6. Повторный клик плавно замедляет моторчик и ставит на паузу
    card.classList.remove("is-playing", "is-audio-on");
    stopVinylSound(true);
  });

  // Быстрый пункт включения/выключения в меню чата ✨ (#extensionsMenu)
  function mountWandMenuButton() {
    const menu = document.getElementById("extensionsMenu");
    if (!menu || document.getElementById("st_vinyl_wand_toggle")) return;

    const s = getSettings();
    const isOff = s.pluginEnabled === false;
    const item = document.createElement("div");
    item.id = "st_vinyl_wand_toggle";
    item.className = `list-group-item flex-container flexGap5 interactable ${isOff ? "is-off" : ""}`;
    item.tabIndex = 0;
    item.innerHTML = `
      <div id="st_vinyl_wand_icon" class="fa-solid fa-power-off extensionsMenuExtensionButton" style="color:${isOff ? "#ff5c74" : "#4ade80"};"></div>
      <span id="st_vinyl_wand_label">${isOff ? "Включить Cozy Vinyl" : "Выключить Cozy Vinyl"}</span>
    `;
    item.addEventListener("click", () => {
      const cur = getSettings();
      setPluginEnabled(cur.pluginEnabled === false, true);
    });
    menu.appendChild(item);
  }

  // Панель настроек в меню Extensions
  function mountSettingsUi() {
    const container = document.getElementById("extensions_settings2") || document.getElementById("extensions_settings");
    if (!container || document.getElementById("st-vinyl-settings")) return;

    const s = getSettings();
    const isOff = s.pluginEnabled === false;
    const previewMode = s.soundMode && s.soundMode !== "auto" && SOUND_NAMES[s.soundMode] ? s.soundMode : "rain";
    const previewVibe = SOUND_NAMES[previewMode] || "🌧️ Шум дождя";

    const html = `
      <div id="st-vinyl-settings" class="inline-drawer">
        <div class="inline-drawer-toggle inline-drawer-header">
          <b>🎵 Cozy Vinyl Player</b>
          <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
        </div>
        <div class="inline-drawer-content">
          <button type="button" id="st_vinyl_master_toggle" class="st-vinyl-master-btn ${isOff ? "is-off" : ""}">
            <span class="st-vinyl-master-icon">${POWER_SVG}</span>
            <span id="st_vinyl_master_label">${isOff ? "Расширение выключено — нажмите, чтобы включить" : "Расширение включено (нажмите, чтобы выключить)"}</span>
          </button>
          <label class="checkbox_label"><input type="checkbox" id="st_vinyl_sound" ${s.sound ? "checked" : ""}><span>Включить звук при клике</span></label>
          <label class="checkbox_label"><input type="checkbox" id="st_vinyl_autospin" ${s.autoSpin ? "checked" : ""}><span>Крутить пластинку сразу</span></label>
          <label class="checkbox_label"><input type="checkbox" id="st_vinyl_mascot" ${s.cozyMascot !== false ? "checked" : ""}><span>🐾 Котик и чашка с паром на деке</span></label>
          <label class="checkbox_label"><input type="checkbox" id="st_vinyl_compact" ${s.compactMode ? "checked" : ""}><span>Компактный режим (мини-плеер)</span></label>
          <label class="checkbox_label"><input type="checkbox" id="st_vinyl_enabled" ${s.enabled ? "checked" : ""}><span>Авто-промпт для бота (необязательно)</span></label>
          <div style="margin-top:8px;">
            <label for="st_vinyl_volume">Громкость звука: <span id="st_vinyl_vol_label">${Math.round((typeof s.quietVolume === "number" ? s.quietVolume : 0.3) * 100)}%</span></label>
            <input type="range" id="st_vinyl_volume" min="0.05" max="1" step="0.05" value="${typeof s.quietVolume === "number" ? s.quietVolume : 0.3}" style="width:100%;">
          </div>
          <div style="margin-top:8px;">
            <label for="st_vinyl_sound_mode">Атмосферный звук и эффект:</label>
            <select id="st_vinyl_sound_mode" class="text_pole">
              <option value="auto" ${s.soundMode === "auto" ? "selected" : ""}>🪄 Авто под сцену (Дождь / Костёр / Светлячки / Lo-Fi)</option>
              <option value="lofi" ${s.soundMode === "lofi" ? "selected" : ""}>🎹 Lo-Fi и винил</option>
              <option value="rain" ${s.soundMode === "rain" ? "selected" : ""}>🌧️ Шум дождя</option>
              <option value="storm" ${s.soundMode === "storm" ? "selected" : ""}>⛈️ Дождь и гроза</option>
              <option value="fire" ${s.soundMode === "fire" ? "selected" : ""}>🔥 Треск костра</option>
              <option value="fireflies" ${s.soundMode === "fireflies" ? "selected" : ""}>✨ Светлячки и ночь</option>
            </select>
          </div>
          <div style="margin-top:8px;">
            <label for="st_vinyl_theme">Тема плеера:</label>
            <select id="st_vinyl_theme" class="text_pole">
              <option value="glass" ${s.theme === "glass" ? "selected" : ""}>🧊 Liquid Glass (Матовое стекло)</option>
              <option value="noir" ${s.theme === "noir" ? "selected" : ""}>🍷 Velvet Noir (Тёмный бархат)</option>
              <option value="neon" ${s.theme === "neon" ? "selected" : ""}>📼 Retro Neon (Ночной неон)</option>
              <option value="dark" ${s.theme === "dark" ? "selected" : ""}>🌙 Ночной Lo-Fi</option>
              <option value="latte" ${s.theme === "latte" ? "selected" : ""}>☕ Тёплый латте</option>
              <option value="pink" ${s.theme === "pink" ? "selected" : ""}>🌸 Нежная сакура</option>
              <option value="matcha" ${s.theme === "matcha" ? "selected" : ""}>🍵 Уютная матча</option>
            </select>
          </div>
          <div id="st_vinyl_preview" style="margin-top:10px;">
            [vinyl: Sweater Weather | The Neighbourhood | ${previewVibe} | Нажми на пластинку для звука, погладь котика на деке, а сердечком ♡ сохраняй треки в коллекцию!]
          </div>
          <div class="st-vinyl-shelf-box">
            <div class="st-vinyl-shelf-header">
              <span>💿 Моя коллекция пластинок (<span id="st_vinyl_shelf_count">0</span>)</span>
            </div>
            <div id="st_vinyl_shelf_list" class="st-vinyl-shelf-list"></div>
          </div>
        </div>
      </div>`;
    container.insertAdjacentHTML("beforeend", html);
    renderVinylInElement(document.getElementById("st_vinyl_preview"));
    renderFavoritesShelf();
    syncCardVisualState();

    const save = () => {
      const ctx = window.SillyTavern?.getContext?.();
      ctx?.saveSettingsDebounced?.();
      applyTheme();
      updatePrompt();
    };

    document.getElementById("st_vinyl_master_toggle")?.addEventListener("click", () => {
      setPluginEnabled(getSettings().pluginEnabled === false, true);
    });
    document.getElementById("st_vinyl_enabled")?.addEventListener("change", (e) => { s.enabled = e.target.checked; save(); });
    document.getElementById("st_vinyl_sound")?.addEventListener("change", (e) => { s.sound = e.target.checked; if (!s.sound) stopVinylSound(false); save(); });
    document.getElementById("st_vinyl_autospin")?.addEventListener("change", (e) => { s.autoSpin = e.target.checked; save(); });
    document.getElementById("st_vinyl_mascot")?.addEventListener("change", (e) => { s.cozyMascot = e.target.checked; save(); });
    document.getElementById("st_vinyl_compact")?.addEventListener("change", (e) => {
      s.compactMode = e.target.checked;
      document.querySelectorAll(".st-vinyl-card").forEach((c) => {
        c.classList.toggle("is-compact", s.compactMode);
        const btn = c.querySelector(".st-vinyl-mini-btn");
        if (btn) btn.textContent = s.compactMode ? "+" : "–";
      });
      save();
    });
    document.getElementById("st_vinyl_volume")?.addEventListener("input", (e) => {
      const val = parseFloat(e.target.value);
      s.quietVolume = isNaN(val) ? 0.3 : val;
      const lbl = document.getElementById("st_vinyl_vol_label");
      if (lbl) lbl.textContent = `${Math.round(s.quietVolume * 100)}%`;
      if (currentMasterGain) currentMasterGain.gain.value = getMasterVolume();
      save();
    });
    document.getElementById("st_vinyl_sound_mode")?.addEventListener("change", (e) => {
      s.soundMode = e.target.value;
      save();
      const previewCard = document.querySelector("#st_vinyl_preview .st-vinyl-card");
      if (previewCard && s.soundMode !== "auto" && SOUND_NAMES[s.soundMode]) {
        delete previewCard.dataset.manualSound;
        previewCard.dataset.sound = s.soundMode;
        const badge = previewCard.querySelector(".st-vinyl-vibe");
        if (badge) badge.textContent = SOUND_NAMES[s.soundMode];
      }
      if (activeAudioCard && s.soundMode !== "auto") {
        activeAudioCard.dataset.sound = s.soundMode;
        startVinylSound(s.soundMode, activeAudioCard);
      }
    });
    document.getElementById("st_vinyl_theme")?.addEventListener("change", (e) => { s.theme = e.target.value; save(); });
  }

  let hooksRegistered = false;
  function registerTavernEvents() {
    if (hooksRegistered) return;
    const ctx = window.SillyTavern?.getContext?.();
    const es = ctx?.eventSource;
    const et = ctx?.event_types;
    if (!es || !et) return;

    hooksRegistered = true;

    const triggerScan = () => {
      setTimeout(scanChat, 80);
      setTimeout(scanChat, 450);
      setTimeout(scanChat, 1200);
    };

    const eventsToWatch = [
      "GENERATION_ENDED",
      "GENERATION_STOPPED",
      "CHARACTER_MESSAGE_RENDERED",
      "USER_MESSAGE_RENDERED",
      "MESSAGE_RECEIVED",
      "MESSAGE_UPDATED",
      "MESSAGE_EDITED",
      "MESSAGE_SWIPED",
      "IMPERSONATE_READY",
      "CHAT_CHANGED",
      "MORE_MESSAGES_LOADED"
    ];

    eventsToWatch.forEach((name) => {
      if (et[name]) {
        es.on(et[name], triggerScan);
      }
    });
  }

  let mutationTimer = null;

  function initVinylExtension() {
    applyTheme();
    updatePrompt();
    mountSettingsUi();
    mountWandMenuButton();
    registerTavernEvents();
    scanChat();

    const chat = document.getElementById("chat");
    if (chat && !chat.dataset.vinylObserved) {
      chat.dataset.vinylObserved = "1";
      new MutationObserver((mutations) => {
        if (getSettings().pluginEnabled === false) return;
        const externalChange = mutations.some((m) => {
          const targetEl = m.target.nodeType === 1 ? m.target : m.target.parentElement;
          return targetEl && !targetEl.closest(".st-vinyl-card, .st-vinyl-auto-mount");
        });
        if (!externalChange) return;
        if (mutationTimer) clearTimeout(mutationTimer);
        mutationTimer = setTimeout(scanChat, 220);
      }).observe(chat, { childList: true, subtree: true, characterData: true });
    }
  }

  if (window.jQuery) {
    window.jQuery(() => initVinylExtension());
  } else {
    initVinylExtension();
  }
  setTimeout(initVinylExtension, 800);
  setTimeout(initVinylExtension, 2500);
  setInterval(scanChat, 1500);
})();
