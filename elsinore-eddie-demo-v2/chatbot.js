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
    return messages
      .filter(msg => msg && msg.payload)
      .map(msg => msg.payload);
  }

  function hideDfMessenger() {
    const df = document.querySelector(DF_SELECTOR);
    if (!df) return false;

    df.style.display = 'none';
    return true;
  }

  function injectQueueScript(queueUrl) {
    if (!queueUrl) return false;

    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      console.log('[Queue Handoff] Queue script already loaded.');
      return true;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = queueUrl;
    script.async = true;

    script.onload = function () {
      console.log('[Queue Handoff] Queue script loaded:', queueUrl);
    };

    script.onerror = function () {
      console.error('[Queue Handoff] Failed to load queue script:', queueUrl);
    };

    document.head.appendChild(script);
    return true;
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
