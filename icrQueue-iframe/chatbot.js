(function () {
    this._tlx = {
        scriptVersion: '2.1.0.0',
        mainContainer: 'tlx-webchat-container',
        chatContainer: 'tlx-webchat-app',
        chatApp: 'https://pop6-ccs-webchat-api.serverdata.net/manage',
        acctId: 'elsinorewater',
        queueId: '770644',
        triggerTimeout: '1000',
        paramLANG: '',
        paramFN: '',
        paramLN: '',
        paramEA: '',
        paramPN: '',
        paramPOPID: '',
        paramITAG: '',
        paramIQRY: '',
        mobileMode: false,
        minimized: undefined,

        getChatContainer: function () {
            return document.getElementById(this.chatContainer);
        },

        getContentWindow() {
            return _tlx.getChatContainer().contentWindow;
        },

        appendElement: function (p, c) {
            return p.appendChild(c);
        },

        setAttribute: function (e, a, v) {
            e.setAttribute(a, v);
        },

        setAttributes: function (e, a) {
            for (var p in a) {
                e.setAttribute(p, a[p]);
            }
        },

        setStyles: function (e, v) {
            for (var p in v) {
                e.style[p] = v[p];
            }
        },

        messageDispatch: function (e) {
            try {
                var message = e[e.message ? 'message' : 'data'];

                if (message.messageId === "resizeTo") {
                    _tlx.resizeChatWindowTo(message.data);
                    return;
                }
                if (message.messageId === "getMobileMode") {                    
                    _tlx.getContentWindow().postMessage({
                        messageId: "setMobileMode",
                        mode: _tlx.mobileMode
                    }, '*');
                    return;
                }
                if (message.messageId === "redirectToUrl") {
                    window.location.href = message.data;
                }
            }
            catch (e) {
                console.error('Error dispatching message. ' + e);
            }
        },

        getMobileMode: function() {
            return  (
                /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Windows Phone/i.test(
                    navigator.userAgent
                ) &&
                (window.screen.width < 600 || window.screen.height < 600)
            );
        },

        canRenderChat: function () {
            this.getContentWindow().postMessage({
                messageId: 'readyToRenderComponent'
            }, "*");
        },

        resizeChatWindowTo: function (data) {
            _tlx.minimized = data.minimized;
            var appContainer = document.getElementById(_tlx.mainContainer);
            if (appContainer) {
                if (!_tlx.mobileMode) {
                    appContainer.style.height = data.styleHeight;
                    appContainer.style.width = data.styleWidth;
                    appContainer.style.position = data.position;
                    appContainer.style.bottom = data.bottom;
                    appContainer.style.right = data.right;
                } else {
                    if (data.minimized) {
                        appContainer.style.height = data.styleHeight;   
                    } else {
                        appContainer.style.height = window.innerHeight + 'px';
                    }
                    appContainer.style.width = data.styleWidth;
                }
                this.canRenderChat();
            }
        },

        setupParamsFromQueryString: function () {
            var that = this;
            function setQueryParam(value, name, url) {
                if (!value) {
                    paramVal = that.getUrlParam(name, url);
                    return paramVal !== null ? paramVal : '';
                }
                return value;
            }

            var url = window.location.href;

            this.paramFN = setQueryParam(this.paramFN, 'fn', url);
            this.paramLN = setQueryParam(this.paramLN, 'ln', url);
            this.paramEA = setQueryParam(this.paramEA,'ea', url);
            this.paramPN = setQueryParam(this.paramPN,'pn', url);
            this.paramLANG = setQueryParam(this.paramLANG,'lang', url);
            this.paramITAG = setQueryParam(this.paramITAG,'itag', url);
            this.paramIQRY = setQueryParam(this.paramIQRY,'iqry', url);
        },

        getViewPortInitialScale: function() {
            return "0.75";
        },

        createMetaElement: function () {
            const head = document.getElementsByTagName('head');
            // Ensure the head element exists
            if (head.length === 0) return;

            const requiredContent = 'width=device-width, initial-scale=' + this.getViewPortInitialScale();
            const meta = document.querySelector('meta[name="viewport"]');

            // Check if the current viewport is compatible
            if (meta !== null) {
                const current = meta.getAttribute('content') || '';
                const isCompatible =
                    current.includes('width=device-width') &&
                    current.includes('initial-scale=' + this.getViewPortInitialScale());

                if (!isCompatible) {
                    console.warn(
                        'Viewport meta tag was incompatible.'
                    );
                }
                return;
            }

            // Create and append the meta tag if it doesn't exist
            const newViewport = document.createElement('meta');
            newViewport.name = 'viewport';
            newViewport.content = requiredContent;
            document.head.appendChild(newViewport);
        },

        setupChatWindow: function () {
            var mobileMode = _tlx.getMobileMode();

            var d = document.getElementById(this.mainContainer);
            var isMainContainerNew = false;
            if (d === null) {
                d = document.createElement('div');
                isMainContainerNew = true;
            }

            this.setAttribute(d, 'id', this.mainContainer);

            if (mobileMode) {
                this.createMetaElement();    
                document.body.style.margin = "0px";

                this.setStyles(d, {
                    overflow: 'hidden',
                    visibility: 'visible',
                    display: 'inherit',
                    zIndex: '2147483639',
                    background: 'none',
                    transition: 'transform 0.2s ease-in-out',
                    opacity: '1',
                    position: 'fixed',
                    width: '100%',
                    height: '100%',
                    bottom: '0'
                });    
            } else {
                this.setStyles(d, {
                    position: 'fixed',
                    bottom: '0px',
                    right: '15px',
                    overflow: 'hidden',
                    visibility: 'visible',
                    display: 'inherit',
                    zIndex: '2147483639',
                    background: 'none',
                    width: '100%',
                    height: '100%',
                    transition: 'transform 0.2s ease-in-out',
                    opacity: '1'
                });    
            }

            var f = document.getElementById(this.chatContainer);
            var isChatContainerNew = false;
            if (f === null) {
                f = document.createElement('iframe');
                isChatContainerNew = true;
            }

            this.setAttributes(f, {
                id: this.chatContainer,
                src: this.getChatUrl(),
                scrolling: 'no',
                frameborder: '0',
                allowtransparency: 'true'
            });

            this.setStyles(f, {
                position: 'absolute',
                top: '0px',
                right: '0px',
                bottom: '0px',
                left: '0px',
                width: '100%',
                height: '100%',
                border: '0px',
                padding: '0px',
                margin: '0px',
                float: 'none',
                background: 'none',
                overflow: 'hidden'
            });

            if (isChatContainerNew) this.appendElement(d, f);
            if (isMainContainerNew) this.appendElement(document.body, d);

            if (mobileMode) {
                document.documentElement.style.setProperty("--vh", `${window.innerHeight * 0.01}px`);
                _tlx.resizeChatWindowTo({
                    styleHeight: "calc( var(--vh, 1vh) * 100)",
                    styleWidth: "100vw",
                    position: "fixed",
                    bottom: "0",
                    right: "0"
                });

                window.addEventListener("resize", resizeThrottler, false);

                var resizeTimeout;
                function resizeThrottler() {
                    if ( !resizeTimeout ) {
                    resizeTimeout = setTimeout(function() {
                        resizeTimeout = null;
                        actualResizeHandler();
                        }, 66);
                    }
                }

                function actualResizeHandler() {
                    if (!_tlx.minimized) {
                        var appContainer = document.getElementById(_tlx.mainContainer);
                        if (appContainer) {
                            appContainer.style.height = window.innerHeight + 'px';
                            appContainer.style.width = '100vw';
                        }
                    }
                }

                _tlx.mobileMode = true;
            }

            /* attribute meta needed to add body if mobile is true*/
        },


        setupWindowListener: function () {
            var evtN = window.addEventListener ? 'addEventListener' : 'attachEvent', evtF = window[evtN], evtM = evtN === 'attachEvent' ? 'onmessage' : 'message';
            evtF(evtM, this.messageDispatch, false);
        },

        getChatUrl: function () {
            return this.chatApp +
                '?cid=' + this.acctId +
                '&qid=' + this.queueId +
                '&fn=' + encodeURIComponent(this.paramFN) +
                '&ln=' + encodeURIComponent(this.paramLN) +
                '&ea=' + encodeURIComponent(this.paramEA) +
                '&pn=' + encodeURIComponent(this.paramPN) +
                '&iqry=' + encodeURIComponent(this.paramIQRY) +
                '&itag=' + encodeURIComponent(this.paramITAG) +
                '&lang=' + encodeURIComponent(this.paramLANG);
        },

        getUrlParam: function (paramName, url) {
            paramName = paramName.replace('/[\[\]]/g', '\\$&');
            var regex = new RegExp('[?&]' + paramName + '(=([^&#]*)|&|#|$)');
            results = regex.exec(url);
            if (!results) return null;
            if (!results[2]) return '';
            return decodeURIComponent(results[2].replace(/\+/g, ' '));
        }, 
        

        init: function () {
            var self = this;
            window.addEventListener("load", function() {
                self.setupParamsFromQueryString();
                self.setupWindowListener();
                if (_tlx.triggerTimeout <= 0) _tlx.triggerTimeout = 1;
                setTimeout(function () { self.setupChatWindow(); }, _tlx.triggerTimeout);
            });
            _tlx.proxyStorage = new proxyStorage(this);
        }       
    };

    var context;

    function storageMessageDispatch(e) {
        context.messageDispatch.call(context, e);
    }

    function proxyStorage(owner) {
        this.owner = owner;
        context = this;

        var evtN = window.addEventListener ? 'addEventListener' : 'attachEvent', evtF = window[evtN], evtM = evtN === 'attachEvent' ? 'onmessage' : 'message';
        evtF(evtM, storageMessageDispatch, false);
    }

    proxyStorage.prototype.messageDispatch = function (e) {
        try {
            var message = e[e.message ? 'message' : 'data'];

            if (message.message === 'QuerySetItem') {
                localStorage.setItem(message.payload.key, message.payload.value);
                this.owner.getContentWindow().postMessage({
                    message: "QuerySetItem",
                    payload: {
                        key: message.payload.key,
                        value: message.payload.value
                    }
                },
                    '*');
            }

            if (message.message === 'QueryGetItem') {
                var value = localStorage.getItem(message.payload.key);
                this.owner.getContentWindow().postMessage({
                        message: "QuerySetItem",
                        payload: {
                            key: message.payload.key,
                            value
                        }
                    },
                    '*');
            }

            if (message.message === 'QueryGetLength') {
                this.owner.getContentWindow().postMessage({
                        message: "QuerySetItem",
                        payload: {
                            key: message.payload.key,
                            value: localStorage.length
                        }
                    },
                    '*');
            }

            if (message.message === 'QueryGetKeyByIndex') {
                this.owner.getContentWindow().postMessage({
                        message: "QuerySetItem",
                        payload: {
                            key: message.payload.key,
                            value: localStorage.key(message.payload.index)
                        }
                    },
                    '*');
            }

            if (message.message === 'QueryRemoveItem') {
                localStorage.removeItem(message.payload.key);
            }

            if (message.message === 'QueryGetStorageEnabled') {
                this.owner.getContentWindow().postMessage({
                        message: "QuerySetStorageEnabled",
                        payload: {
                            key: message.payload.key,
                            value: this.available('localStorage')
                        }
                    },
                    '*');
            }
        }
        catch (e) {
            console.error('Error dispatching message. ' + e);
        }
    }

    proxyStorage.prototype.available = function (type) {
        try {
            var storage = window[type];
            var x = '__storage_test__';
            storage.setItem(x, x);
            storage.removeItem(x);
            return true;
        }
        catch (e) {
            return false;
        }
    }

    _tlx.init();
})();
