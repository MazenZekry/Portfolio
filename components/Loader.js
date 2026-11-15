/*
 * Intro loader: "Hey!" with two orbiting circles in the middle of the screen.
 * When loading is done, both circles grow together like masks,
 * showing the page inside them until they fill the screen.
 * Colors follow the site's blue palette.
 */
export function Loader({
  text = 'Hey!',
  background = '#020714',
  circleA = '#1e3fd8', // deep blue
  circleB = '#e6efff', // pale blue-white
  holdMs = 1500, // circles orbiting with the text
  mergeMs = 300, // the text fades out before the reveal
  revealMs = 1300 // the circle grows and reveals the page inside it
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
    const rt = mt - mergeMs; // time into the reveal

    // circle positions: orbiting, then frozen where they are when the reveal starts
    const angle = (Math.min(t, holdMs + mergeMs) / 1000) * Math.PI * 1.15;
    const d = r * 0.62;
    const A = { x: cx + Math.cos(angle) * d, y: cy + Math.sin(angle) * d, color: circleA };
    const B = { x: cx - Math.cos(angle) * d, y: cy - Math.sin(angle) * d, color: circleB };
    const order = Math.sin(angle) > 0 ? [A, B] : [B, A]; // back to front

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, w, h);

    if (rt < 0) {
      // Orbit with the text; the text fades out just before the reveal.
      const pop = easeOut(clamp01(t / 450));
      for (const c of order) circle(c.x, c.y, r * pop, c.color);
      const textFade = clamp01((t - 150) / 350) * (1 - clamp01(mt / mergeMs));
      if (textFade > 0) {
        ctx.globalAlpha = textFade;
        ctx.fillStyle = '#f6f8ff';
        ctx.font = `600 ${Math.round(r * 0.6)}px ${fontFamily}`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, cx - r * 0.75, cy);
        ctx.globalAlpha = 1;
      }
    } else {
      // Reveal: both circles become windows onto the page and grow together.
      const k = easeInOut(clamp01(rt / revealMs));
      const reach = c => Math.max(Math.hypot(c.x, c.y), Math.hypot(w - c.x, c.y), Math.hypot(c.x, h - c.y), Math.hypot(w - c.x, h - c.y)) + 4;
      const holes = order.map(c => ({ ...c, radius: r + (reach(c) - r) * k }));
      ctx.globalCompositeOperation = 'destination-out';
      for (const c of holes) circle(c.x, c.y, c.radius, '#000');
      ctx.globalCompositeOperation = 'source-over';
      // glowing rims in each circle's own color, fading as they grow
      const rim = 1 - k;
      if (rim > 0.01) {
        ctx.globalAlpha = rim;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 24;
        for (const c of holes) {
          ctx.strokeStyle = c.color;
          ctx.shadowColor = circleA;
          ctx.beginPath();
          ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
      if (rt >= revealMs) {
        finish();
        return;
      }
    }
    requestAnimationFrame(frame);
  };

  const finish = () => {
    done = true;
    window.removeEventListener('resize', resize);
    canvas.remove();
    root.classList.remove('is-loading', 'loader-active');
  };

  requestAnimationFrame(frame);
}

export default Loader;
