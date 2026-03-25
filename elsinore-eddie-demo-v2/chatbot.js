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

  function injectQueueIframe(queueUrl) {
    if (!queueUrl) return false;

    const existing = document.getElementById(IFRAME_ID);
    if (existing) {
      console.log('[Queue Handoff] Queue iframe already loaded.');
      return true;
    }

    const wrapper = document.createElement('div');
    wrapper.id = WRAPPER_ID;
    wrapper.style.position = 'fixed';
    wrapper.style.bottom = '0px';
    wrapper.style.right = '15px';
    wrapper.style.width = '360px';
    wrapper.style.height = '735px';
    wrapper.style.overflow = 'hidden';
    wrapper.style.zIndex = '2147483647';
    wrapper.style.display = 'block';
    wrapper.style.visibility = 'visible';
    wrapper.style.opacity = '1';
    wrapper.style.background = 'transparent';
    wrapper.style.border = '0';
    wrapper.style.boxShadow = 'none';

    const iframe = document.createElement('iframe');
    iframe.id = IFRAME_ID;
    iframe.src = queueUrl;
    iframe.setAttribute('scrolling', 'no');
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allowtransparency', 'true');
    iframe.setAttribute('allow', 'clipboard-write; storage-access-api');
    iframe.style.position = 'absolute';
    iframe.style.inset = '0';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = '0';
    iframe.style.display = 'block';
    iframe.style.visibility = 'visible';
    iframe.style.background = 'transparent';

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

    return true;
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
