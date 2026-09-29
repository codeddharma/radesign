/* Site runtime: Lenis smooth scroll, reveals, image placeholder hydration */
(function () {
  function initLenis() {
    if (typeof Lenis === "undefined") return;
    const lenis = new Lenis({
      lerp: 0.09,
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.5,
    });
    window.__lenis = lenis;
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
  }

  function initReveals() {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("in"); });
    }, { threshold: 0.08, rootMargin: "0px 0px -4% 0px" });
    document.querySelectorAll(".reveal, .img-mask").forEach((el) => io.observe(el));
    window.__raIO = io;

    // sweep anything already on-screen
    document.querySelectorAll(".reveal, .img-mask").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.95) el.classList.add("in");
    });
  }

  // Smooth auto-hide nav on scroll down, reveal on scroll up
  function initNavHide() {
    let last = 0, ticking = false;
    const nav = () => document.querySelector('.nav');
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const n = nav();
        if (n) {
          if (y > 120 && y > last) n.classList.add('nav-hidden');
          else n.classList.remove('nav-hidden');
        }
        last = y;
        ticking = false;
      });
    }, { passive: true });
  }

  // Gentle parallax on anything [data-parallax]
  function initParallax() {
    const els = document.querySelectorAll('[data-parallax]');
    if (!els.length) return;
    function tick() {
      const vh = window.innerHeight;
      els.forEach((el) => {
        const r = el.getBoundingClientRect();
        const mid = r.top + r.height / 2 - vh / 2;
        const s = parseFloat(el.dataset.parallax) || 0.15;
        el.style.setProperty('--py', (mid * s * -0.1).toFixed(2) + 'px');
      });
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function hydratePh(root) {
    const scope = root || document;
    scope.querySelectorAll(".ph").forEach((el) => {
      if (el.dataset.hydrated) return;
      el.dataset.hydrated = "1";
      const parts = ['<div class="layer sky"></div>', '<div class="layer ground"></div>', '<div class="layer vol"></div>', '<div class="layer opening"></div>', '<div class="layer opening o2"></div>'];
      el.insertAdjacentHTML("afterbegin", parts.join(""));
    });
  }

  function init() {
    initLenis();
    hydratePh();
    initReveals();
    initNavHide();
    initParallax();
  }

  window.RA = { hydratePh, triggerReveals: () => {
    if (window.__raIO) document.querySelectorAll(".reveal:not(.in), .img-mask:not(.in)").forEach(el => window.__raIO.observe(el));
  }};

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
