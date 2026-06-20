(function () {
  var STORAGE_LANG = 'lc_locale';

  function setLang(lang) {
    var isEs = lang === 'es';
    document.documentElement.lang = lang;

    var select = document.getElementById('lang-select');
    if (select) select.value = lang;
    if (select) {
      select.setAttribute('aria-labelledby', isEs ? 'lang-label-es' : 'lang-label-en');
    }

    document.title = isEs
      ? 'Política de privacidad — LocalChat'
      : 'Privacy Policy — LocalChat';

    var meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        'content',
        isEs
          ? 'Política de privacidad de la extensión LocalChat (chat local con IA integrada en Chrome).'
          : 'Privacy policy for the LocalChat browser extension (local on-device AI chat).',
      );
    }
  }

  function langFromQuery() {
    var params = new URLSearchParams(location.search);
    var q = params.get('lang');
    return q === 'es' || q === 'en' ? q : null;
  }

  function langFromNavigator() {
    return navigator.language && navigator.language.toLowerCase().indexOf('es') === 0 ? 'es' : 'en';
  }

  function persistLang(lang) {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ lc_locale: lang });
      }
    } catch (e) {
      /* ignore */
    }
  }

  function loadStoredLang() {
    return new Promise(function (resolve) {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get(STORAGE_LANG, function (stored) {
            var v = stored && stored[STORAGE_LANG];
            resolve(v === 'es' || v === 'en' ? v : null);
          });
          return;
        }
      } catch (e) {
        /* ignore */
      }
      resolve(null);
    });
  }

  function updateUrl(lang) {
    try {
      var url = new URL(location.href);
      url.searchParams.set('lang', lang);
      history.replaceState(null, '', url);
    } catch (err) {
      /* ignore */
    }
  }

  function init() {
    var select = document.getElementById('lang-select');
    if (select) {
      select.addEventListener('change', function (e) {
        var next = e.target.value === 'es' ? 'es' : 'en';
        setLang(next);
        persistLang(next);
        updateUrl(next);
      });
    }

    loadStoredLang().then(function (stored) {
      var lang = langFromQuery() || stored || langFromNavigator();
      setLang(lang);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
