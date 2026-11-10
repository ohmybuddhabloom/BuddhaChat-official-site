// "Open in App" pill for phone browsers. The same script ships in the official site, Sutra, Music,
// and ZenTube; keep the copies identical. Its page rules mirror normalizePageLinkTarget in the App's
// src/services/smartLinks.ts: the link it builds must be one the App accepts.
(function () {
  if (window.ReactNativeWebView || window.top !== window.self) return;
  if (!/iphone|ipad|ipod|android/i.test(navigator.userAgent)) return;

  var host = location.hostname.toLowerCase();
  var linkHost = host === 'staging.buddhachat.online'
    ? 'staging-admin.buddhachat.online'
    : /^(www\.|zentube\.|sutra\.|yuanhui\.|music\.|search\.)?buddhachat\.online$/.test(host)
      ? 'go.buddhachat.online'
      : null;
  if (!linkHost) return;

  var DISMISSED = 'buddhachat_open_in_app_dismissed';
  try { if (sessionStorage.getItem(DISMISSED)) return; } catch { /* 隐私模式不能读会话存储，照常显示 */ }

  var BLOCKED_PATH = /^\/(?:(?:videos|sutra|music)\/)?(?:login|logout|signup|auth|admin|api|account|download|app-onboarding|onboarding|app)(?:\/|$)/i;
  var BLOCKED_QUERY = /[?&](?:access_token|refresh_token|id_token|token|code|state|session|redirect|redirect_to|redirect_uri|next|return_to)=/i;
  // The browser language, like the landing page: several sites declare a fixed <html lang>.
  var language = (navigator.language || '').toLowerCase();
  var label = /^zh-(tw|hk|mo|hant)/.test(language) ? '在 App 中開啟'
    : language.indexOf('zh') === 0 ? '在 App 中打开'
      : 'Open in App';
  var closeLabel = language.indexOf('zh') === 0 ? '关闭' : 'Close';

  var pill = document.createElement('div');
  pill.setAttribute('data-open-in-app', '');
  pill.style.cssText = 'position:fixed;left:50%;bottom:calc(148px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:2147483000;display:flex;align-items:center;border-radius:24px;background:#8A5A2B;box-shadow:0 4px 16px rgba(58,42,24,.28);font:600 15px/1 -apple-system,BlinkMacSystemFont,"PingFang SC","Noto Sans SC",sans-serif;white-space:nowrap';

  var link = document.createElement('a');
  link.textContent = label;
  link.style.cssText = 'display:block;padding:14px 4px 14px 20px;color:#FFF8ED;text-decoration:none';

  var close = document.createElement('button');
  close.type = 'button';
  close.textContent = '×';
  close.setAttribute('aria-label', closeLabel);
  close.style.cssText = 'width:44px;height:44px;border:0;background:none;color:#FFF8ED;font-size:20px;line-height:1';
  close.addEventListener('click', function () {
    pill.remove();
    try { sessionStorage.setItem(DISMISSED, '1'); } catch { /* 隐私模式不能写，只关闭本次 */ }
  });

  pill.appendChild(link);
  pill.appendChild(close);

  function sync() {
    var hidden = BLOCKED_PATH.test(location.pathname) || BLOCKED_QUERY.test(location.search);
    pill.style.display = hidden ? 'none' : 'flex';
    link.href = 'https://' + linkHost + '/l/page?url=' + encodeURIComponent(location.href);
  }

  // These sites are single-page apps: the link must follow the page the visitor is on now.
  ['pushState', 'replaceState'].forEach(function (method) {
    var original = history[method];
    history[method] = function () {
      var result = original.apply(this, arguments);
      sync();
      return result;
    };
  });
  window.addEventListener('popstate', sync);

  function mount() {
    sync();
    document.body.appendChild(pill);
  }
  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);
})();
