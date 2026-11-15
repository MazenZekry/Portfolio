// Typing effect
const typed = document.querySelector('.typed');
if (typed) {
  const words = typed.dataset.words.split('|');
  let w = 0, i = 0, deleting = false;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) {
    typed.textContent = words[0];
  } else {
    (function tick() {
      const word = words[w];
      typed.textContent = word.slice(0, i);
      if (!deleting && i < word.length) i++;
      else if (deleting && i > 0) i--;
      else if (!deleting) { deleting = true; return setTimeout(tick, 1600); }
      else { deleting = false; w = (w + 1) % words.length; }
      setTimeout(tick, deleting ? 40 : 80);
    })();
  }
}

// Reveal on scroll
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
  });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

document.getElementById('year').textContent = new Date().getFullYear();
