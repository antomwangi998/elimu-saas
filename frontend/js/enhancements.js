// ============================================================
// ElimuSaaS Enhancements — All cool features
// ============================================================
'use strict';

// ── 1. DARK MODE ─────────────────────────────────────────────
window.DarkMode = (function() {
  var STORAGE_KEY = 'elimu_dark';
  var isDark = localStorage.getItem(STORAGE_KEY) === '1';

  function apply(dark) {
    document.documentElement.classList.toggle('dark-mode', dark);
    // Update toggle buttons
    document.querySelectorAll('.dark-toggle').forEach(function(btn) {
      btn.textContent = dark ? '☀️' : '🌙';
      btn.title = dark ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    });
  }

  function toggle() {
    isDark = !isDark;
    localStorage.setItem(STORAGE_KEY, isDark ? '1' : '0');
    apply(isDark);
  }

  // Apply on load
  document.addEventListener('DOMContentLoaded', function() { apply(isDark); });

  return { toggle: toggle, isDark: function() { return isDark; } };
})();

// ── 2. PARTICLES (hero background) ───────────────────────────
window.Particles = (function() {
  var canvas, ctx, particles = [], animId;

  function init(containerId) {
    var container = document.getElementById(containerId || 'particles-canvas');
    if (!container) return;
    canvas = container;
    ctx = canvas.getContext('2d');
    resize();
    createParticles();
    animate();
    window.addEventListener('resize', resize, { passive: true });
  }

  function resize() {
    if (!canvas) return;
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }

  function createParticles() {
    particles = [];
    var count = Math.min(Math.floor((canvas.width * canvas.height) / 8000), 60);
    for (var i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 2.5 + 0.5,
        dx: (Math.random() - 0.5) * 0.4,
        dy: (Math.random() - 0.5) * 0.4,
        alpha: Math.random() * 0.5 + 0.1
      });
    }
  }

  function animate() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(function(p) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,' + p.alpha + ')';
      ctx.fill();
      p.x += p.dx; p.y += p.dy;
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;
    });
    // Draw connecting lines between nearby particles
    for (var i = 0; i < particles.length; i++) {
      for (var j = i + 1; j < particles.length; j++) {
        var dx = particles[i].x - particles[j].x;
        var dy = particles[i].y - particles[j].y;
        var dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 80) {
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(255,255,255,' + (0.08 * (1 - dist/80)) + ')';
          ctx.lineWidth = 0.5;
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
    animId = requestAnimationFrame(animate);
  }

  return { init: init };
})();

// ── 3. TYPING ANIMATION ───────────────────────────────────────
window.Typewriter = (function() {
  function start(el, phrases, opts) {
    if (!el) return;
    opts = opts || {};
    var speed    = opts.speed    || 60;
    var pause    = opts.pause    || 2000;
    var deleteSpeed = opts.deleteSpeed || 30;
    var cur = 0, charIdx = 0, deleting = false;

    function tick() {
      var phrase = phrases[cur];
      if (!deleting) {
        el.textContent = phrase.slice(0, charIdx + 1);
        charIdx++;
        if (charIdx === phrase.length) {
          deleting = true;
          setTimeout(tick, pause);
          return;
        }
        setTimeout(tick, speed);
      } else {
        el.textContent = phrase.slice(0, charIdx - 1);
        charIdx--;
        if (charIdx === 0) {
          deleting = false;
          cur = (cur + 1) % phrases.length;
        }
        setTimeout(tick, charIdx === 0 ? 400 : deleteSpeed);
      }
    }
    tick();
  }
  return { start: start };
})();

// ── 4. ANIMATED COUNTERS ──────────────────────────────────────
window.AnimCounter = (function() {
  function run(el, target, duration, suffix) {
    if (!el) return;
    suffix = suffix || '';
    var start = 0, step = target / (duration / 16);
    var timer = setInterval(function() {
      start += step;
      if (start >= target) { start = target; clearInterval(timer); }
      var display = Math.floor(start);
      el.textContent = display >= 1000
        ? (display/1000).toFixed(display >= 1000000 ? 1 : 0) + 'M' + suffix
        : display + suffix;
    }, 16);
  }
  function initAll() {
    document.querySelectorAll('[data-counter]').forEach(function(el) {
      var target = parseInt(el.dataset.counter) || 0;
      var suffix = el.dataset.suffix || '';
      var duration = parseInt(el.dataset.duration) || 1800;
      run(el, target, duration, suffix);
    });
  }
  return { run: run, initAll: initAll };
})();

