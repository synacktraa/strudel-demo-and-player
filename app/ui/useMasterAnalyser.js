/**
 * Tap Strudel's master output so the equalizer reacts to whatever is playing.
 *
 * Strudel has its own `.analyze()` control, but that would mean every student
 * had to add it to their code to see the visualiser. Instead we hang an
 * AnalyserNode off superdough's `destinationGain`, the single node every voice
 * is mixed into. An analyser is a pass-through sink: reading from it does not
 * duplicate or alter the audio.
 *
 * Two timing facts drive the polling below:
 *   - `destinationGain` does not exist until the AudioContext is created, which
 *     browsers defer until the first click.
 *   - `SuperdoughOutput.reset()` throws the old node away and builds a new one,
 *     so an analyser attached to the old node goes silent. Re-attaching when the
 *     node identity changes keeps the display alive across a reset.
 */
import { useState, useEffect, useRef } from './runtime.js';

const POLL_MS = 500;

export function useMasterAnalyser({ fftSize = 2048, smoothing = 0.75 } = {}) {
  const [analyser, setAnalyser] = useState(null);
  const attachedTo = useRef(null);

  useEffect(() => {
    let timer = null;
    let cancelled = false;

    const attach = () => {
      if (cancelled) return;
      try {
        const ctrl = window.getSuperdoughAudioController?.();
        const gain = ctrl?.output?.destinationGain;
        if (gain && gain !== attachedTo.current) {
          const node = ctrl.audioContext.createAnalyser();
          node.fftSize = fftSize;
          node.smoothingTimeConstant = smoothing;
          gain.connect(node);
          attachedTo.current = gain;
          setAnalyser(node);
        }
      } catch {
        // Audio not up yet, or torn down mid-poll. Try again on the next tick.
      }
      timer = setTimeout(attach, POLL_MS);
    };

    attach();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [fftSize, smoothing]);

  return analyser;
}
