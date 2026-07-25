// Site configuration — wire these up at deploy time.
window.GBC_CONFIG = {
  // Events inquiry form posts here as JSON (Formspree, account: marketing@intrixmedia.com).
  // Recipient is set in the Formspree dashboard — events@gorgesbeer.com once verified
  // (client-confirmed destination, 2026-06-24).
  // Leave as "" to keep the form in demo mode (validates, then shows success without sending).
  FORM_ENDPOINT: "https://formspree.io/f/xqerpjql",

  // Popup suppression window after dismiss/click-through, in days.
  POPUP_SUPPRESS_DAYS: 7,
};