// ── 5. CONFETTI ───────────────────────────────────────────────
window.Confetti = (function() {
  var canvas, ctx, pieces = [], animId;
  var COLORS = ['#1565C0','#4CAF50','#FF9800','#E91E63','#9C27B0','#00BCD4','#FFD700'];

  function burst(x, y, count) {
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:99999';
      canvas.width = window.innerWidth; canvas.height = window.innerHeight;
      document.body.appendChild(canvas);
      ctx = canvas.getContext('2d');
    }
    count = count || 80;
    for (var i = 0; i < count; i++) {
      var angle = (Math.random() * Math.PI * 2);
      var speed = Math.random() * 8 + 2;
      pieces.push({
        x: x || window.innerWidth/2, y: y || window.innerHeight/3,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 4,
        color: COLORS[Math.floor(Math.random()*COLORS.length)],
        size: Math.random() * 8 + 4,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        gravity: 0.15, life: 1
      });
    }
    if (!animId) animate();
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces = pieces.filter(function(p) { return p.life > 0; });
    pieces.forEach(function(p) {
      p.x += p.vx; p.y += p.vy; p.vy += p.gravity;
      p.rotation += p.rotationSpeed; p.life -= 0.012;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation * Math.PI/180);
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size * 0.4);
      ctx.restore();
    });
    if (pieces.length > 0) {
      animId = requestAnimationFrame(animate);
    } else {
      animId = null;
      if (canvas) { canvas.remove(); canvas = null; }
    }
  }

  return { burst: burst };
})();

// ── 6. SKELETON LOADING ───────────────────────────────────────
window.Skeleton = (function() {
  function card(lines) {
    lines = lines || 3;
    var rows = '';
    for (var i = 0; i < lines; i++) {
      var w = i === 0 ? '60%' : (i === lines-1 ? '40%' : '100%');
      rows += '<div class="sk-line" style="width:' + w + ';height:' + (i===0?20:14) + 'px;margin-bottom:10px"></div>';
    }
    return '<div class="sk-card">' + rows + '</div>';
  }

  function table(rows, cols) {
    rows = rows || 5; cols = cols || 4;
    var html = '<div class="sk-card">';
    for (var r = 0; r < rows; r++) {
      html += '<div style="display:flex;gap:16px;margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid rgba(0,0,0,0.05)">';
      for (var c = 0; c < cols; c++) {
        html += '<div class="sk-line" style="flex:1;height:14px"></div>';
      }
      html += '</div>';
    }
    return html + '</div>';
  }

  function stat() {
    return '<div class="sk-card" style="text-align:center"><div class="sk-line" style="width:50%;height:36px;margin:0 auto 8px"></div><div class="sk-line" style="width:70%;height:14px;margin:0 auto"></div></div>';
  }

  return { card: card, table: table, stat: stat };
})();

// ── 7. PULL TO REFRESH ───────────────────────────────────────
window.PullRefresh = (function() {
  var startY, pulling = false, THRESHOLD = 80;

  function init(onRefresh) {
    var indicator = document.createElement('div');
    indicator.id = 'ptr-indicator';
    indicator.style.cssText = 'position:fixed;top:-60px;left:50%;transform:translateX(-50%);background:var(--brand,#1565C0);color:white;border-radius:99px;padding:8px 20px;font-size:13px;font-weight:700;transition:top 0.2s;z-index:9999;pointer-events:none';
    indicator.textContent = '↓ Pull to refresh';
    document.body.appendChild(indicator);

    document.addEventListener('touchstart', function(e) {
      if (window.scrollY <= 0) { startY = e.touches[0].clientY; pulling = true; }
    }, { passive: true });

    document.addEventListener('touchmove', function(e) {
      if (!pulling) return;
      var diff = e.touches[0].clientY - startY;
      if (diff > 10) {
        indicator.style.top = Math.min(diff - 30, 24) + 'px';
        indicator.textContent = diff > THRESHOLD ? '↑ Release to refresh' : '↓ Pull to refresh';
      }
    }, { passive: true });

    document.addEventListener('touchend', function(e) {
      if (!pulling) return;
      pulling = false;
      var diff = e.changedTouches[0].clientY - startY;
      indicator.style.top = '-60px';
      if (diff > THRESHOLD && onRefresh) {
        indicator.textContent = '⟳ Refreshing...';
        indicator.style.top = '10px';
        onRefresh(function() { indicator.style.top = '-60px'; });
      }
    }, { passive: true });
  }

  return { init: init };
})();

