(function(){
  const TRIGGERS = [
    'Speak to a live Agent',
    'Speak to a live Agent - yes',
    'Speak to an agent',
    'live agent'
  ];
  const ICR_SRC = 'https://pop6-ccs-webchat-api.serverdata.net/script/icr?cid=elsinorewater&icr=918eabbf-966b-4af0-82c0-21cd2af857d3';

  function log(...args){
    console.debug('[handoff]', ...args);
  }

  function waitForDfMessenger(){
    return new Promise(resolve=>{
      const el = document.querySelector('df-messenger');
      if(el) return resolve(el);
      const t = setInterval(()=>{
        const e = document.querySelector('df-messenger');
        if(e){ clearInterval(t); resolve(e); }
      },250);
      // safety timeout after 30s
      setTimeout(()=>{
        clearInterval(t);
        resolve(document.querySelector('df-messenger'));
      },30000);
    });
  }

  function collectChatHistory(df){
    const root = df && df.shadowRoot ? df.shadowRoot : document;
    const messages = [];

    // Heuristic: collect text content from leaf nodes under the root, filter out page chrome
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    while(walker.nextNode()){
      const txt = walker.currentNode.nodeValue && walker.currentNode.nodeValue.trim();
      if(!txt) continue;
      // filter obvious non-chat text
      if(/Add this agent to your website|Copy Code|Meet Elsinore|Click the chat icon/i.test(txt)) continue;
      // keep short lines only
      if(txt.length > 500) continue;
      messages.push({text: txt});
    }

    // Keep last N messages to avoid huge payloads
    return messages.slice(-200);
  }

  function startICR(chatHistory, payload){
    if(window.__ICR_LOADED) return tryPostMessage(chatHistory, payload);

    const s = document.createElement('script');
    s.type = 'text/javascript';
    s.src = ICR_SRC;
    s.onload = () => {
      window.__ICR_LOADED = true;
      setTimeout(()=> tryPostMessage(chatHistory, payload), 800);
    };
    document.head.appendChild(s);
  }

  function tryPostMessage(chatHistory, payload){
    // look for an iframe created by the ICR script
    const iframe = document.querySelector('iframe[src*="serverdata.net"]');
    if(iframe && iframe.contentWindow){
      iframe.contentWindow.postMessage({type:'initial_chat', history:chatHistory, metadata:payload}, '*');
      return true;
    }

    // if iframe not yet present, retry a few times
    let attempts = 0;
    const t = setInterval(()=>{
      attempts++;
      const f = document.querySelector('iframe[src*="serverdata.net"]');
      if(f && f.contentWindow){
        clearInterval(t);
        f.contentWindow.postMessage({type:'initial_chat', history:chatHistory, metadata:payload}, '*');
      } else if(attempts>10){
        clearInterval(t);
      }
    },500);
    return false;
  }

  function handleHandoff(df, payload){
    log('handoff detected', payload);
    const history = collectChatHistory(df);
    startICR(history, payload);
  }

  function containsTrigger(text){
    if(!text) return false;
    const lower = text.toLowerCase();
    return TRIGGERS.some(t => lower.indexOf(t.toLowerCase()) !== -1);
  }

  function observeDfMessenger(df){
    const root = df && df.shadowRoot ? df.shadowRoot : document;

    const obs = new MutationObserver(mutations => {
      for(const m of mutations){
        for(const node of m.addedNodes){
          if(node.nodeType !== 1) continue;
          const text = node.textContent && node.textContent.trim();
          if(containsTrigger(text)){
            obs.disconnect();
            handleHandoff(df);
            return;
          }

          // detect serialized JSON custom payloads rendered into the messenger
          try{
            const json = JSON.parse(text);
            if(json && json.live_agent_handoff){
              obs.disconnect();
              handleHandoff(df, json.live_agent_handoff);
              return;
            }
          }catch(e){}
        }
      }
    });

    obs.observe(root, { childList: true, subtree: true });

    // quick initial scan in case trigger already present
    if(containsTrigger(root.textContent || '')){
      obs.disconnect();
      handleHandoff(df);
    }
  }

  function init(){
    waitForDfMessenger().then(df => {
      if(!df){
        console.warn('[handoff] df-messenger not found on page');
        return;
      }
      observeDfMessenger(df);
    }).catch(err => console.error(err));
  }

  if(document.readyState === 'complete' || document.readyState === 'interactive') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
