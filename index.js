(() => {
  const EXT_NAME = "st-cozy-vinyl";
  const PROMPT_KEY = "cozy_vinyl_prompt";
  const DEFAULT_PROMPT = `At the very end of every response, include a soundtrack widget matching the current scene's mood using this exact format:\n[vinyl: Song Title | Artist | Emoji + Short Vibe | A short fitting lyric line or poetic description of the scene's atmosphere in Russian]`;

  const defaultSettings = {
    enabled: false,
    autoWidget: true,
    sound: true,
    soundMode: "auto",
    autoSpin: true,
    theme: "latte"
  };

  const SOUND_MODES = ["lofi", "rain", "storm", "fire", "fireflies"];
  const SOUND_NAMES = {
    lofi: "🎹 Lo-Fi и винил",
    rain: "🌧️ Шум дождя",
    storm: "⛈️ Дождь и гроза",
    fire: "🔥 Треск костра",
    fireflies: "✨ Светлячки"
  };

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
      re: /губ|объяти|нежн|сердц|люб|поцел|щек|румян|дыхани|коснул|ладон|тепл|kiss|love|heart|touch/i,
      vibe: "🎹 Lo-Fi Нежность",
      sound: "lofi",
      tracks: [
        ["Sunsetz", "Cigarettes After Sex"],
        ["I Wanna Be Yours", "Arctic Monkeys"],
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
    let h = 0;
    for (let i = 0; i < Math.min(str.length, 120); i++) {
      h = (h * 31 + str.charCodeAt(i)) >>> 0;
    }
    return h;
  }

  function extractQuote(text) {
    const clean = text.replace(/\[vinyl:[^\]]*\]/gi, "").replace(/\s+/g, " ").trim();
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
    return ctx.extensionSettings[EXT_NAME];
  }

  function applyTheme() {
    const { theme } = getSettings();
    document.body.classList.remove("st-vinyl-theme-pink", "st-vinyl-theme-dark", "st-vinyl-theme-matcha");
    if (theme !== "latte") {
      document.body.classList.add(`st-vinyl-theme-${theme}`);
    }
  }

  function updatePrompt() {
    const ctx = window.SillyTavern?.getContext?.();
    if (!ctx?.setExtensionPrompt) return;
    const { enabled } = getSettings();
    ctx.setExtensionPrompt(PROMPT_KEY, enabled ? DEFAULT_PROMPT : "", 1, 0);
  }

  // Атмосферный звуковой движок: Lo-Fi, Дождь, Гроза, Костёр, Светлячки
  let audioCtx = null;
  let stopAudioFn = null;

  function stopVinylSound() {
    if (stopAudioFn) {
      stopAudioFn();
      stopAudioFn = null;
    }
  }

  function startVinylSound(cardSoundMode = "lofi") {
    stopVinylSound();
    const s = getSettings();
    if (!s.sound) return;

    const mode = s.soundMode && s.soundMode !== "auto" ? s.soundMode : (cardSoundMode || "lofi");

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === "suspended") audioCtx.resume();

    let active = true;
    const timers = [];
    const sources = [];

    const createNoiseSource = (typeFn) => {
      const bufferSize = audioCtx.sampleRate * 3;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = typeFn(white, i, lastOut);
        lastOut = data[i];
      }
      const src = audioCtx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      sources.push(src);
      return src;
    };

    if (mode === "rain" || mode === "storm") {
      // Шум дождя по стеклу
      const rainSrc = createNoiseSource((w, _, last) => (last + 0.08 * w) / 1.08);
      const filter = audioCtx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = mode === "storm" ? 750 : 950;
      filter.Q.value = 0.7;

      const gain = audioCtx.createGain();
      gain.gain.value = mode === "storm" ? 0.16 : 0.12;

      rainSrc.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      rainSrc.start();

      // Капли дождя
      const dropTimer = setInterval(() => {
        if (!active) return;
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = "sine";
        const freq = 900 + Math.random() * 700;
        const now = audioCtx.currentTime;
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.35, now + 0.04);
        g.gain.setValueAtTime(0.001, now);
        g.gain.exponentialRampToValueAtTime(0.015, now + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
        osc.connect(g);
        g.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
      }, 350);
      timers.push(dropTimer);

      // Далёкие раскаты грома для режима "storm"
      if (mode === "storm") {
        const playThunder = () => {
          if (!active) return;
          const thSrc = createNoiseSource((w, _, last) => (last + 0.02 * w) / 1.02);
          const thFilter = audioCtx.createBiquadFilter();
          thFilter.type = "lowpass";
          thFilter.frequency.value = 110;
          const thGain = audioCtx.createGain();
          const now = audioCtx.currentTime;
          thGain.gain.setValueAtTime(0.001, now);
          thGain.gain.linearRampToValueAtTime(0.35, now + 0.4);
          thGain.gain.exponentialRampToValueAtTime(0.12, now + 1.4);
          thGain.gain.linearRampToValueAtTime(0.25, now + 1.9);
          thGain.gain.exponentialRampToValueAtTime(0.0001, now + 4.2);
          thSrc.connect(thFilter);
          thFilter.connect(thGain);
          thGain.connect(audioCtx.destination);
          thSrc.start(now);
          thSrc.stop(now + 4.3);
        };
        setTimeout(playThunder, 800);
        timers.push(setInterval(playThunder, 6500));
      }
    } else if (mode === "fire") {
      // Тёплый гул пламени + треск дров в костре/камине
      const warmth = createNoiseSource((w, _, last) => (last + 0.03 * w) / 1.03);
      const lowFilter = audioCtx.createBiquadFilter();
      lowFilter.type = "lowpass";
      lowFilter.frequency.value = 160;
      const warmGain = audioCtx.createGain();
      warmGain.gain.value = 0.22;
      warmth.connect(lowFilter);
      lowFilter.connect(warmGain);
      warmGain.connect(audioCtx.destination);
      warmth.start();

      // Потрескивание угольков и искр
      const crackle = createNoiseSource((w) => (Math.random() > 0.992 ? w * 0.9 : w * 0.01));
      const bp = audioCtx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 2200;
      bp.Q.value = 1.2;
      const cGain = audioCtx.createGain();
      cGain.gain.value = 0.14;
      crackle.connect(bp);
      bp.connect(cGain);
      cGain.connect(audioCtx.destination);
      crackle.start();
    } else if (mode === "fireflies") {
      // Ночной лес, сверчки и волшебные переливы светлячков
      const nightAir = createNoiseSource((w) => w * 0.015);
      const airFilter = audioCtx.createBiquadFilter();
      airFilter.type = "bandpass";
      airFilter.frequency.value = 3800;
      airFilter.Q.value = 4;
      const airGain = audioCtx.createGain();
      airGain.gain.value = 0.04;
      nightAir.connect(airFilter);
      airFilter.connect(airGain);
      airGain.connect(audioCtx.destination);
      nightAir.start();

      const chimeNotes = [523.25, 659.25, 783.99, 987.77, 1046.5, 1318.5];
      const playChime = () => {
        if (!active) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.value = chimeNotes[Math.floor(Math.random() * chimeNotes.length)];
        const now = audioCtx.currentTime;
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.03, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 2.9);
      };
      playChime();
      timers.push(setInterval(playChime, 1300));
    } else {
      // Режим Lo-Fi + мягкий шорох виниловой пластинки
      const vinylNoise = createNoiseSource((w) => w * (Math.random() > 0.995 ? 0.35 : 0.03));
      const filter = audioCtx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 1100;
      const noiseGain = audioCtx.createGain();
      noiseGain.gain.value = 0.06;
      vinylNoise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(audioCtx.destination);
      vinylNoise.start();

      const chords = [
        [261.63, 329.63, 392.00],
        [220.00, 261.63, 329.63],
        [174.61, 220.00, 261.63],
        [196.00, 246.94, 293.66]
      ];
      let chordIdx = 0;
      const playChord = () => {
        if (!active) return;
        const chord = chords[chordIdx % chords.length];
        chordIdx++;
        const now = audioCtx.currentTime;
        chord.forEach((freq, i) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = "triangle";
          osc.frequency.value = freq;
          const lp = audioCtx.createBiquadFilter();
          lp.type = "lowpass";
          lp.frequency.value = 650;
          gain.gain.setValueAtTime(0.001, now + i * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.025, now + i * 0.12 + 0.15);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);
          osc.connect(lp);
          lp.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(now + i * 0.12);
          osc.stop(now + 2.5);
        });
      };
      playChord();
      timers.push(setInterval(playChord, 2400));
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

  const VINYL_REGEX = /\[vinyl:\s*([^|\]]+?)\s*\|\s*([^|\]]+?)\s*\|\s*([^|\]]+?)(?:\s*\|\s*([^\]]+?))?\s*\]/gi;

  function buildVinylHtml(title, artist, vibe, lyric, sound = "lofi") {
    const { autoSpin } = getSettings();
    const playClass = autoSpin ? "is-playing" : "";
    const statusText = autoSpin ? "NOW PLAYING" : "PAUSED";
    const t = escapeHtml(title.trim());
    const a = escapeHtml(artist.trim());
    const v = escapeHtml(vibe.trim());
    const l = lyric ? `<div class="st-vinyl-lyric">«${escapeHtml(lyric.trim())}»</div>` : "";

    return `<div class="st-vinyl-card ${playClass}" data-sound="${sound}" title="Нажми на пластинку для звука, или на плашку вайба справа — чтобы сменить звук"><div class="st-vinyl-deck"><div class="st-vinyl-disc"></div><div class="st-vinyl-arm"></div><div class="st-vinyl-note">♪</div></div><div class="st-vinyl-info"><div class="st-vinyl-top"><span class="st-vinyl-status"><span class="st-vinyl-eq"><span></span><span></span><span></span></span><span class="st-vinyl-label">${statusText}</span></span><span class="st-vinyl-vibe" title="Нажми, чтобы переключить звук (Lo-Fi / Дождь / Гроза / Костёр / Светлячки)">${v}</span></div><div class="st-vinyl-title">${t}</div><div class="st-vinyl-artist">${a}</div>${l}</div></div>`;
  }

  function renderVinylInElement(el) {
    if (!el || !el.innerHTML.includes("[vinyl:")) return;
    VINYL_REGEX.lastIndex = 0;
    if (!VINYL_REGEX.test(el.innerHTML)) return;
    VINYL_REGEX.lastIndex = 0;
    el.innerHTML = el.innerHTML.replace(VINYL_REGEX, (_, title, artist, vibe, lyric) =>
      buildVinylHtml(title, artist, vibe, lyric, "lofi")
    );
  }

  // Строгая проверка: генерирует ли сейчас бот ответ
  let isGenerating = false;

  function isBotStreamingNow() {
    if (isGenerating) return true;
    const stopBtn = document.getElementById("mes_stop");
    if (stopBtn && stopBtn.offsetParent !== null && getComputedStyle(stopBtn).display !== "none") {
      return true;
    }
    if (document.body.classList.contains("generating")) return true;
    return false;
  }

  function scanChat() {
    // Пока идёт генерация поста — ничего не рисуем и убираем плашку с печатающегося поста
    if (isBotStreamingNow()) {
      const lastMount = document.querySelector("#chat .mes:last-child .st-vinyl-auto-mount");
      if (lastMount) lastMount.remove();
      return;
    }

    const settings = getSettings();
    const allMessages = Array.from(document.querySelectorAll("#chat .mes"));

    allMessages.forEach((mes) => {
      const mesText = mes.querySelector(".mes_text");
      if (!mesText) return;

      // 1. Если есть полностью закрытый тег [vinyl: ... | ... | ...]
      VINYL_REGEX.lastIndex = 0;
      if (VINYL_REGEX.test(mesText.innerHTML)) {
        renderVinylInElement(mesText);
        const autoMount = mes.querySelector(".st-vinyl-auto-mount");
        if (autoMount) autoMount.remove();
        return;
      }

      // 2. Авто-виджет строго после завершения поста
      const isUser = mes.getAttribute("is_user") === "true";
      const isSystem = mes.getAttribute("is_system") === "true";
      if (isUser || isSystem) return;

      let mount = mes.querySelector(".st-vinyl-auto-mount");
      if (settings.autoWidget === false) {
        if (mount) mount.remove();
        return;
      }

      if (mesText.querySelector(".st-vinyl-card")) return;

      const rawText = (mesText.innerText || "").trim();
      if (rawText.length < 15) return;

      const lenKey = String(rawText.length);
      if (mount && mount.dataset.len === lenKey) return;

      const auto = pickAutoTrack(rawText);
      if (!mount) {
        mount = document.createElement("div");
        mount.className = "st-vinyl-auto-mount";
        mesText.insertAdjacentElement("afterend", mount);
      }
      mount.dataset.len = lenKey;
      mount.innerHTML = buildVinylHtml(auto.title, auto.artist, auto.vibe, auto.lyric, auto.sound);
    });
  }

  // Клик по пластинке или смене звука
  document.addEventListener("click", (e) => {
    const card = e.target.closest(".st-vinyl-card");
    if (!card) return;

    // Если нажали на плашку вайба справа сверху — переключаем звук по кругу!
    const vibeBadge = e.target.closest(".st-vinyl-vibe");
    if (vibeBadge) {
      e.stopPropagation();
      const current = card.dataset.sound || "lofi";
      const nextIdx = (SOUND_MODES.indexOf(current) + 1) % SOUND_MODES.length;
      const nextSound = SOUND_MODES[nextIdx];
      card.dataset.sound = nextSound;
      vibeBadge.textContent = SOUND_NAMES[nextSound];
      card.classList.add("is-playing");
      const label = card.querySelector(".st-vinyl-label");
      if (label) label.textContent = "NOW PLAYING";
      startVinylSound(nextSound);
      return;
    }

    const isPlaying = card.classList.toggle("is-playing");
    const label = card.querySelector(".st-vinyl-label");
    if (label) label.textContent = isPlaying ? "NOW PLAYING" : "PAUSED";

    if (isPlaying) {
      startVinylSound(card.dataset.sound || "lofi");
    } else {
      stopVinylSound();
    }
  });

  // Панель настроек в меню Extensions
  function mountSettingsUi() {
    const container = document.getElementById("extensions_settings2") || document.getElementById("extensions_settings");
    if (!container || document.getElementById("st-vinyl-settings")) return;

    const s = getSettings();
    const html = `
      <div id="st-vinyl-settings" class="inline-drawer">
        <div class="inline-drawer-toggle inline-drawer-header">
          <b>🎵 Cozy Vinyl Player</b>
          <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
        </div>
        <div class="inline-drawer-content">
          <label class="checkbox_label"><input type="checkbox" id="st_vinyl_sound" ${s.sound ? "checked" : ""}><span>Включить звук при клике</span></label>
          <label class="checkbox_label"><input type="checkbox" id="st_vinyl_autospin" ${s.autoSpin ? "checked" : ""}><span>Крутить пластинку сразу</span></label>
          <label class="checkbox_label"><input type="checkbox" id="st_vinyl_enabled" ${s.enabled ? "checked" : ""}><span>Авто-промпт для бота (необязательно)</span></label>
          <div style="margin-top:8px;">
            <label for="st_vinyl_sound_mode">Атмосферный звук:</label>
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
              <option value="latte" ${s.theme === "latte" ? "selected" : ""}>☕ Тёплый латте</option>
              <option value="pink" ${s.theme === "pink" ? "selected" : ""}>🌸 Нежная сакура</option>
              <option value="dark" ${s.theme === "dark" ? "selected" : ""}>🌙 Ночной Lo-Fi</option>
              <option value="matcha" ${s.theme === "matcha" ? "selected" : ""}>🍵 Уютная матча</option>
            </select>
          </div>
          <div id="st_vinyl_preview" style="margin-top:10px;">
            [vinyl: Sweater Weather | The Neighbourhood | 🌧️ Шум дождя | Нажми на пластинку для звука, а на плашку справа сверху — чтобы переключить Дождь / Грозу / Костёр / Светлячков!]
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
    document.getElementById("st_vinyl_sound_mode")?.addEventListener("change", (e) => { s.soundMode = e.target.value; save(); });
    document.getElementById("st_vinyl_theme")?.addEventListener("change", (e) => { s.theme = e.target.value; save(); });
  }

  // Подписка строго на завершение генерации (как в AFTER HOURS), чтобы пластинка НЕ ехала вместе с текстом
  let hooksRegistered = false;
  function registerTavernEvents() {
    if (hooksRegistered) return;
    const ctx = window.SillyTavern?.getContext?.();
    const es = ctx?.eventSource;
    const et = ctx?.event_types;
    if (!es || !et) return;

    hooksRegistered = true;

    const onStart = () => {
      isGenerating = true;
      const lastMount = document.querySelector("#chat .mes:last-child .st-vinyl-auto-mount");
      if (lastMount) lastMount.remove();
    };
    const onFinish = () => {
      isGenerating = false;
      setTimeout(scanChat, 450);
      setTimeout(scanChat, 1400);
    };

    if (et.GENERATION_STARTED) es.on(et.GENERATION_STARTED, onStart);
    if (et.GENERATION_ENDED) es.on(et.GENERATION_ENDED, onFinish);
    if (et.GENERATION_STOPPED) es.on(et.GENERATION_STOPPED, onFinish);
    if (et.CHARACTER_MESSAGE_RENDERED) es.on(et.CHARACTER_MESSAGE_RENDERED, onFinish);
    if (et.MESSAGE_RECEIVED) es.on(et.MESSAGE_RECEIVED, onFinish);
    if (et.CHAT_CHANGED) es.on(et.CHAT_CHANGED, () => {
      isGenerating = false;
      setTimeout(scanChat, 400);
    });
  }

  function initVinylExtension() {
    applyTheme();
    updatePrompt();
    mountSettingsUi();
    registerTavernEvents();
    scanChat();

    // Следим только за появлением новых блоков сообщений (без subtree), чтобы не дёргать пост во время печати
    const chat = document.getElementById("chat");
    if (chat && !chat.dataset.vinylObserved) {
      chat.dataset.vinylObserved = "1";
      new MutationObserver(() => {
        if (!isBotStreamingNow()) {
          setTimeout(scanChat, 500);
        }
      }).observe(chat, { childList: true, subtree: false });
    }
  }

  if (window.jQuery) {
    window.jQuery(() => initVinylExtension());
  } else {
    initVinylExtension();
  }
  setTimeout(initVinylExtension, 800);
  setTimeout(initVinylExtension, 2500);
})();
