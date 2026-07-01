// Events inquiry form: client-side validation, honeypot, JSON POST to FORM_ENDPOINT.
// Delivery target (configured server-side at the endpoint): travis@gorgesbeer.com
(function () {
  "use strict";
  var form = document.getElementById("inquiry-form");
  if (!form) return;

  var status = document.getElementById("form-status");
  var endpoint = (window.GBC_CONFIG && window.GBC_CONFIG.FORM_ENDPOINT) || "";

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

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    status.className = "form-status";

    // Honeypot: real users never see or fill this field.
    if (form.elements.company && form.elements.company.value) return;

    var data = {
      name: form.elements.name.value,
      email: form.elements.email.value,
      phone: form.elements.phone.value,
      eventType: form.elements.eventType.value,
      date: form.elements.date.value,
      guests: form.elements.guests.value,
      location: form.elements.location.value,
      message: form.elements.message.value,
      _to: "travis@gorgesbeer.com",
      _source: "gorgesbeer.com weddings & events inquiry",
    };
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
        : "Something went wrong sending your inquiry. Please try again, or email events@gorgesbeer.com directly.";
      status.classList.add(ok ? "is-ok" : "is-err");
      if (ok) form.reset();
      status.scrollIntoView({ behavior: "smooth", block: "nearest" });
    };

    if (!endpoint) {
      // Demo mode: no endpoint configured yet (see js/config.js).
      setTimeout(function () { done(true); }, 600);
      return;
    }

    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then(function (r) { done(r.ok); })
      .catch(function () { done(false); });
  });
})();
