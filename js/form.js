// Events inquiry form: client-side validation, honeypot, Turnstile, JSON POST.
//
// During the cutover burn-in this posts to BOTH endpoints and treats either success as success:
//
//   INQUIRY_ENDPOINT  same-origin /api/inquiry on this site's own Worker. Writes the lead to D1
//                     before it attempts any email, so a delivery failure is a retry rather than
//                     a lost customer.
//   FORM_ENDPOINT     the old Formspree endpoint, kept alive for 2–4 weeks so D1 rows can be
//                     reconciled against Formspree before anything is switched off. This is the
//                     safety net, not the destination.
//
// TO RETIRE FORMSPREE: set FORM_ENDPOINT to "" in js/config.js. Everything below is written so
// that single change is sufficient; the three blocks that reference it are marked BURN-IN.
(function () {
  "use strict";
  var form = document.getElementById("inquiry-form");
  if (!form) return;

  var status = document.getElementById("form-status");
  var cfg = window.GBC_CONFIG || {};
  var workerEndpoint = cfg.INQUIRY_ENDPOINT || "";
  // BURN-IN (1/3)
  var formspreeEndpoint = cfg.FORM_ENDPOINT || "";

  // Where this visitor came from. js/config.js takes the snapshot on the FIRST page of the
  // session, which is the only place the external referrer still exists — reading
  // document.referrer here would return gorgesbeer.com for anyone who arrived via another
  // page. Falls back to capturing live if sessionStorage is unavailable, which is still
  // correct for visitors who land directly on this page.
  var attribution = (function () {
    try {
      var stored = window.sessionStorage && window.sessionStorage.getItem("gbc_first_touch");
      if (stored) {
        var firstTouch = JSON.parse(stored);
        if (firstTouch && firstTouch.landingPage) return firstTouch;
      }
    } catch (e) { /* unreadable or malformed — fall through to live capture */ }

    var params = new URLSearchParams(window.location.search);
    var utm = {};
    params.forEach(function (v, k) { if (k.indexOf("utm_") === 0 || k === "gclid" || k === "fbclid") utm[k] = v; });
    return {
      referrer: document.referrer || "direct or none",
      landingPage: window.location.href,
      utm: utm,
    };
  })();

  function setError(name, msg) {
    var field = form.querySelector('[data-field="' + name + '"]');
    if (!field) return;
    field.classList.toggle("has-error", !!msg);
    var err = field.querySelector(".field-error");
    if (err && msg) err.textContent = msg;
  }

  function validate(data) {
    var ok = true;
    ["name", "email", "phone", "eventType", "date", "guests", "message"].forEach(function (k) { setError(k, ""); });
    if (!data.name.trim()) { setError("name", "Please tell us your name."); ok = false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) { setError("email", "Enter a valid email so we can reply."); ok = false; }
    if (!data.phone.trim() || data.phone.replace(/\D/g, "").length < 7) { setError("phone", "Enter a phone number with area code."); ok = false; }
    if (!data.eventType) { setError("eventType", "Choose the kind of event."); ok = false; }
    if (!data.date) { setError("date", "Pick your preferred date — estimates are fine."); ok = false; }
    if (!data.guests || +data.guests < 1) { setError("guests", "Rough guest count helps us match a space."); ok = false; }
    if (!data.message.trim()) { setError("message", "A sentence or two about your event."); ok = false; }
    return ok;
  }

  // The Turnstile challenge token. Implicit rendering injects a hidden input with this name into
  // the containing form. Absent means the script was blocked or the widget has not solved yet —
  // the Worker fails closed on that, which is the intended behaviour.
  function challengeToken() {
    var field = form.elements["cf-turnstile-response"];
    return (field && field.value) || "";
  }

  // A token is single-use. Without this, a retry after a transient failure re-sends a spent token
  // and the Worker rejects it as a duplicate — which would quietly push every retry onto the
  // Formspree leg alone.
  function resetChallenge() {
    if (window.turnstile && typeof window.turnstile.reset === "function") {
      try { window.turnstile.reset(); } catch (e) { /* widget not rendered yet */ }
    }
  }

  // Never rejects: a network error is `false`, so one leg failing cannot reject the other's
  // Promise.all and turn a delivered lead into an error message.
  function post(url, payload) {
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    }).then(function (r) { return r.ok; }, function () { return false; });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    status.className = "form-status";

    var data = {
      name: form.elements.name.value,
      email: form.elements.email.value,
      phone: form.elements.phone.value,
      eventType: form.elements.eventType.value,
      date: form.elements.date.value,
      guests: form.elements.guests.value,
      location: form.elements.location.value,
      referralSource: form.elements.referralSource.value || "Not answered",
      message: form.elements.message.value,
      attribution: attribution,
      _subject: "New event inquiry — gorgesbeer.com",
      _source: "gorgesbeer.com weddings & events inquiry",
    };

    // The Worker payload is the Formspree payload plus the challenge token. Keeping the Formspree
    // body byte-identical to what it receives today is what makes the burn-in comparison
    // apples-to-apples — and there is no reason to hand a third party a spent token.
    var workerPayload = Object.assign({}, data, { "cf-turnstile-response": challengeToken() });

    // Honeypot: real users never see or fill this field. Report it to the Worker, which stores it
    // as a rejected row, then return exactly as before — no success message, no conversion event.
    // The old bare `return` produced no user error AND no signal, so a real browser's autofill
    // tripping this would have been an invisible lost lead. A bot learns nothing new either way.
    if (form.elements.company && form.elements.company.value) {
      if (workerEndpoint) post(workerEndpoint, workerPayload);
      return;
    }

    if (!validate(data)) {
      var firstErr = form.querySelector(".has-error input, .has-error select, .has-error textarea");
      if (firstErr) firstErr.focus();
      return;
    }

    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = "Sending…";

    var done = function (ok) {
      btn.disabled = false;
      btn.textContent = "Send inquiry";
      status.textContent = ok
        ? "Thank you — your inquiry is on its way. We'll get back to you within two business days. For anything urgent, call 541-625-0067."
        : "Something went wrong sending your inquiry. Please try again, or call 541-625-0067.";
      status.classList.add(ok ? "is-ok" : "is-err");
      if (ok) form.reset();
      // Spent either way: a success needs a fresh token for the next inquiry, a failure needs one
      // for the retry.
      resetChallenge();
      // Conversion signal for GA4 (via GTM). Guarded on a configured endpoint so demo mode,
      // which reports success without sending, never counts as a lead.
      if (ok && (workerEndpoint || formspreeEndpoint)) {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: "events_inquiry_success" });
      }
      status.scrollIntoView({ behavior: "smooth", block: "nearest" });
    };

    var attempts = [];
    if (workerEndpoint) attempts.push(post(workerEndpoint, workerPayload));
    // BURN-IN (2/3)
    if (formspreeEndpoint) attempts.push(post(formspreeEndpoint, data));

    if (!attempts.length) {
      // Demo mode: no endpoint configured at all (see js/config.js).
      setTimeout(function () { done(true); }, 600);
      return;
    }

    // BURN-IN (3/3): either leg succeeding is a success. Deliberate — during the parallel run a
    // Turnstile hiccup on the new path must not cost a lead that Formspree still received, and a
    // Formspree outage must not cost one the Worker already wrote to D1.
    Promise.all(attempts).then(function (results) {
      done(results.indexOf(true) !== -1);
    });
  });
})();
