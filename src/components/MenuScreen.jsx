import {
  Feather,
  Footprints,
  Magnet,
  Play,
  Shield,
  ShoppingBag,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  MousePointerClick,
  Keyboard,
} from 'lucide-react';
import { CoinIcon } from './CoinIcon';
import { CONSUMABLES } from '../game/profile';

const BOOST_ICONS = {
  shield: Shield,
  magnet: Magnet,
  boost: Feather,
  multiplier: Sparkles,
};

export function MenuScreen({ profile, loadout, onToggleBoost, onPlay, onShop, onToggleMute }) {
  const ownedBoosts = CONSUMABLES.filter((c) => profile.inventory[c.id] > 0);

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-cover bg-center ken-burns"
        style={{ backgroundImage: "url('images/menu-bg.jpg')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-jungle-950/70 via-jungle-950/35 to-jungle-950/95" />
      <div className="absolute inset-0 bg-gradient-to-r from-jungle-950/55 via-transparent to-jungle-950/55" />

      {/* falling coins */}
      <div className="pointer-events-none absolute inset-0 hidden sm:block">
        {[12, 30, 52, 71, 88].map((left, i) => (
          <div
            key={left}
            className="absolute animate-coin-drop"
            style={{ left: `${left}%`, animationDelay: `${i * 1.15}s`, animationDuration: `${4 + (i % 3)}s` }}
          >
            <CoinIcon size={i % 2 ? 20 : 28} className="opacity-80" />
          </div>
        ))}
      </div>

      {/* top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-4 sm:px-8 sm:pt-6">
        <div className="panel-stone gold-border flex items-center gap-2 rounded-full py-2 pl-3 pr-5">
          <CoinIcon size={24} />
          <span className="text-lg font-bold tracking-wide text-gold-200 tabular-nums">
            {profile.coins.toLocaleString()}
          </span>
        </div>
        <button
          onClick={onToggleMute}
          className="panel-stone gold-border btn-ghost flex h-11 w-11 items-center justify-center rounded-full text-gold-200"
          aria-label="Toggle sound"
        >
          {profile.muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
      </div>

      {/* main column */}
      <div className="relative z-10 flex h-[calc(100%-88px)] flex-col items-center justify-center px-4">
        <p className="font-display mb-1 text-[11px] font-semibold tracking-[0.55em] text-gold-300/90 uppercase sm:text-xs animate-rise">
          The idol has awakened
        </p>
        <h1
          className="font-display text-center text-5xl leading-[0.95] font-black sm:text-7xl lg:text-8xl animate-rise"
          style={{ animationDelay: '0.06s' }}
        >
          <span className="gold-text drop-shadow-[0_6px_24px_rgba(0,0,0,0.8)]">TEMPLE</span>
          <br />
          <span className="shimmer-text drop-shadow-[0_6px_24px_rgba(0,0,0,0.8)]">ESCAPE</span>
        </h1>
        <p
          className="mt-4 max-w-md text-center text-sm text-amber-100/70 sm:text-base animate-rise"
          style={{ animationDelay: '0.12s' }}
        >
          Sprint the endless ruins, vault broken stones, duck the cursed branches —
          and grab every coin on your way out.
        </p>

        {/* play */}
        <button
          onClick={onPlay}
          className="btn-gold group mt-8 flex items-center gap-3 rounded-2xl px-14 py-4 animate-pulse-glow animate-rise"
          style={{ animationDelay: '0.18s' }}
        >
          <Play size={28} className="fill-[#3a2404] transition-transform group-hover:scale-125" />
          <span className="font-display text-2xl font-extrabold tracking-[0.2em]">RUN</span>
        </button>

        <div className="mt-4 flex items-center gap-3 animate-rise" style={{ animationDelay: '0.22s' }}>
          <button
            onClick={onShop}
            className="btn-ghost flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold tracking-widest text-gold-200 uppercase"
          >
            <ShoppingBag size={18} />
            Trading Post
          </button>
        </div>

        {/* boosts loadout */}
        <div className="mt-7 flex flex-col items-center gap-2 animate-rise" style={{ animationDelay: '0.26s' }}>
          <span className="text-[10px] font-bold tracking-[0.4em] text-amber-100/50 uppercase">
            Charm loadout — tap to arm for the next run
          </span>
          <div className="flex items-center gap-3">
            {CONSUMABLES.map((c) => {
              const Icon = BOOST_ICONS[c.id];
              const count = profile.inventory[c.id];
              const active = loadout[c.id] && count > 0;
              return (
                <button
                  key={c.id}
                  onClick={() => onToggleBoost(c.id)}
                  disabled={count === 0}
                  title={`${c.name} — ${c.tagline}`}
                  className={`relative flex h-14 w-14 items-center justify-center rounded-full transition-all duration-150 sm:h-16 sm:w-16 ${
                    active
                      ? 'bg-gradient-to-b from-gold-300 to-gold-600 text-[#3a2404] shadow-[0_0_26px_-2px_rgba(242,185,60,0.8)] scale-105'
                      : count > 0
                        ? 'panel-stone gold-border text-gold-200 hover:scale-105'
                        : 'rounded-full border border-white/10 bg-white/[0.03] text-white/20'
                  }`}
                >
                  <Icon size={24} />
                  {count > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-ember-500 px-1 text-[11px] font-extrabold text-white shadow-md">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {ownedBoosts.length === 0 && (
            <span className="text-[11px] text-amber-100/40">
              No charms yet — earn coins and visit the Trading Post.
            </span>
          )}
        </div>

        {/* stats */}
        <div
          className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-5 animate-rise"
          style={{ animationDelay: '0.32s' }}
        >
          {[
            { icon: Trophy, label: 'Best Score', value: profile.highScore.toLocaleString() },
            { icon: Footprints, label: 'Total Runs', value: profile.totalRuns.toLocaleString() },
            { icon: null, label: 'Lifetime Coins', value: profile.lifetimeCoins.toLocaleString() },
          ].map((s) => (
            <div key={s.label} className="panel-stone gold-border flex items-center gap-3 rounded-2xl px-5 py-3">
              {s.icon ? (
                <s.icon size={20} className="text-gold-400" />
              ) : (
                <CoinIcon size={20} />
              )}
              <div>
                <div className="text-sm leading-none font-extrabold text-amber-50 tabular-nums">{s.value}</div>
                <div className="mt-1 text-[10px] tracking-[0.25em] text-amber-100/50 uppercase">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* controls hint */}
        <div
          className="mt-7 flex items-center gap-5 text-[11px] font-medium text-amber-100/45 animate-rise"
          style={{ animationDelay: '0.36s' }}
        >
          <span className="flex items-center gap-2">
            <Keyboard size={15} /> Arrows / WASD
          </span>
          <span className="h-3 w-px bg-amber-100/20" />
          <span className="flex items-center gap-2">
            <MousePointerClick size={15} /> Swipe or tap
          </span>
        </div>
      </div>
    </div>
  );
}
