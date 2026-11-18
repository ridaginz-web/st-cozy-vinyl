(() => {
  const EXT_NAME = "st-cozy-vinyl";
  const PROMPT_KEY = "cozy_vinyl_prompt";
  const DEFAULT_PROMPT = `At the very end of every response, include a soundtrack widget matching the current scene's mood using this exact format:\n[vinyl: Song Title | Artist | Emoji + Short Vibe | A short fitting lyric line or poetic description of the scene's atmosphere in Russian]`;

  const defaultSettings = {
    enabled: true,
    sound: true,
    autoSpin: true,
    theme: "latte"
  };

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

  function renderVinylInElement(el) {
    if (!el || !el.innerHTML.includes("[vinyl:")) return;
    const { autoSpin } = getSettings();
    const playClass = autoSpin ? "is-playing" : "";
    const statusText = autoSpin ? "NOW PLAYING" : "PAUSED";

    el.innerHTML = el.innerHTML.replace(VINYL_REGEX, (_, title, artist, vibe, lyric) => {
      const t = escapeHtml(title.trim());
      const a = escapeHtml(artist.trim());
      const v = escapeHtml(vibe.trim());
      const l = lyric ? `<div class="st-vinyl-lyric">«${escapeHtml(lyric.trim())}»</div>` : "";

      return `<div class="st-vinyl-card ${playClass}" title="Нажми, чтобы включить/выключить пластинку"><div class="st-vinyl-deck"><div class="st-vinyl-disc"></div><div class="st-vinyl-arm"></div><div class="st-vinyl-note">♪</div></div><div class="st-vinyl-info"><div class="st-vinyl-top"><span class="st-vinyl-status"><span class="st-vinyl-eq"><span></span><span></span><span></span></span><span class="st-vinyl-label">${statusText}</span></span><span class="st-vinyl-vibe">${v}</span></div><div class="st-vinyl-title">${t}</div><div class="st-vinyl-artist">${a}</div>${l}</div></div>`;
    });
  }

  function scanChat() {
    document.querySelectorAll("#chat .mes_text").forEach(renderVinylInElement);
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
