import { useEffect, useRef } from 'react';

const COLORS = ['#ffd166', '#ef476f', '#06d6a0', '#118ab2', '#f78c6b', '#c77dff'];

/**
 * Dependency-free canvas confetti. Fires one burst every time `burst`
 * increments; loops gently while `rain` is true (winner celebration).
 */
export default function Confetti({ burst = 0, rain = false }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({ particles: [], raf: 0, rain: false });

  useEffect(() => {
    stateRef.current.rain = rain;
  }, [rain]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const state = stateRef.current;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    let lastRain = 0;
    function tick(now) {
      state.raf = requestAnimationFrame(tick);
      if (state.rain && now - lastRain > 220) {
        lastRain = now;
        spawn(state.particles, Math.random() * canvas.width, -20, 6, 1);
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      state.particles = state.particles.filter((p) => p.y < canvas.height + 40 && p.life > 0);
      for (const p of state.particles) {
        p.vy += 0.12;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.life -= 1;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.min(1, p.life / 40);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
    }
    state.raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(state.raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  useEffect(() => {
    if (!burst) return;
    const canvas = canvasRef.current;
    const { particles } = stateRef.current;
    spawn(particles, canvas.width * 0.25, canvas.height * 0.35, 60, 8);
    spawn(particles, canvas.width * 0.75, canvas.height * 0.35, 60, 8);
  }, [burst]);

  return <canvas ref={canvasRef} className="confetti-canvas" aria-hidden="true" />;
}

function spawn(particles, x, y, count, power) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (0.4 + Math.random()) * power;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - power * 0.6,
      vr: (Math.random() - 0.5) * 0.3,
      rot: Math.random() * Math.PI,
      size: 6 + Math.random() * 8,
      color: COLORS[(Math.random() * COLORS.length) | 0],
      life: 160 + Math.random() * 80,
    });
  }
}
