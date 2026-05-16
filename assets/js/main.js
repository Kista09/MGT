/* ═══════════════════════════════════════════════
   MGT | MgucaTech Solutions  —  main.js
═══════════════════════════════════════════════ */

/* ── Mobile nav ── */
const navList   = document.getElementById('nav-list');
const navToggle = document.getElementById('nav-toggle');

function closeMenu() {
  if (!navList || !navToggle) return;
  navList.classList.remove('open');
  navToggle.classList.remove('open');
  navToggle.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

if (navToggle && navList) {
  navToggle.setAttribute('aria-expanded', 'false');

  navToggle.addEventListener('click', () => {
    const open = navList.classList.toggle('open');
    navToggle.classList.toggle('open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  });
}

// Close on link click
document.querySelectorAll('.nav__link').forEach(link => {
  link.addEventListener('click', () => {
    closeMenu();
  });
});

// Close on outside click
document.addEventListener('click', e => {
  if (navList && navToggle && !navList.contains(e.target) && !navToggle.contains(e.target)) {
    closeMenu();
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeMenu();
});

/* ── Scroll: header + scroll-top ── */
const header   = document.getElementById('header');
const scrollUp = document.getElementById('scroll-up');

window.addEventListener('scroll', () => {
  const y = window.scrollY;
  if (header)   header.classList.toggle('scrolled', y >= 60);
  if (scrollUp) scrollUp.classList.toggle('show',   y >= 300);
}, { passive: true });

/* ── Active nav link on scroll ── */
const sections = document.querySelectorAll('section[id], div[id]');

window.addEventListener('scroll', () => {
  const y = window.scrollY + 90;
  sections.forEach(sec => {
    const top  = sec.offsetTop;
    const h    = sec.offsetHeight;
    const id   = sec.getAttribute('id');
    const link = document.querySelector(`.nav__link[href="#${id}"]`);
    if (link) link.classList.toggle('active-link', y >= top && y < top + h);
  });
}, { passive: true });

/* ── Video play / pause ── */
const videoEl  = document.getElementById('video-file');
const videoBtn = document.getElementById('video-button');
const videoIco = document.getElementById('video-icon');

if (videoBtn && videoEl) {
  videoBtn.addEventListener('click', () => {
    if (videoEl.paused) {
      videoEl.play();
      videoIco.className = 'ri-pause-line';
    } else {
      videoEl.pause();
      videoIco.className = 'ri-play-line';
    }
  });
  videoEl.addEventListener('ended', () => { videoIco.className = 'ri-play-line'; });
}

/* ── Dark / light theme toggle ── */
const themeBtn = document.getElementById('theme-button');
if (themeBtn) {
  const setThemeIcon = () => {
    const light = document.body.classList.contains('light-theme');
    themeBtn.className = `${light ? 'ri-sun-line' : 'ri-moon-line'} nav__theme`;
    themeBtn.setAttribute('aria-label', light ? 'Use dark theme' : 'Use light theme');
    themeBtn.setAttribute('title', light ? 'Use dark theme' : 'Use light theme');
  };

  // MGT defaults to dark, with a saved light-mode option.
  const saved = localStorage.getItem('mgt-theme');
  if (saved === 'light') document.body.classList.add('light-theme');
  setThemeIcon();

  themeBtn.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    setThemeIcon();
    localStorage.setItem('mgt-theme', document.body.classList.contains('light-theme') ? 'light' : 'dark');
  });
}

/* ── Contact form ── */
const contactForm = document.getElementById('contact-form');
const formStatus  = document.getElementById('form-status');
const submitBtn   = document.getElementById('form-submit-btn');

if (contactForm) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Sending… <i class="ri-loader-4-line"></i>';

    const fd = new FormData(contactForm);
    const payload = {
      name:    fd.get('name'),
      email:   fd.get('email'),
      subject: fd.get('subject'),
      message: fd.get('message'),
    };

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        contactForm.reset();
        formStatus.style.display = 'block';
        formStatus.style.color   = '#0a9396';
        formStatus.textContent   = '✓ Message sent! We\'ll be in touch soon.';
      } else {
        throw new Error();
      }
    } catch {
      formStatus.style.display = 'block';
      formStatus.style.color   = '#ae2012';
      formStatus.textContent   = '✗ Something went wrong. Please email admin@mgucatech.com directly.';
    } finally {
      submitBtn.innerHTML = 'Send Message <i class="ri-send-plane-line"></i>';
      submitBtn.disabled  = false;
    }
  });
}

/* ── ScrollReveal animations ── */
if (typeof ScrollReveal !== 'undefined') {
  const sr = ScrollReveal({ distance: '32px', duration: 1600, reset: false, easing: 'cubic-bezier(.4,0,.2,1)' });

  sr.reveal('.hero__body',     { origin: 'left',   delay: 100 });
  sr.reveal('.stat',           { origin: 'bottom', interval: 100 });
  sr.reveal('.about__text',    { origin: 'left' });
  sr.reveal('.about__visual',  { origin: 'right' });
  sr.reveal('.svc',            { origin: 'bottom', interval: 80 });
  sr.reveal('.step',           { origin: 'bottom', interval: 130 });
  sr.reveal('.sector',         { origin: 'bottom', interval: 60 });
  sr.reveal('.trust-card',     { origin: 'bottom', interval: 100 });
  sr.reveal('.partner',        { origin: 'bottom', interval: 80 });
  sr.reveal('.contact__left',  { origin: 'left' });
  sr.reveal('.contact__form',  { origin: 'right' });
}
