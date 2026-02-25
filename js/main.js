// =============================================
//  PORTFOLIO — main.js
//  Toggle PT/EN + Scroll reveal
// =============================================

// ── LANG TOGGLE ──
const html       = document.documentElement;
const langBtn    = document.getElementById('langToggle');
let   currentLang = 'pt';

langBtn.addEventListener('click', () => {
  currentLang = currentLang === 'pt' ? 'en' : 'pt';
  html.setAttribute('data-lang', currentLang);
  langBtn.textContent = currentLang === 'pt' ? 'EN' : 'PT';
  applyLang(currentLang);
});

function applyLang(lang) {
  document.querySelectorAll('[data-pt]').forEach(el => {
    el.textContent = lang === 'pt' ? el.dataset.pt : el.dataset.en;
  });
}

// ── SCROLL REVEAL ──
const observerOpts = {
  threshold: 0.12,
  rootMargin: '0px 0px -60px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, observerOpts);

// Elementos que recebem reveal
document.querySelectorAll('.case, .about__left, .about__right, .contact__inner').forEach(el => {
  el.classList.add('reveal');
  observer.observe(el);
});

// ── NAV — ativa link conforme seção ──
const sections = document.querySelectorAll('section[id], footer[id]');
const navLinks  = document.querySelectorAll('.nav__links a');

const navObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(a => a.classList.remove('active'));
      const active = document.querySelector(`.nav__links a[href="#${entry.target.id}"]`);
      if (active) active.classList.add('active');
    }
  });
}, { threshold: 0.5 });

sections.forEach(s => navObserver.observe(s));

// ── HALFTONE MOUSE REPULSION ──
(function () {
  const SPRING   = 0.055;
  const DAMPING  = 0.74;
  const R_RADIUS = 80;
  const R_FORCE  = 5;

  const ticks = [];

  function build(section, halftoneEl, spacing, dotR, dotA, vignette) {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1;';
    halftoneEl.parentNode.insertBefore(canvas, halftoneEl);
    halftoneEl.style.display = 'none';

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgb(242,242,242)';

    let dots = [];
    let mx = -9999, my = -9999;

    function resize() {
      canvas.width  = section.offsetWidth;
      canvas.height = section.offsetHeight;
      dots = [];
      const W = canvas.width, H = canvas.height;
      const cols = Math.ceil(W / spacing) + 1;
      const rows = Math.ceil(H / spacing) + 1;
      const cx = W / 2, cy = H / 2;
      const rx = W * 0.4, ry = H * 0.4;

      for (let r = 0; r <= rows; r++) {
        for (let c = 0; c <= cols; c++) {
          const ox = c * spacing, oy = r * spacing;
          let a = dotA;
          if (vignette) {
            const nx = (ox - cx) / rx, ny = (oy - cy) / ry;
            const d  = Math.sqrt(nx * nx + ny * ny);
            a = dotA * Math.max(0, Math.min(1, 1 - (d - 0.4) / 0.6));
          }
          if (a > 0.004) dots.push({ ox, oy, x: ox, y: oy, vx: 0, vy: 0, a });
        }
      }
    }

    function tick() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgb(242,242,242)';
      const RR = R_RADIUS * R_RADIUS;
      for (const d of dots) {
        const ddx = d.x - mx, ddy = d.y - my;
        const dist2 = ddx * ddx + ddy * ddy;
        if (dist2 < RR) {
          const dist = Math.sqrt(dist2) || 0.01;
          const f = (1 - dist / R_RADIUS) * R_FORCE;
          d.vx += (ddx / dist) * f;
          d.vy += (ddy / dist) * f;
        }
        d.vx += (d.ox - d.x) * SPRING;
        d.vy += (d.oy - d.y) * SPRING;
        d.vx *= DAMPING;
        d.vy *= DAMPING;
        d.x  += d.vx;
        d.y  += d.vy;
        ctx.globalAlpha = d.a;
        ctx.beginPath();
        ctx.arc(d.x, d.y, dotR, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    section.addEventListener('mousemove', e => {
      const rect = canvas.getBoundingClientRect();
      mx = e.clientX - rect.left;
      my = e.clientY - rect.top;
    });
    section.addEventListener('mouseleave', () => { mx = -9999; my = -9999; });
    window.addEventListener('resize', resize);
    resize();
    return tick;
  }

  const defs = [
    ['.hero',    '.hero__halftone',    18, 1.5, 0.38, true ],
    ['.about',   '.about__halftone',   14, 2,   0.28, false],
    ['.contact', '.contact__halftone', 14, 2,   0.28, false],
  ];

  for (const [sel, hSel, sp, r, a, vig] of defs) {
    const sec = document.querySelector(sel);
    const ht  = document.querySelector(hSel);
    if (sec && ht) ticks.push(build(sec, ht, sp, r, a, vig));
  }

  if (ticks.length) {
    (function loop() { ticks.forEach(fn => fn()); requestAnimationFrame(loop); })();
  }
})();
