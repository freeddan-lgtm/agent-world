// Agent World promo: starfield, mobile menu, reveal-on-scroll, lighter 3D on small screens.
(function () {
  document.documentElement.classList.remove('no-js');
  var y = document.getElementById('yr'); if (y) y.textContent = new Date().getFullYear();

  // phones/tablets: run the embedded world in lite mode (no bloom, 1x pixel ratio)
  var f = document.getElementById('world');
  if (f && (window.innerWidth < 760 || /Mobi|Android|iPhone/i.test(navigator.userAgent))) f.src = 'hero/showcase.html?quality=low';

  // mobile menu
  var btn = document.getElementById('menu-btn'), links = document.getElementById('links');
  if (btn) btn.addEventListener('click', function () { var o = links.classList.toggle('open'); btn.setAttribute('aria-expanded', o); });
  if (links) links.addEventListener('click', function (e) { if (e.target.tagName === 'A') links.classList.remove('open'); });

  // reveal
  var els = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (ents) { ents.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) { io.observe(el); });
  } else els.forEach(function (el) { el.classList.add('in'); });

  // subtle twinkling stars
  var c = document.getElementById('stars'); if (!c || !c.getContext) return;
  var ctx = c.getContext('2d'), stars = [], dpr = Math.min(window.devicePixelRatio || 1, 2);
  var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function size() {
    c.width = innerWidth * dpr; c.height = innerHeight * dpr;
    var n = Math.round(innerWidth * innerHeight / 5200); stars = [];
    for (var i = 0; i < n; i++) stars.push({ x: Math.random() * c.width, y: Math.random() * c.height, r: (Math.random() * 1.1 + .25) * dpr, a: Math.random() * .6 + .15, p: Math.random() * 6.28, s: Math.random() * .8 + .2 });
  }
  function draw(t) {
    ctx.clearRect(0, 0, c.width, c.height);
    for (var i = 0; i < stars.length; i++) { var s = stars[i], a = s.a * (still ? 1 : .65 + .35 * Math.sin(t / 1000 * s.s + s.p)); ctx.globalAlpha = a; ctx.fillStyle = i % 9 ? '#fff' : '#c7d2fe'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill(); }
    if (!still) requestAnimationFrame(draw);
  }
  size(); addEventListener('resize', size); requestAnimationFrame(draw);
})();
