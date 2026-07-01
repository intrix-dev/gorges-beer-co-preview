// Site configuration — wire these up at deploy time.
window.GBC_CONFIG = {
  // Events inquiry form posts here as JSON. Replace with Will's server endpoint
  // or a Cloudflare Worker + email service that delivers to events@gorgesbeer.com
  // (client-confirmed destination, 2026-06-24).
  // Leave as "" to keep the form in demo mode (validates, then shows success without sending).
  FORM_ENDPOINT: "",

  // Popup suppression window after dismiss/click-through, in days.
  POPUP_SUPPRESS_DAYS: 7,
};