// ── 8. NOTIFICATION SOUND ─────────────────────────────────────
window.NotifSound = (function() {
  function play(type) {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      var freqs = { success:[523,659,784], error:[400,320], info:[440,523] };
      var notes = freqs[type] || freqs.info;
      var now = ctx.currentTime;
      gain.gain.setValueAtTime(0.1, now);
      notes.forEach(function(freq, i) {
        osc.frequency.setValueAtTime(freq, now + i * 0.12);
      });
      osc.start(now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + notes.length * 0.12 + 0.1);
      osc.stop(now + notes.length * 0.12 + 0.15);
    } catch(e) {} // silent fail if audio context unavailable
  }
  return { play: play };
})();

// ── 9. FLOATING ACTION BUTTON ─────────────────────────────────
window.FAB = (function() {
  var el, open = false;

  var actions = [
    { icon:'👤', label:'Add Student',  page:'students',   action: function() { Router.go('students'); } },
    { icon:'💰', label:'Record Fee',   page:'fees',       action: function() { Router.go('fees'); } },
    { icon:'✅', label:'Attendance',   page:'attendance', action: function() { Router.go('attendance'); } },
    { icon:'📝', label:'Enter Marks',  page:'exams',      action: function() { Router.go('exams'); } },
  ];

  function init() {
    if (document.getElementById('fab-root')) return;
    var role = (window.AppState && AppState.user) ? AppState.user.role : '';
    if (!role || role === 'student' || role === 'parent') return;

    el = document.createElement('div');
    el.id = 'fab-root';
    el.style.cssText = 'position:fixed;bottom:80px;right:20px;z-index:998;display:flex;flex-direction:column-reverse;align-items:flex-end;gap:10px';

    // Action buttons
    var actionsHtml = actions.map(function(a, i) {
      return '<div class="fab-action" style="display:flex;align-items:center;gap:8px;opacity:0;transform:translateY(10px);transition:all 0.2s;transition-delay:' + (i*0.04) + 's;pointer-events:none">' +
        '<span style="background:rgba(0,0,0,0.7);color:white;font-size:11px;font-weight:600;padding:4px 10px;border-radius:99px;white-space:nowrap">' + a.label + '</span>' +
        '<button onclick="FAB._action(' + i + ')" style="width:42px;height:42px;border-radius:50%;background:white;border:none;font-size:18px;box-shadow:0 2px 12px rgba(0,0,0,0.2);cursor:pointer">' + a.icon + '</button>' +
        '</div>';
    }).join('');

    el.innerHTML = actionsHtml +
      '<button id="fab-main" onclick="FAB.toggle()" ' +
      'style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#1565C0,#1976D2);border:none;color:white;font-size:24px;box-shadow:0 4px 16px rgba(21,101,192,0.5);cursor:pointer;transition:transform 0.2s">' +
      '+</button>';

    document.body.appendChild(el);
  }

  function toggle() {
    open = !open;
    var mainBtn = document.getElementById('fab-main');
    if (mainBtn) mainBtn.style.transform = open ? 'rotate(45deg)' : 'rotate(0)';
    el.querySelectorAll('.fab-action').forEach(function(a) {
      a.style.opacity = open ? '1' : '0';
      a.style.transform = open ? 'translateY(0)' : 'translateY(10px)';
      a.style.pointerEvents = open ? 'auto' : 'none';
    });
  }

  function _action(i) {
    toggle();
    actions[i].action();
  }

  return { init: init, toggle: toggle, _action: _action };
})();

