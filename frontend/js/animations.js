/* ============================================================
 * ElimuSaaS — Animation Engine
 * Canvas particle mesh · Counter animations · Scroll reveals
 * Testimonial carousel · Feature row stagger · Ripple
 * ============================================================ */
(function () {
  'use strict';

  /* ── Canvas particle mesh (brand panel background) ──────── */
  function initBrandCanvas() {
    var canvas = document.getElementById('brand-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var panel = canvas.parentElement;
    var W, H, dots;

    function resize() {
      W = canvas.width  = panel.offsetWidth;
      H = canvas.height = panel.offsetHeight;
      var n = Math.floor((W * H) / 9000);
      dots = Array.from({ length: n }, function () {
        return {
          x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - .5) * .4, vy: (Math.random() - .5) * .4,
          r: Math.random() * 1.8 + .6
        };
      });
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      /* connections */
      ctx.lineWidth = .8;
      for (var i = 0; i < dots.length; i++) {
        for (var j = i + 1; j < dots.length; j++) {
          var dx = dots[i].x - dots[j].x, dy = dots[i].y - dots[j].y;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d < 110) {
            ctx.strokeStyle = 'rgba(255,255,255,' + ((1 - d / 110) * .45) + ')';
            ctx.beginPath(); ctx.moveTo(dots[i].x, dots[i].y); ctx.lineTo(dots[j].x, dots[j].y); ctx.stroke();
          }
        }
      }
      /* dots */
      dots.forEach(function (d) {
        ctx.fillStyle = 'rgba(255,255,255,.5)';
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0 || d.x > W) d.vx *= -1;
        if (d.y < 0 || d.y > H) d.vy *= -1;
      });
      requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('resize', resize);
    draw();
  }

  /* ── Counter animation (ease-out cubic) ─────────────────── */
  function animateCounter(el) {
    var target = parseFloat(el.getAttribute('data-target')) || 0;
    var start = null;
    requestAnimationFrame(function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / 1800, 1);
      var ease = 1 - Math.pow(1 - p, 3);
      el.textContent = target % 1 === 0
        ? Math.round(target * ease).toLocaleString()
        : (target * ease).toFixed(1);
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target % 1 === 0 ? target.toLocaleString() : target.toFixed(1);
    });
  }

  function initCounters(root) {
    (root || document).querySelectorAll('.counter[data-target]').forEach(animateCounter);
  }

  /* ── Intersection observer scroll reveal ────────────────── */
  function initReveal() {
    if (!window.IntersectionObserver) {
      document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('visible'); });
      return;
    }
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
      });
    }, { threshold: .12 });
    document.querySelectorAll('.reveal').forEach(function (el) { obs.observe(el); });
  }

  /* ── Feature row stagger (brand panel) ─────────────────── */
  function initFeatureReveal() {
    document.querySelectorAll('.feature-row').forEach(function (row, i) {
      setTimeout(function () { row.classList.add('visible'); }, 700 + i * 130);
    });
  }

  /* ── Testimonial carousel ───────────────────────────────── */
  var _testimonials = [
    { text: '"ElimuSaaS transformed how we run our school. Fee collection alone saves us 3 days every month. M-Pesa integration is flawless."', name: 'James Mwangi', role: 'Principal, Nairobi Academy', initials: 'JM' },
    { text: '"The CBC exam module and report cards are exactly what we needed. Our teachers save hours every term. Support is outstanding."', name: 'Sarah Kamau', role: 'HOD Academics, Westlands School', initials: 'SK' },
    { text: '"Switching from spreadsheets to ElimuSaaS was the best decision. Parent communication via WhatsApp is now seamless."', name: 'David Otieno', role: 'Bursar, Kisumu High School', initials: 'DO' },
  ];
  var _tIdx = 0, _tInterval = null;

  function renderTestimonial(idx) {
    var carousel = document.getElementById('testimonial-carousel');
    var dots      = document.querySelectorAll('.t-dot');
    if (!carousel) return;
    var t = _testimonials[idx];
    var stars = Array(5).fill('<svg width="13" height="13" viewBox="0 0 24 24" fill="#FFD54F"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>').join('');
    carousel.innerHTML =
      '<div class="testimonial-slide active-slide" style="background:rgba(255,255,255,.08);border-radius:14px;padding:20px 22px;backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.12)">'
      + '<div style="display:flex;gap:3px;margin-bottom:10px">' + stars + '</div>'
      + '<p style="font-size:13px;opacity:.9;line-height:1.65;margin:0 0 14px;font-style:italic">' + t.text + '</p>'
      + '<div style="display:flex;align-items:center;gap:10px">'
      + '<div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#42A5F5,#1565C0);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;color:white;flex-shrink:0">' + t.initials + '</div>'
      + '<div><div style="font-size:12px;font-weight:700;color:white">' + t.name + '</div><div style="font-size:11px;opacity:.6;color:white">' + t.role + '</div></div>'
      + '</div></div>';
    dots.forEach(function (d, i) {
      d.style.width   = i === idx ? '20px' : '8px';
      d.style.background = i === idx ? 'rgba(255,255,255,.85)' : 'rgba(255,255,255,.3)';
    });
  }

  function initTestimonialCarousel() {
    if (!document.getElementById('testimonial-carousel')) return;
    renderTestimonial(0);
    clearInterval(_tInterval);
    _tInterval = setInterval(function () {
      _tIdx = (_tIdx + 1) % _testimonials.length;
      renderTestimonial(_tIdx);
    }, 5000);
  }

  /* ── Button ripple on click ─────────────────────────────── */
  function initRipple() {
    document.addEventListener('mousedown', function (e) {
      var btn = e.target.closest('#login-btn, .btn-primary, button[type=submit]');
      if (!btn) return;
      var rect = btn.getBoundingClientRect();
      btn.style.setProperty('--rx', ((e.clientX - rect.left) / rect.width * 100) + '%');
      btn.style.setProperty('--ry', ((e.clientY - rect.top)  / rect.height * 100) + '%');
    });
  }

  /* ── Helpers exposed globally ───────────────────────────── */
  window.numPop = function (el) {
    if (!el) return;
    el.classList.remove('num-pop');
    void el.offsetWidth;
    el.classList.add('num-pop');
    setTimeout(function () { el.classList.remove('num-pop'); }, 400);
  };

  window.animateProgress = function (el, pct) {
    if (!el) return;
    el.style.width = '0';
    requestAnimationFrame(function () {
      el.style.transition = 'width 1.1s cubic-bezier(.22,.61,.36,1)';
      el.style.width = Math.min(100, pct) + '%';
    });
  };

  window.initDashboardCounters = function () {
    initCounters(document.querySelector('.page-view.active') || document);
  };

  /* ── Bootstrap ──────────────────────────────────────────── */
  function init() {
    initBrandCanvas();
    initCounters();
    initReveal();
    initFeatureReveal();
    initTestimonialCarousel();
    initRipple();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* Re-run on SPA route change */
  document.addEventListener('elimu:page-changed', function () {
    setTimeout(function () { initCounters(); initReveal(); }, 80);
  });

})();
