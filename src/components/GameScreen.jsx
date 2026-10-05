import { useEffect, useRef, useState } from 'react';
import { Feather, Magnet, Pause, Play, Shield, Volume2, VolumeX, X } from 'lucide-react';
import { CoinIcon } from './CoinIcon';
import { createPhaserGame } from '../game/phaserGame';
import { sound } from '../game/audio';

export function GameScreen({ skin, boosts, magnetDur, onGameOver, onQuit }) {
  const mountRef = useRef(null);
  const gameRef = useRef(null);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(sound.isMuted);
  const [countText, setCountText] = useState('');

  // HUD refs (updated directly by the Phaser scene, no re-render)
  const scoreRef = useRef(null);
  const coinRef = useRef(null);
  const distRef = useRef(null);
  const comboWrapRef = useRef(null);
  const comboTextRef = useRef(null);
  const magnetWrapRef = useRef(null);
  const magnetBarRef = useRef(null);
  const shieldRef = useRef(null);
  const boostWrapRef = useRef(null);
  const boostBarRef = useRef(null);

  const overRef = useRef(onGameOver);
  overRef.current = onGameOver;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    sound.resume();

    const onHud = (h) => {
      if (scoreRef.current) scoreRef.current.textContent = h.score.toLocaleString();
      if (coinRef.current) coinRef.current.textContent = h.coins.toLocaleString();
      if (distRef.current) distRef.current.textContent = `${h.dist}m`;
      if (comboWrapRef.current) {
        const on = h.comboActive;
        comboWrapRef.current.style.opacity = on ? '1' : '0';
        comboWrapRef.current.style.transform = on ? 'scale(1)' : 'scale(0.6)';
        if (on && comboTextRef.current) comboTextRef.current.textContent = `x${h.combo}`;
      }
      if (magnetWrapRef.current) {
        magnetWrapRef.current.style.display = h.magnetFrac > 0 ? 'flex' : 'none';
        if (magnetBarRef.current) magnetBarRef.current.style.width = `${h.magnetFrac * 100}%`;
      }
      if (shieldRef.current) {
        shieldRef.current.style.display = h.shieldOn ? 'flex' : 'none';
      }
      if (boostWrapRef.current) {
        boostWrapRef.current.style.display = h.boostFrac > 0 ? 'flex' : 'none';
        if (boostBarRef.current) boostBarRef.current.style.width = `${h.boostFrac * 100}%`;
      }
      setCountText((prev) => (prev === h.countText ? prev : h.countText));
    };

    const game = createPhaserGame(mount, {
      skin,
      boosts,
      magnetDur,
      onHud,
      onGameOver: (r) => overRef.current(r),
    });
    gameRef.current = game;

    const esc = (e) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        setPaused((p) => {
          game.runScene?.setPaused(!p);
          return !p;
        });
      }
    };
    window.addEventListener('keydown', esc);

    return () => {
      window.removeEventListener('keydown', esc);
      game.destroy(true);
      gameRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePause = () => {
    setPaused((p) => {
      gameRef.current?.runScene?.setPaused(!p);
      return !p;
    });
  };

  const toggleMute = () => {
    const m = !muted;
    setMuted(m);
    sound.setMuted(m);
  };

  return (
    <div className="no-select relative h-full w-full overflow-hidden bg-jungle-950">
      {/* Phaser mounts its canvas here */}
      <div ref={mountRef} className="absolute inset-0" />

      {/* HUD top */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-3 sm:p-5">
        <div className="flex flex-col gap-2">
          <div className="panel-stone gold-border rounded-2xl px-4 py-2.5">
            <div className="text-[9px] font-bold tracking-[0.4em] text-amber-100/50 uppercase">Score</div>
            <span ref={scoreRef} className="text-2xl leading-none font-extrabold text-gold-200 tabular-nums sm:text-3xl">
              0
            </span>
          </div>
          <div className="panel-stone gold-border flex items-baseline gap-2 rounded-xl px-4 py-1.5">
            <span className="text-[9px] font-bold tracking-[0.3em] text-amber-100/50 uppercase">Dist</span>
            <span ref={distRef} className="text-sm font-extrabold text-amber-50 tabular-nums">0m</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="panel-stone gold-border flex items-center gap-2 rounded-2xl px-4 py-2.5">
            <CoinIcon size={22} />
            <span ref={coinRef} className="text-xl leading-none font-extrabold text-gold-200 tabular-nums">0</span>
          </div>
          <button
            onClick={togglePause}
            className="btn-ghost panel-stone pointer-events-auto flex h-11 w-11 items-center justify-center rounded-2xl text-gold-200"
            aria-label="Pause"
          >
            <Pause size={18} />
          </button>
        </div>
      </div>

      {/* combo badge */}
      <div className="pointer-events-none absolute inset-x-0 top-24 z-10 flex justify-center">
        <div
          ref={comboWrapRef}
          className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-ember-500 to-gold-500 px-4 py-1.5 text-jungle-950 shadow-[0_0_24px_rgba(255,122,60,0.7)] transition-all duration-200"
          style={{ opacity: 0, transform: 'scale(0.6)' }}
        >
          <span className="text-[10px] font-extrabold tracking-[0.3em] uppercase">Combo</span>
          <span ref={comboTextRef} className="text-lg font-black leading-none">x2</span>
        </div>
      </div>

      {/* countdown overlay */}
      {countText && (
        <div className="pointer-events-none absolute inset-x-0 top-[16vh] z-10 flex flex-col items-center">
          <div
            key={countText}
            className="countdown-pop font-display gold-text text-5xl font-black tracking-widest drop-shadow-[0_8px_30px_rgba(0,0,0,0.85)] sm:text-7xl"
          >
            {countText}
          </div>
          {countText === 'GET READY' && (
            <div className="panel-stone gold-border mt-5 rounded-full px-5 py-2 text-[11px] font-bold tracking-widest text-amber-100/80 uppercase sm:text-xs">
              Arrows / WASD or swipe — jump · slide · dodge
            </div>
          )}
        </div>
      )}

      {/* active powerups */}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex flex-col items-center gap-2">
        <div ref={boostWrapRef} className="hidden items-center gap-2">
          <Feather size={15} className="text-amber-300" />
          <div className="h-2 w-36 overflow-hidden rounded-full bg-black/50 ring-1 ring-amber-300/40">
            <div ref={boostBarRef} className="h-full rounded-full bg-gradient-to-r from-amber-300 to-ember-500" />
          </div>
        </div>
        <div ref={magnetWrapRef} className="hidden items-center gap-2">
          <Magnet size={15} className="text-cyan-300" />
          <div className="h-2 w-36 overflow-hidden rounded-full bg-black/50 ring-1 ring-cyan-300/40">
            <div ref={magnetBarRef} className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-cyan-200" />
          </div>
        </div>
        <div
          ref={shieldRef}
          className="hidden items-center gap-1.5 rounded-full bg-cyan-400/15 px-3 py-1 text-[11px] font-extrabold tracking-widest text-cyan-200 ring-1 ring-cyan-300/50 uppercase"
        >
          <Shield size={13} /> Shielded
        </div>
      </div>

      {/* pause overlay */}
      {paused && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-jungle-950/70 backdrop-blur-md">
          <div className="panel-stone gold-border w-full max-w-xs rounded-3xl p-7 text-center animate-rise sm:max-w-sm">
            <h2 className="font-display gold-text text-3xl font-black tracking-widest">PAUSED</h2>
            <p className="mt-1 text-xs text-amber-100/50">The ruins wait for no one… except now.</p>
            <div className="mt-6 flex flex-col gap-3">
              <button onClick={togglePause} className="btn-gold flex items-center justify-center gap-2 rounded-xl py-3.5">
                <Play size={19} className="fill-[#3a2404]" />
                <span className="font-display font-extrabold tracking-[0.18em]">RESUME</span>
              </button>
              <div className="flex gap-3">
                <button
                  onClick={toggleMute}
                  className="btn-ghost flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold tracking-widest text-gold-200 uppercase"
                >
                  {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  {muted ? 'Muted' : 'Sound'}
                </button>
                <button
                  onClick={onQuit}
                  className="btn-ghost flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold tracking-widest text-gold-200 uppercase"
                >
                  <X size={16} /> Quit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
