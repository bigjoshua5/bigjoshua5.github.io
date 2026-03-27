(function () {
  'use strict';

  const DF_SELECTOR = 'df-messenger';
  const SCRIPT_ID = 'intermedia-queue-script';

  function getFulfillmentPayloads(event) {
    const response =
      event?.detail?.response ||
      event?.response ||
      event?.detail;

    const messages = response?.queryResult?.fulfillmentMessages || [];
    return messages.filter(m => m && m.payload).map(m => m.payload);
  }

  function hideDfMessenger() {
    const df = document.querySelector(DF_SELECTOR);
    if (!df) return;
    df.style.display = 'none';
  }

  function initializeIntermediaQueue() {
    if (!window._tlx) {
      console.error('[Queue Handoff] _tlx not found after script load.');
      return;
    }

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

      console.log('[Queue Handoff] Intermedia queue initialized manually.');
    } catch (err) {
      console.error('[Queue Handoff] Failed to initialize Intermedia queue:', err);
    }
  }

  function injectQueueScript(queueUrl) {
    const old = document.getElementById(SCRIPT_ID);
    if (old) old.remove();

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.type = 'text/javascript';
    script.src = queueUrl;
    script.async = true;

    script.onload = function () {
      console.log('[Queue Handoff] Queue script loaded:', queueUrl);
      initializeIntermediaQueue();
    };

    script.onerror = function () {
      console.error('[Queue Handoff] Failed to load queue script:', queueUrl);
    };

    document.body.appendChild(script);
  }

  function handleDfResponse(event) {
    try {
      const payloads = getFulfillmentPayloads(event);

      for (const payload of payloads) {
        if (payload?.xfrToQueue === true && payload?.queueUrl) {
          console.log('[Queue Handoff] Payload detected:', payload);
          hideDfMessenger();
          injectQueueScript(payload.queueUrl);
          return;
        }
      }
    } catch (err) {
      console.error('[Queue Handoff] Error handling df response:', err);
    }
  }

  function attachListener() {
    const df = document.querySelector(DF_SELECTOR);
    if (!df) {
      console.warn('[Queue Handoff] df-messenger not found.');
      return;
    }

    df.addEventListener('df-response-received', handleDfResponse);
    console.log('[Queue Handoff] Listener attached.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachListener);
  } else {
    attachListener();
  }
})();
