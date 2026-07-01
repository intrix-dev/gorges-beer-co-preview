// Gorges Beer Co — shared behavior: nav, scroll reveal, award popup.
(function () {
  "use strict";

  /* ----- header: solid after leaving hero ----- */
  var header = document.querySelector(".site-header");
  if (header && !header.classList.contains("site-header--solid")) {
    var onScroll = function () {
      header.classList.toggle("is-solid", window.scrollY > 40);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ----- mobile nav toggle ----- */
  var toggle = document.querySelector(".nav__toggle");
  var links = document.getElementById("nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      if (header) header.classList.toggle("is-solid", open || window.scrollY > 40);
    });
  }

  /* ----- menu dropdown ----- */
  var dd = document.querySelector(".nav__dd");
  if (dd) {
    var ddBtn = dd.querySelector(".nav__dd-btn");
    var ddClose = function () {
      dd.classList.remove("is-open");
      ddBtn.setAttribute("aria-expanded", "false");
    };
    ddBtn.addEventListener("click", function () {
      var open = dd.classList.toggle("is-open");
      ddBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("click", function (e) {
      if (dd.classList.contains("is-open") && !dd.contains(e.target)) ddClose();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && dd.classList.contains("is-open")) { ddClose(); ddBtn.focus(); }
    });
  }

  /* ----- reveal on scroll ----- */
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var revealEls = document.querySelectorAll(".reveal");
  if (reduced || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  } else if (revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.1 });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ----- looping videos (hero + framed teaser): respect reduced motion ----- */
  if (reduced) {
    Array.prototype.forEach.call(document.querySelectorAll("video[autoplay]"), function (v) {
      v.removeAttribute("autoplay");
      v.pause();
    });
  }

  /* ----- space-row image carousels (manual: arrows, dots, keyboard, swipe; no auto-rotate) ----- */
  Array.prototype.forEach.call(document.querySelectorAll("[data-carousel]"), function (root) {
    var track = root.querySelector(".carousel__track");
    var slides = track ? Array.prototype.slice.call(track.querySelectorAll("img")) : [];
    if (slides.length < 2) return; // graceful single-image degrade: leave the lone <img> as-is

    var index = 0;
    var svg = function (d) {
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"/></svg>';
    };

    var status = document.createElement("p");
    status.className = "carousel__status";
    status.setAttribute("aria-live", "polite");

    var prev = document.createElement("button");
    prev.type = "button";
    prev.className = "carousel__btn carousel__btn--prev";
    prev.setAttribute("aria-label", "Previous image");
    prev.innerHTML = svg("M15 18 9 12l6-6");

    var next = document.createElement("button");
    next.type = "button";
    next.className = "carousel__btn carousel__btn--next";
    next.setAttribute("aria-label", "Next image");
    next.innerHTML = svg("M9 6l6 6-6 6");

    var dots = document.createElement("div");
    dots.className = "carousel__dots";
    var dotEls = slides.map(function (_, i) {
      var dot = document.createElement("button");
      dot.type = "button";
      dot.className = "carousel__dot";
      dot.setAttribute("aria-label", "Go to image " + (i + 1) + " of " + slides.length);
      dot.addEventListener("click", function () { show(i); });
      dots.appendChild(dot);
      return dot;
    });

    function show(i) {
      index = (i + slides.length) % slides.length;
      slides.forEach(function (img, n) {
        var on = n === index;
        img.hidden = !on;
        img.setAttribute("aria-hidden", on ? "false" : "true");
      });
      dotEls.forEach(function (dot, n) {
        dot.setAttribute("aria-current", n === index ? "true" : "false");
      });
      status.textContent = "Image " + (index + 1) + " of " + slides.length;
    }

    prev.addEventListener("click", function () { show(index - 1); });
    next.addEventListener("click", function () { show(index + 1); });

    root.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { show(index - 1); prev.focus(); }
      else if (e.key === "ArrowRight") { show(index + 1); next.focus(); }
    });

    var x0 = null;
    track.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    track.addEventListener("touchend", function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) { show(index + (dx < 0 ? 1 : -1)); }
      x0 = null;
    }, { passive: true });

    root.classList.add("carousel");
    root.appendChild(prev);
    root.appendChild(next);
    root.appendChild(dots);
    root.appendChild(status);
    show(0);
  });

  /* ----- award popup ----- */
  var modal = document.getElementById("award-modal");
  if (modal) {
    var KEY = "gbc-award-popup-seen";
    var days = (window.GBC_CONFIG && window.GBC_CONFIG.POPUP_SUPPRESS_DAYS) || 7;
    var seen = 0;
    try { seen = parseInt(localStorage.getItem(KEY) || "0", 10); } catch (e) {}
    var fresh = Date.now() - seen < days * 864e5;
    var lastFocused = null;

    var close = function () {
      modal.classList.remove("is-open");
      document.removeEventListener("keydown", onKey);
      try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {}
      if (lastFocused) lastFocused.focus();
    };
    var onKey = function (e) {
      if (e.key === "Escape") close();
      if (e.key === "Tab") { // keep focus inside the card
        var f = modal.querySelectorAll("a[href], button");
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
        else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
      }
    };

    if (!fresh) {
      setTimeout(function () {
        lastFocused = document.activeElement;
        modal.classList.add("is-open");
        document.addEventListener("keydown", onKey);
        var btn = modal.querySelector(".modal__close");
        if (btn) btn.focus();
      }, 2200);
    }
    modal.addEventListener("click", function (e) {
      if (e.target === modal || e.target.closest("[data-modal-close]")) close();
    });
  }
})();
