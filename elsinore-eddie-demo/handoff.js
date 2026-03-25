(function () {
  'use strict';

  const CONFIG = {
    dfMessengerSelector: 'df-messenger',
    intermedia: {
      scriptUrl: 'https://pop6-ccs-webchat-api.serverdata.net/script/icr?cid=elsinorewater&icr=918eabbf-966b-4af0-82c0-21cd2af857d3',
      sendChatBotRequestUrl: 'https://pop6-ccs-webchat-api.serverdata.net/icr/SendChatBotRequest',
      getChatUserUrl: 'https://pop6-ccs-webchat-api.serverdata.net/chat/getchatuser',
      clientId: 'elsinorewater',
      botId: '2f7b7cce-0b2d-4c77-a647-82939e4e6a31',
      lang: 'en-US',
      defaultQueueId: 770644,
      defaultTriggerPhrase: '__queue_770644__'
    },
    timing: {
      tokenWaitMs: 10000,
      pollIntervalMs: 250
    },
    debug: true
  };

  const state = {
    icrScriptLoaded: false,
    icrScriptLoading: false,
    intermediaToken: null,
    handoffInProgress: false,
    originalFetch: window.fetch.bind(window)
  };

  function log(...args) {
    if (CONFIG.debug) console.log('[ICR HANDOFF]', ...args);
  }

  function warn(...args) {
    console.warn('[ICR HANDOFF]', ...args);
  }

  function err(...args) {
    console.error('[ICR HANDOFF]', ...args);
  }

  function installNetworkInterceptors() {
  // FETCH
  const originalFetch = window.fetch.bind(window);
  window.fetch = async function (...args) {
    const response = await originalFetch(...args);

    try {
      const req = args[0];
      const url =
        typeof req === 'string'
          ? req
          : req instanceof Request
            ? req.url
            : '';

      if (url.includes('pop6-ccs-webchat-api.serverdata.net')) {
        const token = response.headers.get('token');
        if (token) {
          state.intermediaToken = token;
          log('Captured Intermedia token from fetch response headers.');
        }
      }
    } catch (e) {
      warn('Fetch interceptor error:', e);
    }

    return response;
  };

  // XHR
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__icr_url = url;
    return originalOpen.call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.send = function (body) {
    this.addEventListener('readystatechange', function () {
      try {
        if (this.readyState !== 4) return;
        if (!this.__icr_url) return;
        if (!String(this.__icr_url).includes('pop6-ccs-webchat-api.serverdata.net')) return;

        const token = this.getResponseHeader('token');
        if (token) {
          state.intermediaToken = token;
          log('Captured Intermedia token from XHR response headers.');
        }
      } catch (e) {
        warn('XHR interceptor error:', e);
      }
    });

    return originalSend.call(this, body);
  };

  log('Fetch + XHR interceptors installed.');
}

  function installFetchInterceptor() {
    window.fetch = async function (...args) {
      const response = await state.originalFetch(...args);

      try {
        const req = args[0];
        const url =
          typeof req === 'string'
            ? req
            : req instanceof Request
              ? req.url
              : '';

        if (url.includes('pop6-ccs-webchat-api.serverdata.net')) {
          const token = response.headers.get('token');
          if (token) {
            state.intermediaToken = token;
            log('Captured updated Intermedia token from response headers.');
          }
        }
      } catch (e) {
        warn('Failed while intercepting fetch response headers:', e);
      }

      return response;
    };

    log('Fetch interceptor installed.');
  }

  function getDfMessenger() {
    return document.querySelector(CONFIG.dfMessengerSelector);
  }

  function removeDfMessengerCompletely() {
    const df = document.querySelector('df-messenger');
    if (!df) return false;
    df.remove();
    return true;
  }

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function waitForToken(timeoutMs) {
    const started = Date.now();

    while (Date.now() - started < timeoutMs) {
      if (state.intermediaToken) return state.intermediaToken;
      await wait(CONFIG.timing.pollIntervalMs);
    }

    throw new Error('Timed out waiting for Intermedia token.');
  }

  async function loadIntermediaScript() {
    if (state.icrScriptLoaded) {
      log('Intermedia script already loaded.');
      return;
    }

    if (state.icrScriptLoading) {
      log('Intermedia script is already loading. Waiting...');
      while (!state.icrScriptLoaded) {
        await wait(100);
      }
      return;
    }

    state.icrScriptLoading = true;

    await new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${CONFIG.intermedia.scriptUrl}"]`);
      if (existing) {
        state.icrScriptLoaded = true;
        state.icrScriptLoading = false;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = CONFIG.intermedia.scriptUrl;
      script.async = true;

      script.onload = () => {
        state.icrScriptLoaded = true;
        state.icrScriptLoading = false;
        log('Intermedia script loaded.');
        resolve();
      };

      script.onerror = () => {
        state.icrScriptLoading = false;
        reject(new Error('Failed to load Intermedia script.'));
      };

      document.head.appendChild(script);
      log('Loading Intermedia script...');
    });
  }

  async function loadIntermediaChat() {
    await loadIntermediaScript();

    if (window._tlx) {
      try {
        if (typeof window._tlx.setupParamsFromQueryString === 'function') {
          window._tlx.setupParamsFromQueryString();
        }
        if (typeof window._tlx.setupWindowListener === 'function') {
          window._tlx.setupWindowListener();
        }
        if (typeof window._tlx.setupChatWindow === 'function') {
          window._tlx.setupChatWindow();
        }
        log('Intermedia chat window created manually.');
      } catch (e) {
        throw new Error(`Failed to initialize Intermedia chat manually: ${e.message}`);
      }
    } else {
      throw new Error('_tlx was not created by the Intermedia script.');
    }
  }

  function openIntermediaWidget() {
    const container = document.getElementById('tlx-webchat-container');
    const iframe = document.getElementById('tlx-webchat-app');

    if (!container || !iframe) {
      throw new Error('Intermedia chat container or iframe was not created.');
    }

    container.style.visibility = 'visible';
    container.style.display = 'inherit';
    container.style.opacity = '1';
    container.style.width = '360px';
    container.style.height = '735px';
    container.style.bottom = '0px';
    container.style.right = '15px';

    // Some widgets honor postMessage commands from parent;
    // even if this one ignores it, the container sizing still helps.
    try {
      iframe.contentWindow?.postMessage({ type: 'openChat' }, '*');
    } catch (e) {
      console.warn('Unable to postMessage to Intermedia iframe:', e);
    }
  }

  async function postJsonWithBearer(url, token, body, extraHeaders = {}) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...extraHeaders
      },
      body: JSON.stringify(body)
    });

    const nextToken = response.headers.get('token') || token;
    let json = null;

    try {
      json = await response.json();
    } catch (e) {
      throw new Error(`Expected JSON response from ${url}, but parsing failed.`);
    }

    if (!response.ok) {
      const message = json && typeof json === 'object'
        ? JSON.stringify(json)
        : `HTTP ${response.status}`;
      throw new Error(`Request failed for ${url}: ${message}`);
    }

    state.intermediaToken = nextToken;
    return { json, token: nextToken, response };
  }

  async function sendHiddenTriggerPhrase(token, triggerPhrase) {
    log('Sending hidden Intermedia trigger phrase:', triggerPhrase);

    return await postJsonWithBearer(
      CONFIG.intermedia.sendChatBotRequestUrl,
      token,
      {
        type: 'detectIntent',
        data: triggerPhrase,
        botId: CONFIG.intermedia.botId,
        lang: CONFIG.intermedia.lang
      },
      {
        'handleErrors': 'skip'
      }
    );
  }

  async function callGetChatUser(token, queueId) {
    log('Calling getchatuser for queue:', queueId);

    return await postJsonWithBearer(
      CONFIG.intermedia.getChatUserUrl,
      token,
      {
        clientId: CONFIG.intermedia.clientId,
        queueId: queueId,
        userName: null,
        lang: CONFIG.intermedia.lang
      }
    );
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

  function findHandoffPayload(payloads) {
    for (const payload of payloads) {
      if (payload?.handoffToICR === true) return payload;
    }
    return null;
  }

  async function executeIntermediaHandoff(handoffPayload) {
    if (state.handoffInProgress) {
      warn('Handoff already in progress. Ignoring duplicate trigger.');
      return;
    }

    state.handoffInProgress = true;

    try {
      const triggerPhrase =
        handoffPayload?.icr?.triggerPhrase ||
        CONFIG.intermedia.defaultTriggerPhrase;

      const fallbackQueueId =
        Number(handoffPayload?.icr?.queueId) ||
        CONFIG.intermedia.defaultQueueId;

      log('Starting Intermedia handoff...', { triggerPhrase, fallbackQueueId });

      removeDfMessengerCompletely();

      await loadIntermediaChat();
      openIntermediaWidget();

      console.log(
        'ICR elements:',
        document.getElementById('tlx-webchat-container'),
        document.getElementById('tlx-webchat-app')
      );
        
      await wait(1500); // give iframe/app a moment to initialize after opening
      
      const initialToken = await waitForToken(CONFIG.timing.tokenWaitMs);
      log('Intermedia token available.');

      const triggerResult = await sendHiddenTriggerPhrase(initialToken, triggerPhrase);
      log('SendChatBotRequest result:', triggerResult.json);

      const redirectQueueId =
        Number(triggerResult?.json?.queueIdRedirect) || fallbackQueueId;

      if (!redirectQueueId) {
        throw new Error('No queueIdRedirect was returned and no fallback queueId is configured.');
      }

      const chatUserResult = await callGetChatUser(triggerResult.token, redirectQueueId);
      log('getchatuser result:', chatUserResult.json);

      window.dispatchEvent(new CustomEvent('icr-handoff-complete', {
        detail: {
          queueId: redirectQueueId,
          sendChatBotRequest: triggerResult.json,
          getChatUser: chatUserResult.json
        }
      }));

      log('Intermedia handoff complete.');
    } catch (e) {
      err('Intermedia handoff failed:', e);

      window.dispatchEvent(new CustomEvent('icr-handoff-error', {
        detail: {
          message: e.message || String(e)
        }
      }));
    } finally {
      state.handoffInProgress = false;
    }
  }

  function attachDfMessengerListener() {
    const df = getDfMessenger();
    if (!df) {
      warn('df-messenger element not found.');
      return;
    }

    df.addEventListener('df-response-received', async function (event) {
      try {
        const payloads = extractPayloadsFromDfResponse(event);
        if (!payloads.length) return;

        const handoffPayload = findHandoffPayload(payloads);
        if (!handoffPayload) return;

        log('Detected df-messenger handoff payload:', handoffPayload);
        await executeIntermediaHandoff(handoffPayload);
      } catch (e) {
        err('Failed while handling df-response-received:', e);
      }
    });

    log('Attached df-response-received listener.');
  }

  function init() {
    // installFetchInterceptor();
    installNetworkInterceptors();

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', attachDfMessengerListener);
    } else {
      attachDfMessengerListener();
    }

    log('ICR handoff bridge initialized.');
  }

  init();
})();
