// Site configuration — wire these up at deploy time.
window.GBC_CONFIG = {
  // Primary: same-origin intrix-forms endpoint on this site's own Worker. Writes the lead to D1
  // BEFORE it attempts any email, so a delivery failure is a retry instead of a lost customer —
  // the failure mode that cost three real inquiries to Formspree's spam queue in August 2026.
  // Same-origin on purpose: no CORS preflight, and no third-party host for a privacy extension
  // or ad-blocker to block on the lead path.
  INQUIRY_ENDPOINT: "/api/inquiry",

  // Secondary, TEMPORARY: the old Formspree endpoint (account: marketing@intrixmedia.com).
  // Kept live for a 2–4 week burn-in so D1 rows can be reconciled against Formspree weekly
  // before anything is switched off. Set to "" to retire the Formspree leg — nothing else
  // needs to change.
  FORM_ENDPOINT: "https://formspree.io/f/xqerpjql",

  // Turnstile: the public sitekey lives in the widget's data-sitekey attribute in
  // weddings-events.html, because implicit rendering reads it from the markup. One source of
  // truth, deliberately not duplicated here. The secret half exists only as a Worker secret.

  // Popup suppression window after dismiss/click-through, in days.
  POPUP_SUPPRESS_DAYS: 7,
};

// First-touch attribution. This file loads on every page, so the snapshot happens on whatever
// page the visitor arrives at — before any in-page navigation replaces document.referrer with
// our own domain. Written once per session and never overwritten: someone who clicks a The Knot
// listing onto the home page and then browses to Weddings & Events still carries The Knot, not
// gorgesbeer.com. js/form.js reads this when an inquiry is submitted.
(function () {
  "use strict";
  var KEY = "gbc_first_touch";
  var store;
  try {
    store = window.sessionStorage;
    if (!store || store.getItem(KEY)) return;
  } catch (e) {
    return; // storage blocked (private mode, cookie settings) — form.js captures live instead
  }

  var params = new URLSearchParams(window.location.search);
  var utm = {};
  params.forEach(function (v, k) {
    if (k.indexOf("utm_") === 0 || k === "gclid" || k === "fbclid") utm[k] = v;
  });

  try {
    store.setItem(KEY, JSON.stringify({
      referrer: document.referrer || "direct or none",
      landingPage: window.location.href,
      utm: utm,
    }));
  } catch (e) {
    // quota or blocked write — same fallback as above
  }
})();
