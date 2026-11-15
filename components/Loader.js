/*
 * Intro loader: "Hey!" with two orbiting circles, then the screen opens up
 * through growing round holes that reveal the page underneath.
 * Colors follow the site's blue palette.
 */
export function Loader({
  text = 'Hey!',
  background = '#020714',
  circleA = '#1e3fd8', // deep blue (the original orange circle)
  circleB = '#e6efff', // pale blue-white
  holdMs = 1500,
  revealMs = 1700,
  holes = 34
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
  let dpr = 1;
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener('resize', resize);

  // The pair of circles drifts toward the pointer if it moves, otherwise sits centered.
  const target = { x: w / 2, y: h / 2 };
  const pos = { x: w / 2, y: h / 2 };
  const onMove = e => {
    target.x = e.clientX;
    target.y = e.clientY;
  };
  window.addEventListener('pointermove', onMove, { passive: true });

  // Holes: random spots, staggered start, each grows from 0 to a big radius.
  const diag = Math.hypot(w, h);
  const spots = Array.from({ length: holes }, (_, i) => {
    const early = i < 6;
    return {
      x: early ? w / 2 + (Math.random() - 0.5) * w * 0.5 : Math.random() * w,
      y: early ? h / 2 + (Math.random() - 0.5) * h * 0.5 : Math.random() * h,
      delay: (early ? 0 : 0.15 + Math.random() * 0.45) * revealMs,
      size: (0.18 + Math.random() * 0.22) * diag
    };
  });

  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const fontFamily = getComputedStyle(document.body).fontFamily || 'Inter, sans-serif';
  const start = performance.now();
  let done = false;

  let first = true;
  const frame = now => {
    if (done) return;
    if (first) {
      // the canvas now covers the page, so the static CSS cover can go
      first = false;
      root.classList.add('loader-active');
      root.classList.remove('is-loading');
    }
    const t = now - start;
    const r = Math.max(40, Math.min(w, h) * 0.07); // circle radius

    pos.x += (target.x - pos.x) * 0.12;
    pos.y += (target.y - pos.y) * 0.12;

    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, w, h);

    // Reveal phase: punch growing holes through the backdrop.
    const rt = t - holdMs;
    if (rt > 0) {
      ctx.globalCompositeOperation = 'destination-out';
      for (const s of spots) {
        const k = Math.min(1, Math.max(0, (rt - s.delay) / (revealMs * 0.7)));
        if (k <= 0) continue;
        const e = easeOut(k);
        ctx.globalAlpha = Math.min(1, 0.35 + k * 1.4); // holes start see-through, then fully open
        ctx.beginPath();
        ctx.arc(s.x, s.y, e * s.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    // Intro: circles pop in, orbit each other, text sits to their left.
    const intro = easeOut(Math.min(1, t / 450));
    const fade = rt > 0 ? Math.max(0, 1 - rt / (revealMs * 0.45)) : 1;
    if (fade > 0) {
      const angle = (t / 1000) * Math.PI * 1.15;
      const d = r * 0.62;
      const ax = pos.x + Math.cos(angle) * d;
      const ay = pos.y + Math.sin(angle) * d;
      const bx = pos.x - Math.cos(angle) * d;
      const by = pos.y - Math.sin(angle) * d;
      const scale = intro * (rt > 0 ? 1 + easeInOut(Math.min(1, rt / revealMs)) * 0.4 : 1);
      ctx.globalAlpha = fade;
      // draw the one "behind" first so they swap depth as they orbit
      const order = Math.sin(angle) > 0 ? [[circleA, ax, ay], [circleB, bx, by]] : [[circleB, bx, by], [circleA, ax, ay]];
      for (const [color, x, y] of order) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, r * scale, 0, Math.PI * 2);
        ctx.fill();
      }
      const textFade = Math.min(1, Math.max(0, (t - 150) / 350)) * (rt > 0 ? Math.max(0, 1 - rt / 250) : 1);
      if (textFade > 0) {
        ctx.globalAlpha = textFade;
        ctx.fillStyle = '#f6f8ff';
        ctx.font = `600 ${Math.round(r * 0.6)}px ${fontFamily}`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, pos.x - r * 0.75, pos.y);
      }
      ctx.globalAlpha = 1;
    }

    if (rt > revealMs * 1.05) {
      finish();
      return;
    }
    requestAnimationFrame(frame);
  };

  const finish = () => {
    done = true;
    window.removeEventListener('resize', resize);
    window.removeEventListener('pointermove', onMove);
    canvas.remove();
    root.classList.remove('is-loading', 'loader-active');
  };

  requestAnimationFrame(frame);
}

export default Loader;
