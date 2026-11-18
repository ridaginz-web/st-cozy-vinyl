(() => {
  const EXT_NAME = "st-cozy-vinyl";
  const PROMPT_KEY = "cozy_vinyl_prompt";
  const DEFAULT_PROMPT = `At the very end of every response, include a soundtrack widget matching the current scene's mood using this exact format:\n[vinyl: Song Title | Artist | Emoji + Short Vibe | A short fitting lyric line or poetic description of the scene's atmosphere in Russian]`;

  const defaultSettings = {
    enabled: false,
    autoWidget: true,
    sound: true,
    soundMode: "auto",
    volume: 0.45,
    quietVolume: 0.3,
    autoSpin: true,
    compactMode: false,
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
    return s;
  }

  function applyTheme() {
    const { theme } = getSettings();
    document.body.classList.remove(...THEME_CLASSES);
    if (theme && theme !== "latte") {
      document.body.classList.add(`st-vinyl-theme-${theme}`);
    }
  }

  function updatePrompt() {
    const ctx = window.SillyTavern?.getContext?.();
    if (!ctx?.setExtensionPrompt) return;
    const { enabled } = getSettings();
    ctx.setExtensionPrompt(PROMPT_KEY, enabled ? DEFAULT_PROMPT : "", 1, 0);
  }

  // Определение режима звука по тексту плашки вайба или контексту карточки
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

  // Атмосферный звуковой движок (с разблокировкой звука на iOS / Android и чёткой слышимостью на динамике телефона)
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

  function syncCardVisualState() {
    document.querySelectorAll(".st-vinyl-card").forEach((c) => {
      const label = c.querySelector(".st-vinyl-label");
      if (c === activeAudioCard) {
        c.classList.add("is-playing", "is-audio-on");
        if (label) label.textContent = "🔊 NOW PLAYING";
      } else {
        c.classList.remove("is-audio-on");
        if (label) {
          label.textContent = c.classList.contains("is-playing") ? "NOW PLAYING" : "PAUSED";
        }
      }
    });
  }

  function stopVinylSound() {
    if (stopAudioFn) {
      stopAudioFn();
      stopAudioFn = null;
    }
    currentMasterGain = null;
    activeAudioCard = null;
    syncCardVisualState();
  }

  function startVinylSound(cardSoundMode = "lofi", cardEl = null) {
    stopVinylSound();
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

    // Мягкий ламповый щелчок опускания иглы при старте
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
    const t = escapeHtml(cleanTitle);
    const a = escapeHtml(cleanArtist);
    const v = escapeHtml(cleanVibe);

    // Бегущая строка автоматически включается для длинных названий
    const titleMarquee = cleanTitle.length > 26 ? "is-marquee" : "";
    const artistMarquee = cleanArtist.length > 32 ? "is-marquee" : "";

    const l = cleanLyric
      ? `<div class="st-vinyl-wave"></div><div class="st-vinyl-lyric">«${escapeHtml(cleanLyric)}»</div>`
      : "";

    return `<div class="st-vinyl-card ${playClass} ${compactClass}" data-sound="${resolvedSound}" title="Нажми на пластинку для звука, на плашку вайба — для смены атмосферы, на кнопку [–] — чтобы свернуть"><div class="st-vinyl-fx"><span class="st-vinyl-ember e1"></span><span class="st-vinyl-ember e2"></span><span class="st-vinyl-ember e3"></span><span class="st-vinyl-firefly f1"></span><span class="st-vinyl-firefly f2"></span><span class="st-vinyl-firefly f3"></span></div><div class="st-vinyl-deck"><div class="st-vinyl-disc"></div><div class="st-vinyl-sheen"></div><div class="st-vinyl-arm"></div><div class="st-vinyl-led"></div><div class="st-vinyl-notes"><span class="st-vinyl-note n1">♪</span><span class="st-vinyl-note n2">♫</span><span class="st-vinyl-note n3">✦</span></div></div><div class="st-vinyl-info"><div class="st-vinyl-top"><span class="st-vinyl-status"><span class="st-vinyl-eq"><span></span><span></span><span></span><span></span></span><span class="st-vinyl-label">${statusText}</span></span><span class="st-vinyl-actions"><span class="st-vinyl-vibe" title="Нажми, чтобы переключить атмосферу (Lo-Fi / Дождь / Гроза / Костёр / Светлячки)">${v}</span><span class="st-vinyl-mini-btn" title="Свернуть / развернуть плеер">${s.compactMode ? "+" : "–"}</span></span></div><div class="st-vinyl-title-wrap"><div class="st-vinyl-title ${titleMarquee}">${t}</div></div><div class="st-vinyl-artist-wrap"><div class="st-vinyl-artist ${artistMarquee}">${a}</div></div>${l}</div></div>`;
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
    isScanning = true;

    try {
      const streaming = isDomStreamingNow();
      const settings = getSettings();
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
    if (e.target.closest && e.target.closest(".st-vinyl-card")) {
      unlockAudioEngine();
    }
  }, { passive: true });

  document.addEventListener("touchend", (e) => {
    if (e.target.closest && e.target.closest(".st-vinyl-card")) {
      unlockAudioEngine();
    }
  }, { passive: true });

  // Обработка кликов по плееру, плашке атмосферы и кнопке компактного режима
  document.addEventListener("click", (e) => {
    const card = e.target.closest?.(".st-vinyl-card");
    if (!card) return;

    // 1. Кнопка сворачивания/разворачивания карточки [–] / [+]
    const miniBtn = e.target.closest(".st-vinyl-mini-btn");
    if (miniBtn) {
      e.stopPropagation();
      const compact = card.classList.toggle("is-compact");
      miniBtn.textContent = compact ? "+" : "–";
      return;
    }

    const s = getSettings();

    // 2. Плашка вайба справа сверху — переключает звук И визуальный эффект карточки по кругу
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

    // 3. Первый клик по пластинке сразу запускает звук
    if (activeAudioCard !== card) {
      if (!s.sound) {
        s.sound = true;
        const soundChk = document.getElementById("st_vinyl_sound");
        if (soundChk) soundChk.checked = true;
      }
      card.classList.add("is-playing");
      startVinylSound(soundToPlay, card);
      return;
    }

    // 4. Повторный клик ставит на паузу
    card.classList.remove("is-playing", "is-audio-on");
    stopVinylSound();
  });

  // Панель настроек в меню Extensions
  function mountSettingsUi() {
    const container = document.getElementById("extensions_settings2") || document.getElementById("extensions_settings");
    if (!container || document.getElementById("st-vinyl-settings")) return;

    const s = getSettings();
    const previewMode = s.soundMode && s.soundMode !== "auto" && SOUND_NAMES[s.soundMode] ? s.soundMode : "rain";
    const previewVibe = SOUND_NAMES[previewMode] || "🌧️ Шум дождя";

    const html = `
      <div id="st-vinyl-settings" class="inline-drawer">
        <div class="inline-drawer-toggle inline-drawer-header">
          <b>🎵 Cozy Vinyl Player</b>
          <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
        </div>
        <div class="inline-drawer-content">
          <label class="checkbox_label"><input type="checkbox" id="st_vinyl_sound" ${s.sound ? "checked" : ""}><span>Включить звук при клике</span></label>
          <label class="checkbox_label"><input type="checkbox" id="st_vinyl_autospin" ${s.autoSpin ? "checked" : ""}><span>Крутить пластинку сразу</span></label>
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
            [vinyl: Sweater Weather | The Neighbourhood | ${previewVibe} | Нажми на пластинку для звука, на плашку справа — чтобы сменить погоду, а на кружок «–» в углу — чтобы свернуть!]
          </div>
        </div>
      </div>`;
    container.insertAdjacentHTML("beforeend", html);
    renderVinylInElement(document.getElementById("st_vinyl_preview"));

    const save = () => {
      const ctx = window.SillyTavern?.getContext?.();
      ctx?.saveSettingsDebounced?.();
      applyTheme();
      updatePrompt();
    };

    document.getElementById("st_vinyl_enabled")?.addEventListener("change", (e) => { s.enabled = e.target.checked; save(); });
    document.getElementById("st_vinyl_sound")?.addEventListener("change", (e) => { s.sound = e.target.checked; if (!s.sound) stopVinylSound(); save(); });
    document.getElementById("st_vinyl_autospin")?.addEventListener("change", (e) => { s.autoSpin = e.target.checked; save(); });
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
    registerTavernEvents();
    scanChat();

    const chat = document.getElementById("chat");
    if (chat && !chat.dataset.vinylObserved) {
      chat.dataset.vinylObserved = "1";
      new MutationObserver((mutations) => {
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