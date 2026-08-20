/**
 * Audio-reactive equalizer.
 *
 * Bars are spaced logarithmically rather than linearly: the FFT gives equal
 * width in Hz, but pitch is logarithmic, so a linear mapping crams every
 * musical detail into the leftmost few bars and leaves the right half dead.
 *
 * Levels fall faster than they rise, which is what makes an equalizer read as
 * "percussive" rather than as noise.
 */
import { html, useRef, useEffect, prefersReducedMotion } from './runtime.js';

const BARS = 28;
const MIN_HZ = 40;
const MAX_HZ = 12000;
const RISE = 0.55; // how much of the gap to the new peak we close per frame
const FALL = 0.1;
const IDLE_MS = 200; // re-check interval once everything has settled to silence

/** Bin ranges for logarithmically spaced bars. */
function binRanges(analyser, sampleRate) {
  const nyquist = sampleRate / 2;
  const binCount = analyser.frequencyBinCount;
  const ranges = [];
  for (let i = 0; i < BARS; i++) {
    const lo = MIN_HZ * Math.pow(MAX_HZ / MIN_HZ, i / BARS);
    const hi = MIN_HZ * Math.pow(MAX_HZ / MIN_HZ, (i + 1) / BARS);
    const from = Math.max(0, Math.floor((lo / nyquist) * binCount));
    const to = Math.min(binCount - 1, Math.max(from, Math.ceil((hi / nyquist) * binCount) - 1));
    ranges.push([from, to]);
  }
  return ranges;
}

export function Equalizer({ analyser, active }) {
  const canvasRef = useRef(null);
  const levels = useRef(new Float32Array(BARS));
  const rangesRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const reduced = prefersReducedMotion();
    let raf = null;
    let idle = null;
    let data = null;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      const { width, height } = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);

      if (analyser) {
        if (!data || data.length !== analyser.frequencyBinCount) {
          data = new Uint8Array(analyser.frequencyBinCount);
          rangesRef.current = binRanges(analyser, analyser.context.sampleRate);
        }
        analyser.getByteFrequencyData(data);
      }

      const ranges = rangesRef.current;
      const gap = 2;
      const barWidth = (width - gap * (BARS - 1)) / BARS;

      for (let i = 0; i < BARS; i++) {
        let target = 0;
        if (analyser && ranges) {
          const [from, to] = ranges[i];
          let peak = 0;
          for (let b = from; b <= to; b++) peak = Math.max(peak, data[b]);
          // Lift the top end a little; high frequencies carry less energy.
          const tilt = 1 + (i / BARS) * 0.6;
          target = Math.min(1, (peak / 255) * tilt);
        }
        const current = levels.current[i];
        levels.current[i] = target > current ? current + (target - current) * RISE : current * (1 - FALL);

        const level = levels.current[i];
        // A resting bar still draws a sliver, so an idle equalizer reads as a
        // component waiting for sound rather than as an empty box.
        const barHeight = Math.max(3, level * height);
        const x = i * (barWidth + gap);
        const y = height - barHeight;

        const grad = ctx.createLinearGradient(0, height, 0, 0);
        grad.addColorStop(0, 'rgba(195, 232, 141, 0.95)');
        grad.addColorStop(0.6, 'rgba(160, 214, 180, 0.95)');
        grad.addColorStop(1, 'rgba(199, 146, 234, 0.95)');
        ctx.fillStyle = grad;
        ctx.globalAlpha = level < 0.02 ? 0.4 : 1;

        const r = Math.min(barWidth / 2, 2);
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, [r, r, 0, 0]);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      return levels.current.some((l) => l > 0.005);
    };

    const loop = () => {
      const moving = draw();
      if (reduced) return; // one honest frame, then stop
      // Idle in a cheap timer instead of a 60fps loop. These are school
      // laptops, and a notebook left open between sessions shouldn't spin a
      // core for nothing.
      if (moving || active) {
        raf = requestAnimationFrame(loop);
      } else {
        idle = setTimeout(loop, IDLE_MS);
      }
    };

    // Assigning canvas.width/height resets the bitmap to transparent, so a
    // resize must repaint immediately. Without this the equalizer blanks until
    // the next tick - and under reduced motion, where we only ever paint one
    // frame, it would stay blank for good.
    resize();
    draw();

    const observer = new ResizeObserver(() => {
      resize();
      draw();
    });
    observer.observe(canvas);

    loop();
    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (idle) clearTimeout(idle);
      observer.disconnect();
    };
  }, [analyser, active]);

  return html`
    <div class=${`equalizer ${active ? 'is-active' : ''}`} aria-hidden="true">
      <canvas ref=${canvasRef}></canvas>
    </div>
  `;
}
