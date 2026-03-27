(function () {
  'use strict';

  const CONFIG = {
    dfSelector: 'df-messenger',
    queueScriptId: 'intermedia-queue-script',
    queueContainerId: 'tlx-webchat-container',
    backButtonId: 'back-to-eddie-button',

    dfDefaults: {
      chatIcon: 'https://pbs.twimg.com/profile_images/1706817590906306560/xpM_m5NG.jpg',
      intent: 'WELCOME',
      chatTitle: 'Elsinore-Eddie',
      agentId: 'a78885bb-e6ee-492e-9433-5344dca3be40',
      languageCode: 'en'
    },

    debug: true
  };

  function log() {
    if (CONFIG.debug) {
      console.log('[Queue Handoff]', ...arguments);
    }
  }

  function warn() {
    console.warn('[Queue Handoff]', ...arguments);
  }

  function error() {
    console.error('[Queue Handoff]', ...arguments);
  }

  function getFulfillmentPayloads(event) {
    const response =
      event?.detail?.response ||
      event?.response ||
      event?.detail;

    const messages = response?.queryResult?.fulfillmentMessages || [];
    return messages.filter(m => m && m.payload).map(m => m.payload);
  }

  function getDfMessenger() {
    return document.querySelector(CONFIG.dfSelector);
  }

  function hideDfMessenger() {
    const df = getDfMessenger();
    if (!df) return;
    df.style.display = 'none';
    log('df-messenger hidden.');
  }

  function showDfMessenger() {
    let df = getDfMessenger();

    if (!df) {
      df = document.createElement('df-messenger');
      df.setAttribute('chat-icon', CONFIG.dfDefaults.chatIcon);
      df.setAttribute('intent', CONFIG.dfDefaults.intent);
      df.setAttribute('chat-title', CONFIG.dfDefaults.chatTitle);
      df.setAttribute('agent-id', CONFIG.dfDefaults.agentId);
      df.setAttribute('language-code', CONFIG.dfDefaults.languageCode);
      df.setAttribute('wait-open', '');
      document.body.appendChild(df);
      attachListenerToDfMessenger(df);
      log('df-messenger recreated.');
    } else {
      df.style.display = '';
      log('df-messenger shown.');
    }
  }

  function removeQueueUi() {
    const queueContainer = document.getElementById(CONFIG.queueContainerId);
    if (queueContainer) {
      queueContainer.remove();
      log('Intermedia queue container removed.');
    }

    const queueScript = document.getElementById(CONFIG.queueScriptId);
    if (queueScript) {
      queueScript.remove();
      log('Intermedia queue script removed.');
    }

    if (window._tlx) {
      try {
        delete window._tlx;
      } catch (e) {
        window._tlx = undefined;
      }
    }
  }

  function removeBackButton() {
    const btn = document.getElementById(CONFIG.backButtonId);
    if (btn) {
      btn.remove();
      log('Back to Eddie button removed.');
    }
  }

  function reopenDfMessenger() {
    removeQueueUi();
    removeBackButton();
    showDfMessenger();
  }

  function createBackButton() {
    removeBackButton();

    const btn = document.createElement('button');
    btn.id = CONFIG.backButtonId;
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Back to Eddie');
    btn.innerHTML = `
      <span style="display:inline-flex;align-items:center;gap:8px;">
        <span style="font-size:16px;line-height:1;">←</span>
        <span>Back to Eddie</span>
      </span>
    `;

    Object.assign(btn.style, {
      position: 'fixed',
      right: '20px',
      bottom: '675px',
      zIndex: '2147483647',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '10px 14px',
      border: '0',
      borderRadius: '999px',
      background: 'linear-gradient(135deg, #0f6cbd 0%, #115ea3 100%)',
      color: '#ffffff',
      fontSize: '14px',
      fontWeight: '600',
      fontFamily: 'Arial, sans-serif',
      lineHeight: '1',
      cursor: 'pointer',
      boxShadow: '0 6px 18px rgba(0,0,0,0.22)',
      transition: 'transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease',
      opacity: '0.96'
    });

    btn.addEventListener('mouseenter', function () {
      btn.style.transform = 'translateY(-1px)';
      btn.style.boxShadow = '0 10px 22px rgba(0,0,0,0.28)';
      btn.style.opacity = '1';
    });

    btn.addEventListener('mouseleave', function () {
      btn.style.transform = 'translateY(0)';
      btn.style.boxShadow = '0 6px 18px rgba(0,0,0,0.22)';
      btn.style.opacity = '0.96';
    });

    btn.addEventListener('click', reopenDfMessenger);

    document.body.appendChild(btn);
    log('Back to Eddie button created.');
  }

  function initializeIntermediaQueue() {
    if (!window._tlx) {
      error('_tlx not found after script load.');
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

      log('Intermedia queue initialized manually.');
    } catch (err) {
      error('Failed to initialize Intermedia queue:', err);
    }
  }

  function injectQueueScript(queueUrl) {
    const old = document.getElementById(CONFIG.queueScriptId);
    if (old) {
      old.remove();
    }

    const script = document.createElement('script');
    script.id = CONFIG.queueScriptId;
    script.type = 'text/javascript';
    script.src = queueUrl;
    script.async = true;

    script.onload = function () {
      log('Queue script loaded:', queueUrl);
      initializeIntermediaQueue();
      createBackButton();
    };

    script.onerror = function () {
      error('Failed to load queue script:', queueUrl);
    };

    document.body.appendChild(script);
  }

  function handleDfResponse(event) {
    try {
      const payloads = getFulfillmentPayloads(event);

      for (const payload of payloads) {
        if (payload?.xfrToQueue === true && payload?.queueUrl) {
          log('Payload detected:', payload);
          hideDfMessenger();
          injectQueueScript(payload.queueUrl);
          return;
        }
      }
    } catch (err) {
      error('Error handling df response:', err);
    }
  }

  function attachListenerToDfMessenger(df) {
    if (!df) {
      warn('df-messenger not found.');
      return;
    }

    df.removeEventListener('df-response-received', handleDfResponse);
    df.addEventListener('df-response-received', handleDfResponse);
    log('Listener attached.');
  }

  function attachListener() {
    const df = getDfMessenger();
    attachListenerToDfMessenger(df);
  }

  window.EddieQueueBridge = {
    reopenDfMessenger,
    hideDfMessenger,
    showDfMessenger,
    removeQueueUi,
    createBackButton,
    removeBackButton
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachListener);
  } else {
    attachListener();
  }
})();
