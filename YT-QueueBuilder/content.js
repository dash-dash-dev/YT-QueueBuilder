(() => {
  'use strict';

  const DEBUG = false;
  const BTN_CLASS = 'tm-yt-notif-session-btn';
  const WRAP_CLASS = 'tm-yt-notif-session-wrap';
  const HUD_ID = 'tm-yt-notif-session-hud';
  const STYLE_ID = 'tm-yt-notif-session-style';
  const ENHANCED_ATTR = 'data-tm-session-enhanced';

  let queue = [];

  const log = (...args) => DEBUG && console.log('[YT Notif Session Queue]', ...args);

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .${WRAP_CLASS} {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        margin-left: auto !important;
      }

      .${BTN_CLASS} {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 40px !important;
        height: 40px !important;
        min-width: 40px !important;
        min-height: 40px !important;
        padding: 0 !important;
        margin: 0 !important;
        border: none !important;
        border-radius: 999px !important;
        background: rgba(255,255,255,.08) !important;
        color: var(--yt-spec-text-primary, #fff) !important;
        font: 700 14px/1 Arial, sans-serif !important;
        cursor: pointer !important;
        box-sizing: border-box !important;
      }

      .${BTN_CLASS}:hover {
        background: rgba(255,255,255,.16) !important;
      }

      .${BTN_CLASS}[data-state="done"] {
        background: rgba(46,125,50,.92) !important;
      }

      #${HUD_ID} {
        position: fixed !important;
        right: 16px !important;
        bottom: 16px !important;
        z-index: 2147483647 !important;
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        padding: 10px 12px !important;
        border-radius: 999px !important;
        border: 1px solid rgba(255,255,255,.14) !important;
        background: rgba(15, 15, 15, .88) !important;
        backdrop-filter: blur(10px) !important;
        color: #fff !important;
        font: 500 13px/1.2 Arial, sans-serif !important;
        box-shadow: 0 6px 24px rgba(0,0,0,.28) !important;
      }

      #${HUD_ID}[hidden] {
        display: none !important;
      }

      #${HUD_ID} .tm-count {
        min-width: 24px !important;
        text-align: center !important;
        font-weight: 700 !important;
      }

      #${HUD_ID} button {
        border: 0 !important;
        border-radius: 999px !important;
        padding: 8px 12px !important;
        cursor: pointer !important;
        color: #fff !important;
        background: rgba(255,255,255,.12) !important;
        font: 600 12px/1 Arial, sans-serif !important;
      }

      #${HUD_ID} button:hover {
        background: rgba(255,255,255,.18) !important;
      }

      #${HUD_ID} .tm-open {
        background: #3ea6ff !important;
        color: #0f0f0f !important;
      }

      #${HUD_ID} .tm-open:hover {
        background: #65b8ff !important;
      }
    `;
    document.head.appendChild(style);
  }

  function getVideoIdFromUrl(url) {
    try {
      const u = new URL(url, location.origin);
      if (u.pathname === '/watch') return u.searchParams.get('v');
      if (u.pathname.startsWith('/shorts/')) return u.pathname.split('/')[2] || null;
      return null;
    } catch {
      return null;
    }
  }

  function getNotificationVideoLink(renderer) {
    return renderer.querySelector('a[href*="watch?v="], a[href*="/watch?"], a[href*="/shorts/"]');
  }

  function getNotificationTitle(renderer) {
    const titleSpan = renderer.querySelector('.message span:last-child');
    return ((titleSpan && titleSpan.textContent) || 'Video').trim();
  }

  function ensureHud() {
    let hud = document.getElementById(HUD_ID);
    if (hud) return hud;

    hud = document.createElement('div');
    hud.id = HUD_ID;
    hud.hidden = true;

    const label = document.createElement('span');
    label.textContent = 'Session';

    const count = document.createElement('span');
    count.className = 'tm-count';
    count.textContent = '0';

    const openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.className = 'tm-open';
    openBtn.textContent = 'Open';
    openBtn.addEventListener('click', openQueue);

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.textContent = 'Clear';
    clearBtn.addEventListener('click', () => {
      queue = [];
      updateHud();
      log('queue cleared');
    });

    hud.appendChild(label);
    hud.appendChild(count);
    hud.appendChild(openBtn);
    hud.appendChild(clearBtn);
    document.documentElement.appendChild(hud);
    return hud;
  }

  function updateHud() {
    const hud = ensureHud();
    const count = hud.querySelector('.tm-count');
    count.textContent = String(queue.length);
    hud.hidden = queue.length === 0;
  }

  function buildWatchVideosUrl(videoIds) {
    const ids = videoIds.join(',');
    return `https://www.youtube.com/watch_videos?video_ids=${encodeURIComponent(ids)}`;
  }

  function openQueue() {
    if (!queue.length) return;
    const url = buildWatchVideosUrl(queue.map(item => item.videoId));
    window.location.assign(url);
  }

  function flashButton(btn, stateText) {
    btn.setAttribute('data-state', 'done');
    btn.textContent = stateText;
    setTimeout(() => {
      btn.removeAttribute('data-state');
      btn.textContent = '+Q';
    }, 900);
  }

  function addToQueue(videoId, title) {
    if (!videoId) return { ok: false, reason: 'No video ID' };
    if (queue.some(item => item.videoId === videoId)) {
      return { ok: true, duplicate: true };
    }
    queue.push({ videoId, title });
    updateHud();
    log('queued', videoId, title, 'count=', queue.length);
    return { ok: true, duplicate: false };
  }

  function makeButton(videoId, title, nativeButton) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = BTN_CLASS;
    btn.setAttribute('aria-label', `Add ${title} to session`);
    btn.title = `Add to session: ${title}`;
    btn.textContent = '+Q';

    btn.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const result = addToQueue(videoId, title);
      flashButton(btn, result.duplicate ? '=' : '✓');
    });

    // btn.addEventListener('contextmenu', (ev) => {
    //   ev.preventDefault();
    //   ev.stopPropagation();
    //   if (nativeButton) nativeButton.click();
    // });

    return btn;
  }

  function enhanceRenderer(renderer) {
    if (!renderer) return;
    if (renderer.getAttribute(ENHANCED_ATTR) === '1') return;
    if (renderer.querySelector(`.${BTN_CLASS}`)) {
      renderer.setAttribute(ENHANCED_ATTR, '1');
      return;
    }

    const link = getNotificationVideoLink(renderer);
    const videoId = link ? getVideoIdFromUrl(link.href) : null;
    if (!videoId) return;

    const menuHost = renderer.querySelector('#menu ytd-menu-renderer');
    const nativeIconButton = renderer.querySelector('#menu yt-icon-button');
    const nativeButton = renderer.querySelector('#menu yt-icon-button button[aria-label*="Action menu"]');

    if (!menuHost || !nativeIconButton || !nativeButton) return;

    const title = getNotificationTitle(renderer);

    nativeIconButton.style.display = 'none';

    const wrap = document.createElement('div');
    wrap.className = WRAP_CLASS;
    wrap.appendChild(makeButton(videoId, title, nativeButton));
    menuHost.appendChild(wrap);

    renderer.setAttribute(ENHANCED_ATTR, '1');
    log('button inserted for', videoId, title);
  }

  function scan() {
    document.querySelectorAll('ytd-notification-renderer').forEach(enhanceRenderer);
  }

  function init() {
    addStyles();
    ensureHud();
    updateHud();
    scan();

    const mo = new MutationObserver(scan);
    mo.observe(document.documentElement, { childList: true, subtree: true });

    document.addEventListener('yt-page-data-updated', scan, true);
    document.addEventListener('yt-navigate-finish', scan, true);
    window.addEventListener('load', scan);
    setInterval(scan, 2000);
  }

  init();
})();