// ── 10. PAGE TRANSITIONS ─────────────────────────────────────
window.PageTransition = (function() {
  var overlay;
  function init() {
    overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:#1565C0;z-index:99997;opacity:0;pointer-events:none;transition:opacity 0.15s ease';
    document.body.appendChild(overlay);
  }
  function flash() {
    if (!overlay) return;
    overlay.style.opacity = '0.12';
    setTimeout(function() { overlay.style.opacity = '0'; }, 150);
  }
  return { init: init, flash: flash };
})();

// ── 11. REAL-TIME DASHBOARD REFRESH ──────────────────────────
window.RealtimeDash = (function() {
  var timer, interval = 30000; // 30 seconds

  function start() {
    stop();
    timer = setInterval(function() {
      var page = window.AppState && AppState.currentPage;
      if (page === 'dashboard') {
        if (window.Pages && Pages.Dashboard && Pages.Dashboard.load) {
          Pages.Dashboard.load(true); // silent refresh
        }
      }
    }, interval);
  }

  function stop() { if (timer) clearInterval(timer); }

  return { start: start, stop: stop };
})();

// ── 12. PWA INSTALL BANNER ────────────────────────────────────
(function() {
  var installPrompt = null;
  window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    installPrompt = e;
    // Show banner after 5 seconds if not dismissed before
    setTimeout(function() {
      if (!localStorage.getItem('pwa_dismissed')) showBanner();
    }, 5000);
  });

  function showBanner() {
    if (document.getElementById('pwa-banner')) return;
    var banner = document.createElement('div');
    banner.id = 'pwa-banner';
    banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:linear-gradient(135deg,#1565C0,#1976D2);color:white;padding:14px 16px;display:flex;align-items:center;gap:12px;z-index:99990;box-shadow:0 -4px 20px rgba(0,0,0,0.2)';
    banner.innerHTML = '<div style="width:40px;height:40px;background:rgba(255,255,255,0.2);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">🏫</div>' +
      '<div style="flex:1"><div style="font-weight:700;font-size:14px">Install ElimuSaaS</div><div style="font-size:11px;opacity:0.8">Add to home screen for the best experience</div></div>' +
      '<button onclick="FAB_installPWA()" style="background:white;color:#1565C0;border:none;padding:8px 16px;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer">Install</button>' +
      '<button onclick="this.parentElement.remove();localStorage.setItem(\'pwa_dismissed\',\'1\')" style="background:none;border:none;color:rgba(255,255,255,0.7);font-size:20px;cursor:pointer;padding:4px 8px">×</button>';
    document.body.appendChild(banner);
  }

  window.FAB_installPWA = function() {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then(function() {
      var banner = document.getElementById('pwa-banner');
      if (banner) banner.remove();
    });
  };
})();

// ── INIT ALL ON APP READY ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  PageTransition.init();

  // Hook into Router.go for transitions + FAB
  var _origGo = window.Router && Router.go ? Router.go.bind(Router) : null;
  if (_origGo) {
    Router.go = function(name, params) {
      PageTransition.flash();
      var noShell = name === 'landing' || name === 'login';
      // Show/hide FAB
      var fab = document.getElementById('fab-root');
      if (fab) fab.style.display = noShell ? 'none' : '';
      return _origGo(name, params);
    };
  }

  // Init pull-to-refresh for app pages
  PullRefresh.init(function(done) {
    var page = window.AppState && AppState.currentPage;
    if (page && window.Pages && Pages[capitalize(page)] && Pages[capitalize(page)].load) {
      Pages[capitalize(page)].load();
    }
    setTimeout(done, 1500);
  });
});

// Hook onto login complete to start FAB + realtime
window.addEventListener('elimu:loggedin', function() {
  FAB.init();
  RealtimeDash.start();
});

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/-([a-z])/g, function(m,c){return c.toUpperCase();}) : '';
}
