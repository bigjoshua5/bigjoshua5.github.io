(function () {
  'use strict';

  const DF_SELECTOR = 'df-messenger';
  const IFRAME_ID = 'intermedia-queue-iframe';
  const WRAPPER_ID = 'intermedia-queue-wrapper';

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

  function injectQueueIframe(queueUrl) {
    const old = document.getElementById(WRAPPER_ID);
    if (old) old.remove();

    const wrapper = document.createElement('div');
    wrapper.id = WRAPPER_ID;
    wrapper.style.position = 'fixed';
    wrapper.style.right = '15px';
    wrapper.style.bottom = '0px';
    wrapper.style.width = '100%';
    wrapper.style.height = '100%';
    wrapper.style.zIndex = '2147483647';
    wrapper.style.display = 'block';
    wrapper.style.visibility = 'visible';
    wrapper.style.opacity = '1';
    wrapper.style.overflow = 'hidden';
    wrapper.style.background = '#ffffff';
    wrapper.style.borderRadius = '4px';
    wrapper.style.boxShadow = '0 0 0 1px rgba(0,0,0,.08), 0 8px 24px rgba(0,0,0,.18)';

    const iframe = document.createElement('iframe');
    iframe.id = IFRAME_ID;
    iframe.src = queueUrl;
    iframe.scrolling = 'no';
    iframe.frameBorder = '0';
    iframe.allowTransparency = 'true';
    iframe.style.position = 'absolute';
    iframe.style.top = '0';
    iframe.style.left = '0';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = '0';
    iframe.style.display = 'block';
    iframe.style.visibility = 'visible';
    iframe.style.background = '#ffffff';

    iframe.onload = function () {
      console.log('[Queue Handoff] Queue iframe loaded:', queueUrl);
      console.log('[Queue Handoff] Wrapper:', wrapper.getBoundingClientRect());
      console.log('[Queue Handoff] Iframe:', iframe.getBoundingClientRect());
    };

    iframe.onerror = function () {
      console.error('[Queue Handoff] Failed to load queue iframe:', queueUrl);
    };

    wrapper.appendChild(iframe);
    document.body.appendChild(wrapper);

    window.__queueWrapper = wrapper;
    window.__queueIframe = iframe;
  }

  function handleDfResponse(event) {
    try {
      const payloads = getFulfillmentPayloads(event);

      for (const payload of payloads) {
        if (payload?.xfrToQueue === true && payload?.queueUrl) {
          console.log('[Queue Handoff] Payload detected:', payload);
          hideDfMessenger();
          injectQueueIframe(payload.queueUrl);
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
