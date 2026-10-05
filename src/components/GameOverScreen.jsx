import { Home, RotateCcw, ShoppingBag, Footprints, Trophy } from 'lucide-react';
import { CoinIcon } from './CoinIcon';

export function GameOverScreen({ result, onRetry, onMenu, onShop }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-jungle-950/55 p-4 backdrop-blur-md">
      <div className="panel-stone gold-border w-full max-w-md rounded-3xl p-6 text-center sm:p-8 animate-rise">
        <p className="font-display text-xs font-bold tracking-[0.5em] text-ember-500 uppercase">
          The temple claims you
        </p>
        <h2 className="font-display gold-text mt-2 text-4xl font-black sm:text-5xl">RUN OVER</h2>

        {result.isNewBest && (
          <div className="mx-auto mt-4 inline-flex animate-pulse items-center gap-2 rounded-full bg-gradient-to-r from-ember-500 to-gold-500 px-4 py-1.5 text-xs font-extrabold tracking-widest text-jungle-950 uppercase">
            <Trophy size={14} /> New Record!
          </div>
        )}

        <div className="mt-5 rounded-2xl border border-gold-400/20 bg-black/25 py-4">
          <div className="text-[10px] font-bold tracking-[0.45em] text-amber-100/45 uppercase">Score</div>
          <div className="font-display gold-text text-5xl font-black tabular-nums">{result.score.toLocaleString()}</div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.04] px-2 py-3">
            <div className="flex items-center justify-center gap-1.5">
              <CoinIcon size={16} />
              <span className="text-lg font-extrabold text-amber-50 tabular-nums">{result.coins}</span>
            </div>
            <div className="mt-1 text-[9px] tracking-[0.25em] text-amber-100/45 uppercase">Coins</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.04] px-2 py-3">
            <div className="flex items-center justify-center gap-1.5 text-amber-50">
              <Footprints size={16} className="text-gold-400" />
              <span className="text-lg font-extrabold tabular-nums">{result.dist}m</span>
            </div>
            <div className="mt-1 text-[9px] tracking-[0.25em] text-amber-100/45 uppercase">Distance</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.04] px-2 py-3">
            <div className="flex items-center justify-center gap-1.5 text-amber-50">
              <Trophy size={16} className="text-gold-400" />
              <span className="text-lg font-extrabold tabular-nums">{result.best.toLocaleString()}</span>
            </div>
            <div className="mt-1 text-[9px] tracking-[0.25em] text-amber-100/45 uppercase">Best</div>
          </div>
        </div>

        <p className="mt-4 text-xs text-amber-100/50">
          {result.coins} coins were added to your pouch — spend them at the Trading Post.
        </p>

        <div className="mt-5 flex flex-col gap-3">
          <button onClick={onRetry} className="btn-gold flex w-full items-center justify-center gap-2 rounded-xl py-3.5">
            <RotateCcw size={20} />
            <span className="font-display text-lg font-extrabold tracking-[0.18em]">RUN AGAIN</span>
          </button>
          <div className="flex gap-3">
            <button onClick={onMenu} className="btn-ghost flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold tracking-widest text-gold-200 uppercase">
              <Home size={17} /> Menu
            </button>
            <button onClick={onShop} className="btn-ghost flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold tracking-widest text-gold-200 uppercase">
              <ShoppingBag size={17} /> Shop
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
