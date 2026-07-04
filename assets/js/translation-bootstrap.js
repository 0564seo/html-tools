(function () {
  'use strict';

  var STORAGE_KEY = 'webutils_language';
  var DEFAULT_LANG = 'en';
  var SOURCE_LANG = 'chinese_simplified';
  var EXECUTE_DELAYS = [0, 500, 2000];
  var SUPPORTED_LANGS = [
    { code: 'en', label: 'English', engine: 'english' },
    { code: 'fr', label: 'Francais', engine: 'french' },
    { code: 'ru', label: 'Russkiy', engine: 'russian' },
    { code: 'es', label: 'Espanol', engine: 'spanish' },
    { code: 'pt', label: 'Portugues', engine: 'portuguese' }
  ];

  function safeGetStorage(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function safeSetStorage(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      // Ignore storage failures.
    }
  }

  function isSupported(code) {
    return SUPPORTED_LANGS.some(function (lang) {
      return lang.code === code;
    });
  }

  function findLanguage(code) {
    return SUPPORTED_LANGS.find(function (lang) {
      return lang.code === code;
    }) || SUPPORTED_LANGS[0];
  }

  function getPreferredLanguage() {
    var saved = safeGetStorage(STORAGE_KEY);
    if (isSupported(saved)) {
      return saved;
    }
    return DEFAULT_LANG;
  }

  function ensureStyles() {
    if (document.getElementById('webutils-translate-style')) {
      return;
    }

    var style = document.createElement('style');
    style.id = 'webutils-translate-style';
    style.textContent = [
      '.webutils-translate-host{display:inline-flex;align-items:center;gap:8px;}',
      '.webutils-translate-label{font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:rgba(148,163,184,.92);}',
      '.webutils-translate-select{appearance:none;-webkit-appearance:none;border:1px solid rgba(148,163,184,.28);background:rgba(15,23,42,.78);color:#f8fafc;border-radius:999px;padding:8px 34px 8px 14px;font-size:14px;line-height:1.2;font-weight:600;box-shadow:0 10px 30px rgba(2,6,23,.18);background-image:linear-gradient(45deg,transparent 50%,#cbd5e1 50%),linear-gradient(135deg,#cbd5e1 50%,transparent 50%);background-position:calc(100% - 18px) calc(50% - 3px),calc(100% - 13px) calc(50% - 3px);background-size:5px 5px,5px 5px;background-repeat:no-repeat;}',
      '.webutils-translate-select:focus{outline:none;border-color:#38bdf8;box-shadow:0 0 0 3px rgba(56,189,248,.2);}',
      '.webutils-translate-fallback{position:fixed;top:16px;right:16px;z-index:2147482999;}',
      '[data-theme="light"] .webutils-translate-select, html[data-theme="light"] .webutils-translate-select{background-color:rgba(255,255,255,.92);color:#0f172a;border-color:rgba(15,23,42,.12);box-shadow:0 10px 30px rgba(15,23,42,.08);background-image:linear-gradient(45deg,transparent 50%,#475569 50%),linear-gradient(135deg,#475569 50%,transparent 50%);}',
      '[data-theme="light"] .webutils-translate-label, html[data-theme="light"] .webutils-translate-label{color:#475569;}',
      '@media (max-width: 640px){.webutils-translate-label{display:none;}.webutils-translate-select{max-width:180px;font-size:13px;padding:7px 30px 7px 12px;}.webutils-translate-fallback{top:12px;right:12px;}}'
    ].join('');
    document.head.appendChild(style);
  }

  function getHosts() {
    var hosts = Array.prototype.slice.call(document.querySelectorAll('[data-translate-host]'));
    if (hosts.length > 0) {
      return hosts;
    }

    var fallback = document.getElementById('webutils-translate-floating-host');
    if (!fallback) {
      fallback = document.createElement('div');
      fallback.id = 'webutils-translate-floating-host';
      fallback.className = 'webutils-translate-fallback ignore-translate notranslate';
      fallback.setAttribute('data-translate-host', 'floating');
      document.body.appendChild(fallback);
    }
    return [fallback];
  }

  function renderHosts(currentCode) {
    getHosts().forEach(function (host) {
      host.classList.add('webutils-translate-host', 'ignore-translate', 'notranslate');
      host.innerHTML = '';

      var label = document.createElement('span');
      label.className = 'webutils-translate-label ignore-translate notranslate';
      label.textContent = 'Language';

      var select = document.createElement('select');
      select.className = 'webutils-translate-select ignore-translate notranslate';
      select.setAttribute('aria-label', 'Language');

      SUPPORTED_LANGS.forEach(function (lang) {
        var option = document.createElement('option');
        option.value = lang.code;
        option.textContent = lang.label;
        if (lang.code === currentCode) {
          option.selected = true;
        }
        select.appendChild(option);
      });

      select.addEventListener('change', function (event) {
        var code = event.target.value;
        safeSetStorage(STORAGE_KEY, code);
        applyLanguage(code, false);
        syncSelectors(code);
      });

      host.appendChild(label);
      host.appendChild(select);
    });
  }

  function syncSelectors(currentCode) {
    document.querySelectorAll('.webutils-translate-select').forEach(function (select) {
      if (select.value !== currentCode) {
        select.value = currentCode;
      }
    });
  }

  function configureTranslate() {
    if (!window.translate) {
      return;
    }

    translate.ignore.class.push('ignore-translate');
    translate.language.setLocal(SOURCE_LANG);
    translate.service.use('client.edge');
    translate.waitingExecute.use = false;
    translate.visual.webPageLoadTranslateBeforeHiddenText();
    translate.listener.start();
    translate.request.listener.start();
    translate.whole.enableAll();
    translate.language.setUrlParamControl('lang');
  }

  function scheduleExecute() {
    EXECUTE_DELAYS.forEach(function (delay) {
      window.setTimeout(function () {
        translate.execute();
      }, delay);
    });
  }

  function applyLanguage(code, isInitial) {
    var lang = findLanguage(code);
    document.documentElement.lang = lang.code;

    if (!window.translate) {
      return;
    }

    if (isInitial) {
      translate.language.setDefaultTo(lang.engine);
      scheduleExecute();
      return;
    }

    translate.changeLanguage(lang.engine);
    window.setTimeout(function () {
      translate.execute();
    }, 50);
  }

  function init() {
    if (!window.translate) {
      return;
    }

    ensureStyles();
    var currentCode = getPreferredLanguage();
    renderHosts(currentCode);
    syncSelectors(currentCode);
    configureTranslate();
    applyLanguage(currentCode, true);

    window.WebUtilsTranslate = {
      refresh: function () {
        if (window.translate) {
          translate.execute();
        }
      },
      setLanguage: function (code) {
        if (!isSupported(code)) {
          return false;
        }
        safeSetStorage(STORAGE_KEY, code);
        applyLanguage(code, false);
        syncSelectors(code);
        return true;
      },
      getLanguage: function () {
        return getPreferredLanguage();
      }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();