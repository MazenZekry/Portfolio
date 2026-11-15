/*
 * Intro loader: "Hey!" with two orbiting circles in the middle of the screen.
 * When loading is done, both circles grow together and sink into the page's
 * dark background; near the end the loader fades and the page settles in.
 * Colors follow the site's blue palette.
 */
export function Loader({
  text = 'Hey!',
  background = '#020714',
  circleA = '#1e3fd8', // deep blue
  circleB = '#e6efff', // pale blue-white
  holdMs = 1500, // circles orbiting with the text
  mergeMs = 300, // the text fades out before the reveal
  revealMs = 950 // both circles grow, darkening to black, until they cover the screen
} = {}) {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  if (reduce) {
    root.classList.remove('is-loading');
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.className = 'site-loader';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  let w = 0;
  let h = 0;
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener('resize', resize);

  const clamp01 = v => Math.min(1, Math.max(0, v));
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const fontFamily = getComputedStyle(document.body).fontFamily || 'Inter, sans-serif';
  const start = performance.now();
  let done = false;
  let first = true;

  const circle = (x, y, radius, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  };

  // mix a hex color toward the page background: k = 0 keeps it, k = 1 is the background
  const toRgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const bgRgb = toRgb(background);
  const darken = (hex, k) => `rgb(${toRgb(hex).map((v, i) => Math.round(v + (bgRgb[i] - v) * k)).join(',')})`;
  let revealing = false;
  // strong ease-in-out for on-screen movement
  const easeInOutStrong = t => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2);

  const frame = now => {
    if (done) return;
    if (first) {
      // the canvas now covers the page, so the static CSS cover can go
      first = false;
      root.classList.add('loader-active');
      root.classList.remove('is-loading');
    }
    const t = now - start;
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.max(40, Math.min(w, h) * 0.07);
    const mt = t - holdMs; // time into the text fade-out
    const gt = mt - mergeMs; // time into the grow

    // 3D orbit: the two circles revolve around each other in depth, seen slightly from above.
    // z is depth (+1 = closest). Closer = bigger and brighter, farther = smaller and dimmer.
    // They change front/back only at z = 0, when they sit side by side without touching,
    // so one circle visibly travels behind the other instead of popping or fading.
    const angle = (Math.min(t, holdMs + mergeMs) / 1000) * Math.PI * 1.15;
    const D = r * 1.06; // half the gap at the sides: just over one radius, so no overlap at the swap
    const z = Math.sin(angle);
    const persp = 0.18; // size change with depth
    const tiltY = 0.5; // how round the path looks (1 = circle, 0 = flat line)
    const A = { x: cx + Math.cos(angle) * D, y: cy + z * D * tiltY, s: 1 + z * persp, dim: Math.max(0, -z) * 0.22, color: circleA };
    const B = { x: cx - Math.cos(angle) * D, y: cy - z * D * tiltY, s: 1 - z * persp, dim: Math.max(0, z) * 0.22, color: circleB };
    const order = A.s < B.s ? [A, B] : [B, A]; // farther first, closer on top
    const reach = c => Math.max(Math.hypot(c.x, c.y), Math.hypot(w - c.x, c.y), Math.hypot(c.x, h - c.y), Math.hypot(w - c.x, h - c.y)) + 4;

    ctx.clearRect(0, 0, w, h);
    ctx.globalAlpha = 1;
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, w, h);

    const pop = 0.6 + 0.4 * easeOut(clamp01(t / 450)); // never grow from nothing
    const k = gt > 0 ? easeInOutStrong(clamp01(gt / revealMs)) : 0;
    ctx.globalAlpha = gt > 0 ? 1 : clamp01(t / 250);
    const dark = Math.min(1, k * 1.25); // the circles sink into the page's dark background as they grow
    for (const c of order) {
      const radius = r * pop * c.s + (reach(c) - r * c.s) * k;
      circle(c.x, c.y, radius, darken(c.color, Math.max(dark, c.dim)));
    }
    ctx.globalAlpha = 1;

    const textFade = clamp01((t - 150) / 350) * (1 - clamp01(mt / mergeMs));
    if (textFade > 0) {
      ctx.globalAlpha = textFade;
      ctx.fillStyle = '#f6f8ff';
      ctx.font = `600 ${Math.round(r * 0.6)}px ${fontFamily}`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, cx - D - r * 1.3, cy);
      ctx.globalAlpha = 1;
    }

    // Overlap: start showing the page while the circles finish covering the screen,
    // so there is never a moment stuck on a dark screen.
    if (!revealing && gt >= revealMs * 0.72) reveal();
    if (gt >= revealMs) {
      done = true;
      return;
    }
    requestAnimationFrame(frame);
  };

  // Fade the loader away; the page is already drawn underneath, so it shows instantly.
  const reveal = () => {
    revealing = true;
    window.removeEventListener('resize', resize);
    canvas.classList.add('is-leaving');
    root.classList.remove('is-loading', 'loader-active');
    let removed = false;
    const remove = () => {
      if (removed) return;
      removed = true;
      done = true;
      canvas.remove();
    };
    canvas.addEventListener('transitionend', remove, { once: true });
    setTimeout(remove, 800);
  };

  requestAnimationFrame(frame);
}

export default Loader;
