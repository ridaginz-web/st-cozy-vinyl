(() => {
  const EXT_NAME = "st-cozy-vinyl";
  const PROMPT_KEY = "cozy_vinyl_prompt";
  const DEFAULT_PROMPT = `At the very end of every response, include a soundtrack widget matching the current scene's mood using this exact format:\n[vinyl: Song Title | Artist | Emoji + Short Vibe | A short fitting lyric line or poetic description of the scene's atmosphere in Russian]`;

  const defaultSettings = {
    enabled: true,
    autoWidget: true,
    sound: true,
    autoSpin: true,
    theme: "latte"
  };

  // Коллекция атмосферных пластинок под разные вайбы сцены (если бот не написал тег сам)
  const MOOD_TRACKS = [
    {
      re: /дожд|капл|окн|гроз|зонт|туч|пасмурн|rain|storm|window/i,
      vibe: "🌧️ Шум дождя",
      tracks: [
        ["Sweater Weather", "The Neighbourhood"],
        ["snowfall", "Øneheart & reidenshi"],
        ["Rainy Night in Soho", "The Pogues"],
        ["Stan", "Lofi Fruits Music"]
      ]
    },
    {
      re: /ноч|лун|звезд|темнот|полноч|спать|сон|кроват|тишин|night|moon|dark|sleep/i,
      vibe: "🌙 Полночь",
      tracks: [
        ["Apocalypse", "Cigarettes After Sex"],
        ["Space Song", "Beach House"],
        ["Midnight City", "M83"],
        ["After Dark", "Mr.Kitty"]
      ]
    },
    {
      re: /губ|объяти|нежн|сердц|люб|поцел|щек|румян|дыхани|коснул|ладон|тепл|kiss|love|heart|touch/i,
      vibe: "💕 Нежность",
      tracks: [
        ["Sunsetz", "Cigarettes After Sex"],
        ["I Wanna Be Yours", "Arctic Monkeys"],
        ["Mystery of Love", "Sufjan Stevens"],
        ["Je te laisserai des mots", "Patrick Watson"]
      ]
    },
    {
      re: /чай|кофе|какао|кафе|кружк|плед|камин|уют|таверн|дом|coffee|tea|warm|cozy/i,
      vibe: "☕ Уютный вечер",
      tracks: [
        ["Coffee Breath", "Sofia Mills"],
        ["death bed (coffee for your head)", "Powfu & beabadoobee"],
        ["Sunday Morning", "Maroon 5"],
        ["Chamber of Reflection", "Mac DeMarco"]
      ]
    },
    {
      re: /взгляд|опасн|кров|злост|крик|битв|меч|страх|рык|сжал|тен|холод|fight|blood|danger/i,
      vibe: "🔥 Напряжение",
      tracks: [
        ["505", "Arctic Monkeys"],
        ["Way Down We Go", "KALEO"],
        ["Do I Wanna Know?", "Arctic Monkeys"],
        ["The Hills", "The Weeknd"]
      ]
    },
    {
      re: /.*/,
      vibe: "✨ Атмосфера",
      tracks: [
        ["Resonance", "HOME"],
        [" Sparks", "Coldplay"],
        [" cardigan", "Taylor Swift"],
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

  // Мини-синтезатор: мягкий треск винила + тёплые lo-fi нотки
  let audioCtx = null;
  let stopAudioFn = null;

  function stopVinylSound() {
    if (stopAudioFn) {
      stopAudioFn();
      stopAudioFn = null;
    }
  }

  function startVinylSound() {
    stopVinylSound();
    if (!getSettings().sound) return;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === "suspended") audioCtx.resume();

    let active = true;

    // 1. Тёплый шорох пластинки
    const bufferSize = audioCtx.sampleRate * 2;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * (Math.random() > 0.995 ? 0.35 : 0.03);
    }

    const whiteNoise = audioCtx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = audioCtx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1100;

    const noiseGain = audioCtx.createGain();
    noiseGain.gain.value = 0.06;

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(audioCtx.destination);
    whiteNoise.start();

    // 2. Уютные lo-fi нотки (пентатоника)
    const notes = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];
    const playNote = () => {
      if (!active) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = notes[Math.floor(Math.random() * notes.length)];

      const now = audioCtx.currentTime;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.035, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 2.3);
    };

    playNote();
    const timer = setInterval(playNote, 1800);

    stopAudioFn = () => {
      active = false;
      clearInterval(timer);
      try { whiteNoise.stop(); } catch (e) {}
    };
  }

  function escapeHtml(str = "") {
    return str.replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  }

  const VINYL_REGEX = /\[vinyl:\s*([^|\]]+?)\s*\|\s*([^|\]]+?)\s*\|\s*([^|\]]+?)(?:\s*\|\s*([^\]]+?))?\s*\]/gi;

  function buildVinylHtml(title, artist, vibe, lyric) {
    const { autoSpin } = getSettings();
    const playClass = autoSpin ? "is-playing" : "";
    const statusText = autoSpin ? "NOW PLAYING" : "PAUSED";
    const t = escapeHtml(title.trim());
    const a = escapeHtml(artist.trim());
    const v = escapeHtml(vibe.trim());
    const l = lyric ? `<div class="st-vinyl-lyric">«${escapeHtml(lyric.trim())}»</div>` : "";

    return `<div class="st-vinyl-card ${playClass}" title="Нажми, чтобы включить/выключить пластинку"><div class="st-vinyl-deck"><div class="st-vinyl-disc"></div><div class="st-vinyl-arm"></div><div class="st-vinyl-note">♪</div></div><div class="st-vinyl-info"><div class="st-vinyl-top"><span class="st-vinyl-status"><span class="st-vinyl-eq"><span></span><span></span><span></span></span><span class="st-vinyl-label">${statusText}</span></span><span class="st-vinyl-vibe">${v}</span></div><div class="st-vinyl-title">${t}</div><div class="st-vinyl-artist">${a}</div>${l}</div></div>`;
  }

  function renderVinylInElement(el) {
    if (!el || !el.innerHTML.includes("[vinyl:")) return;
    el.innerHTML = el.innerHTML.replace(VINYL_REGEX, (_, title, artist, vibe, lyric) =>
      buildVinylHtml(title, artist, vibe, lyric)
    );
  }

  function scanChat() {
    const settings = getSettings();
    document.querySelectorAll("#chat .mes").forEach((mes) => {
      const mesText = mes.querySelector(".mes_text");
      if (!mesText) return;

      // 1. Если бот сам написал тег [vinyl: ...]
      if (mesText.innerHTML.includes("[vinyl:")) {
        renderVinylInElement(mesText);
        const autoMount = mes.querySelector(".st-vinyl-auto-mount");
        if (autoMount) autoMount.remove();
        return;
      }

      // 2. Авто-виджет под ответами персонажа в чате (даже без тега!)
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
      mount.innerHTML = buildVinylHtml(auto.title, auto.artist, auto.vibe, auto.lyric);
    });
  }

  // Клик по пластинке в чате
  document.addEventListener("click", (e) => {
    const card = e.target.closest(".st-vinyl-card");
    if (!card) return;

    const isPlaying = card.classList.toggle("is-playing");
    const label = card.querySelector(".st-vinyl-label");
    if (label) label.textContent = isPlaying ? "NOW PLAYING" : "PAUSED";

    if (isPlaying) {
      startVinylSound();
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
          <label class="checkbox_label"><input type="checkbox" id="st_vinyl_enabled" ${s.enabled ? "checked" : ""}><span>Авто-промпт для бота</span></label>
          <label class="checkbox_label"><input type="checkbox" id="st_vinyl_sound" ${s.sound ? "checked" : ""}><span>Звук винила и lo-fi при клике</span></label>
          <label class="checkbox_label"><input type="checkbox" id="st_vinyl_autospin" ${s.autoSpin ? "checked" : ""}><span>Крутить пластинку сразу</span></label>
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
            [vinyl: Sweater Weather | The Neighbourhood | 🌧️ Тест плеера | Нажми на пластинку, чтобы проверить звук и тему]
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
    document.getElementById("st_vinyl_theme")?.addEventListener("change", (e) => { s.theme = e.target.value; save(); });
  }

  // Запуск сразу (SillyTavern подгружает расширения уже после события load)
  function initVinylExtension() {
    applyTheme();
    updatePrompt();
    mountSettingsUi();
    scanChat();

    const chat = document.getElementById("chat");
    if (chat && !chat.dataset.vinylObserved) {
      chat.dataset.vinylObserved = "1";
      new MutationObserver(() => scanChat()).observe(chat, { childList: true, subtree: true });
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
