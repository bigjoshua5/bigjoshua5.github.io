(function () {
  'use strict';

  const CONFIG = {
    rootId: 'chat-root',

    df: {
      chatIcon: 'https://pbs.twimg.com/profile_images/1706817590906306560/xpM_m5NG.jpg',
      intent: 'WELCOME',
      chatTitle: 'Elsinore-Eddie',
      agentId: 'a78885bb-e6ee-492e-9433-5344dca3be40',
      languageCode: 'en',
      waitOpen: true
    },

    icr: {
      scriptUrl: 'https://pop6-ccs-webchat-api.serverdata.net/script/icr?cid=elsinorewater&icr=918eabbf-966b-4af0-82c0-21cd2af857d3'
    },

    debug: true
  };

  const state = {
    currentMode: null,
    icrScriptLoaded: false,
    icrScriptLoading: false
  };

  function log(...args) {
    if (CONFIG.debug) console.log('[CHAT-SWAP]', ...args);
  }

  function warn(...args) {
    console.warn('[CHAT-SWAP]', ...args);
  }

  function getRoot() {
    return document.getElementById(CONFIG.rootId);
  }

  function getQueryMode() {
    const params = new URLSearchParams(window.location.search);
    return params.get('chat') || 'df';
  }

  function setQueryMode(mode) {
    const url = new URL(window.location.href);
    url.searchParams.set('chat', mode);
    window.history.replaceState({}, '', url.toString());
  }

  function clearRoot() {
    const root = getRoot();
    if (!root) throw new Error(`Missing #${CONFIG.rootId}`);
    root.innerHTML = '';
  }

  function createDfMessenger() {
    const df = document.createElement('df-messenger');
    df.setAttribute('chat-icon', CONFIG.df.chatIcon);
    df.setAttribute('intent', CONFIG.df.intent);
    df.setAttribute('chat-title', CONFIG.df.chatTitle);
    df.setAttribute('agent-id', CONFIG.df.agentId);
    df.setAttribute('language-code', CONFIG.df.languageCode);
    if (CONFIG.df.waitOpen) {
      df.setAttribute('wait-open', '');
    }
    return df;
  }

  function extractPayloadsFromDfResponse(event) {
    const response =
      event?.detail?.response ||
      event?.response ||
      event?.detail;

    const messages = response?.queryResult?.fulfillmentMessages || [];
    const payloads = [];

    for (const msg of messages) {
      if (msg && msg.payload) payloads.push(msg.payload);
    }

    return payloads;
  }

  function findSwapPayload(payloads) {
    for (const payload of payloads) {
      if (payload?.swapToICR === true) return payload;
    }
    return null;
  }

  function attachDfListener(df) {
    df.addEventListener('df-response-received', async function (event) {
      try {
        const payloads = extractPayloadsFromDfResponse(event);
        const swapPayload = findSwapPayload(payloads);
        if (!swapPayload) return;

        log('Detected swapToICR payload:', swapPayload);

        setQueryMode('icr');
        await swapToICR();
      } catch (e) {
        console.error('[CHAT-SWAP] Failed while handling df response:', e);
      }
    });
  }

  function mountDf() {
    clearRoot();

    const root = getRoot();
    const df = createDfMessenger();
    root.appendChild(df);
    attachDfListener(df);

    state.currentMode = 'df';
    log('Mounted df-messenger.');
  }

  async function loadIcrScript() {
    if (state.icrScriptLoaded) return;

    if (state.icrScriptLoading) {
      while (!state.icrScriptLoaded) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    state.icrScriptLoading = true;

    await new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${CONFIG.icr.scriptUrl}"]`);
      if (existing) {
        state.icrScriptLoaded = true;
        state.icrScriptLoading = false;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = CONFIG.icr.scriptUrl;
      script.async = true;

      script.onload = () => {
        state.icrScriptLoaded = true;
        state.icrScriptLoading = false;
        log('ICR script loaded.');
        resolve();
      };

      script.onerror = () => {
        state.icrScriptLoading = false;
        reject(new Error('Failed to load ICR script.'));
      };

      document.head.appendChild(script);
      log('Loading ICR script...');
    });
  }

  async function mountIcr() {
    clearRoot();

    await loadIcrScript();

    if (!window._tlx) {
      throw new Error('_tlx is not available after ICR script load.');
    }

    // If loading dynamically after page load, initialize manually.
    if (typeof window._tlx.setupParamsFromQueryString === 'function') {
      window._tlx.setupParamsFromQueryString();
    }
    if (typeof window._tlx.setupWindowListener === 'function') {
      window._tlx.setupWindowListener();
    }
    if (typeof window._tlx.setupChatWindow === 'function') {
      window._tlx.setupChatWindow();
    }

    // Move the created ICR container into our root if needed.
    const icrContainer = document.getElementById('tlx-webchat-container');
    if (icrContainer) {
      const root = getRoot();
      root.appendChild(icrContainer);

      icrContainer.style.position = 'relative';
      icrContainer.style.right = '0';
      icrContainer.style.bottom = '0';
      icrContainer.style.width = '360px';
      icrContainer.style.height = '735px';
      icrContainer.style.display = 'inherit';
      icrContainer.style.visibility = 'visible';
      icrContainer.style.opacity = '1';
    }

    state.currentMode = 'icr';
    log('Mounted Intermedia ICR.');
  }

  async function swapToICR() {
    destroyDf();
    await mountIcr();
  }

  function destroyDf() {
    const df = document.querySelector('df-messenger');
    if (df) df.remove();
    log('Destroyed df-messenger.');
  }

  function destroyIcr() {
    const container = document.getElementById('tlx-webchat-container');
    if (container) container.remove();
    state.currentMode = null;
    log('Destroyed ICR widget.');
  }

  function returnToDf() {
    destroyIcr();
    setQueryMode('df');
    mountDf();
  }

  // Expose this so you can manually test from console:
  window.returnToDf = returnToDf;
  window.swapToICR = swapToICR;

  async function init() {
    const mode = getQueryMode();

    if (mode === 'icr') {
      await mountIcr();
    } else {
      mountDf();
    }
  }

  window.addEventListener('DOMContentLoaded', function () {
    init().catch(err => {
      console.error('[CHAT-SWAP] Init failed:', err);
    });
  });
})();
