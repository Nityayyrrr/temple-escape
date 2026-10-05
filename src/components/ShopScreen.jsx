import {
  ArrowLeft,
  Check,
  Compass,
  Feather,
  Lock,
  Magnet,
  Shield,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { CoinIcon } from './CoinIcon';
import { CONSUMABLES, MAGNET_MASTERY_PRICES, SKINS, magnetDuration } from '../game/profile';
import { sound } from '../game/audio';

const BOOST_ICONS = {
  shield: Shield,
  magnet: Magnet,
  boost: Feather,
  multiplier: Sparkles,
};

export function ShopScreen({
  profile,
  onBuyConsumable,
  onBuyMastery,
  onBuySkin,
  onEquipSkin,
  onBack,
}) {
  const masteryMax = profile.magnetMastery >= 3;
  const masteryPrice = masteryMax ? null : MAGNET_MASTERY_PRICES[profile.magnetMastery];

  return (
    <div className="relative min-h-full w-full overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('images/menu-bg.jpg')" }}
      />
      <div className="absolute inset-0 bg-jungle-950/82" />
      <div className="absolute inset-0 bg-gradient-to-b from-jungle-950/60 via-transparent to-jungle-950" />

      <div className="relative z-10 mx-auto max-w-5xl px-4 pb-20 pt-5 sm:px-8">
        {/* header */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={onBack}
            className="btn-ghost panel-stone flex h-11 w-11 items-center justify-center rounded-full text-gold-200"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <ShoppingBag size={26} className="text-gold-400" />
            <h1 className="font-display gold-text text-2xl font-black tracking-[0.12em] sm:text-4xl">
              TRADING POST
            </h1>
          </div>
          <div className="panel-stone gold-border flex items-center gap-2 rounded-full py-2 pl-3 pr-4">
            <CoinIcon size={22} />
            <span className="text-base font-extrabold text-gold-200 tabular-nums sm:text-lg">
              {profile.coins.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-4 rounded-2xl border border-gold-400/15 bg-black/25 p-3 sm:p-4">
          <img
            src="images/idol.png"
            alt="Cursed golden idol"
            className="h-16 w-16 rounded-xl object-cover sm:h-20 sm:w-20 animate-float"
          />
          <p className="text-xs text-amber-100/70 sm:text-sm">
            <span className="font-bold text-gold-300">The Merchant whispers:</span> every charm
            bought with coins stolen from the ruins. Arm them before a run from the main gate —
            and may the jungle forgive you.
          </p>
        </div>

        {/* charms */}
        <SectionTitle title="Charms" sub="Consumables — arm from the main menu" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CONSUMABLES.map((c) => {
            const Icon = BOOST_ICONS[c.id];
            const owned = profile.inventory[c.id];
            const afford = profile.coins >= c.price;
            return (
              <div key={c.id} className="card-hover panel-stone gold-border relative flex flex-col rounded-2xl p-5">
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-b from-gold-400/25 to-gold-600/10 text-gold-300">
                    <Icon size={24} />
                  </div>
                  {owned > 0 && (
                    <span className="rounded-full bg-ember-500 px-2.5 py-1 text-[11px] font-extrabold text-white">
                      OWNED ×{owned}
                    </span>
                  )}
                </div>
                <h3 className="font-display mt-3 text-lg font-bold text-amber-50">{c.name}</h3>
                <p className="text-[11px] font-bold tracking-widest text-gold-400/90 uppercase">{c.tagline}</p>
                <p className="mt-2 flex-1 text-xs leading-relaxed text-amber-100/60">{c.desc}</p>
                <button
                  onClick={() => onBuyConsumable(c.id)}
                  className={`mt-4 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-extrabold tracking-wider ${
                    afford ? 'btn-gold' : 'cursor-not-allowed border border-white/10 bg-white/5 text-white/35'
                  }`}
                >
                  <CoinIcon size={17} />
                  {c.price.toLocaleString()}
                </button>
              </div>
            );
          })}
        </div>

        {/* upgrades */}
        <SectionTitle title="Relic Upgrades" sub="Permanent power" />
        <div className="card-hover panel-stone gold-border flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center sm:p-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-cyan-400/20 to-cyan-600/10 text-cyan-300">
            <Compass size={24} />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-lg font-bold text-amber-50">Magnet Mastery</h3>
            <p className="text-xs text-amber-100/60">
              Magnet charms and pickups last longer. Currently {magnetDuration(profile.magnetMastery)}s.
            </p>
            <div className="mt-2 flex items-center gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`h-2.5 w-12 rounded-full transition-colors ${
                    i < profile.magnetMastery
                      ? 'bg-gradient-to-r from-gold-400 to-ember-500 shadow-[0_0_10px_rgba(242,185,60,0.6)]'
                      : 'bg-white/10'
                  }`}
                />
              ))}
              <span className="ml-1 text-[11px] font-bold text-amber-100/50">
                LV {profile.magnetMastery}/3
              </span>
            </div>
          </div>
          <button
            onClick={onBuyMastery}
            disabled={masteryMax || profile.coins < (masteryPrice ?? Infinity)}
            className={`flex shrink-0 items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-extrabold tracking-wider ${
              masteryMax
                ? 'border border-gold-400/30 bg-gold-400/10 text-gold-300'
                : profile.coins >= (masteryPrice ?? 0)
                  ? 'btn-gold'
                  : 'cursor-not-allowed border border-white/10 bg-white/5 text-white/35'
            }`}
          >
            {masteryMax ? (
              <>MASTERED</>
            ) : (
              <>
                <CoinIcon size={17} />
                {masteryPrice?.toLocaleString()}
              </>
            )}
          </button>
        </div>

        {/* skins */}
        <SectionTitle title="Legendary Runners" sub="Wear your legend" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SKINS.map((s) => {
            const owned = profile.skinsOwned.includes(s.id);
            const equipped = profile.selectedSkin === s.id;
            return (
              <div key={s.id} className="card-hover panel-stone gold-border flex flex-col rounded-2xl p-5">
                {/* mini character swatch */}
                <div
                  className="relative flex h-24 items-center justify-center overflow-hidden rounded-xl"
                  style={{
                    background: `radial-gradient(120% 120% at 50% 0%, ${s.colors.shirt}33, #00000055)`,
                  }}
                >
                  <div className="flex flex-col items-center">
                    <div className="h-5 w-9 rounded-t-full" style={{ background: s.colors.hat }} />
                    <div className="h-5 w-5 rounded-full" style={{ background: s.colors.skin }} />
                    <div
                      className="h-9 w-8 rounded-md"
                      style={{ background: `linear-gradient(120deg, ${s.colors.shirt}, ${s.colors.pack})` }}
                    />
                    <div className="mt-1 flex gap-1">
                      <div className="h-4 w-2.5 rounded-sm" style={{ background: s.colors.pants }} />
                      <div className="h-4 w-2.5 rounded-sm" style={{ background: s.colors.pants }} />
                    </div>
                  </div>
                  {equipped && (
                    <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-gold-400 px-2 py-0.5 text-[9px] font-extrabold tracking-widest text-jungle-950">
                      <Check size={10} strokeWidth={4} /> ACTIVE
                    </div>
                  )}
                </div>
                <h3 className="font-display mt-3 text-lg font-bold text-amber-50">{s.name}</h3>
                <p className="mt-1 flex-1 text-xs leading-relaxed text-amber-100/55">{s.desc}</p>
                {owned ? (
                  <button
                    onClick={() => {
                      onEquipSkin(s.id);
                      sound.click();
                    }}
                    className={`mt-4 rounded-xl py-2.5 text-sm font-extrabold tracking-wider transition-all ${
                      equipped
                        ? 'border border-gold-400/40 bg-gold-400/15 text-gold-300'
                        : 'btn-ghost text-gold-200'
                    }`}
                  >
                    {equipped ? 'EQUIPPED' : 'EQUIP'}
                  </button>
                ) : (
                  <button
                    onClick={() => onBuySkin(s.id)}
                    className={`mt-4 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-extrabold tracking-wider ${
                      profile.coins >= s.price
                        ? 'btn-gold'
                        : 'cursor-not-allowed border border-white/10 bg-white/5 text-white/35'
                    }`}
                  >
                    {profile.coins >= s.price ? <CoinIcon size={17} /> : <Lock size={15} />}
                    {s.price.toLocaleString()}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ title, sub }) {
  return (
    <div className="mb-4 mt-10 flex items-end justify-between">
      <div>
        <h2 className="font-display text-xl font-extrabold tracking-[0.14em] text-amber-50 sm:text-2xl">
          {title}
        </h2>
        <p className="mt-0.5 text-xs text-amber-100/45">{sub}</p>
      </div>
      <div className="hidden h-px flex-1 mx-5 bg-gradient-to-r from-gold-400/40 to-transparent sm:block" />
    </div>
  );
}
