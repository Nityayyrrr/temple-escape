import { useCallback, useEffect, useState } from 'react';
import { MenuScreen } from './components/MenuScreen';
import { ShopScreen } from './components/ShopScreen';
import { GameScreen } from './components/GameScreen';
import { GameOverScreen } from './components/GameOverScreen';
import { sound } from './game/audio';
import {
  CONSUMABLES,
  MAGNET_MASTERY_PRICES,
  SKINS,
  defaultProfile,
  loadProfile,
  magnetDuration,
  saveProfile,
  skinById,
} from './game/profile';

const emptyBoosts = { shield: false, magnet: false, boost: false, multiplier: false };

export default function App() {
  const [profile, setProfile] = useState(defaultProfile());
  const [screen, setScreen] = useState('menu'); // menu | game | shop | over
  const [loadout, setLoadout] = useState({ ...emptyBoosts });
  const [activeBoosts, setActiveBoosts] = useState({ ...emptyBoosts });
  const [result, setResult] = useState(null);
  const [runKey, setRunKey] = useState(0);

  useEffect(() => {
    const p = loadProfile();
    setProfile(p);
    sound.setMuted(p.muted);
  }, []);

  const persist = useCallback((fn) => {
    setProfile((prev) => {
      const next = fn(prev);
      saveProfile(next);
      return next;
    });
  }, []);

  /* ------------------------------ run flow ------------------------------ */

  const startRun = useCallback(() => {
    sound.resume();
    sound.click();
    // consume armed charms from inventory
    setProfile((prev) => {
      const next = { ...prev, inventory: { ...prev.inventory } };
      Object.keys(loadout).forEach((id) => {
        if (loadout[id] && next.inventory[id] > 0) next.inventory[id] -= 1;
      });
      saveProfile(next);
      return next;
    });
    setActiveBoosts({ ...loadout });
    setRunKey((k) => k + 1);
    setScreen('game');
  }, [loadout]);

  const handleGameOver = useCallback((r) => {
    setProfile((prev) => {
      const isNewBest = r.score > prev.highScore;
      const next = {
        ...prev,
        coins: prev.coins + r.coins,
        lifetimeCoins: prev.lifetimeCoins + r.coins,
        totalRuns: prev.totalRuns + 1,
        highScore: isNewBest ? r.score : prev.highScore,
        bestDist: Math.max(prev.bestDist, r.dist),
      };
      saveProfile(next);
      setResult({ ...r, best: next.highScore, isNewBest });
      return next;
    });
    setScreen('over');
  }, []);

  /* ------------------------------ shop ------------------------------ */

  const buyConsumable = useCallback(
    (id) => {
      sound.resume();
      const price = CONSUMABLES.find((c) => c.id === id).price;
      if (profile.coins < price) {
        sound.denied();
        return;
      }
      sound.buy();
      persist((p) => ({
        ...p,
        coins: p.coins - price,
        inventory: { ...p.inventory, [id]: p.inventory[id] + 1 },
      }));
    },
    [profile.coins, persist],
  );

  const buyMastery = useCallback(() => {
    sound.resume();
    if (profile.magnetMastery >= 3) return;
    const price = MAGNET_MASTERY_PRICES[profile.magnetMastery];
    if (profile.coins < price) {
      sound.denied();
      return;
    }
    sound.buy();
    persist((p) => ({ ...p, coins: p.coins - price, magnetMastery: p.magnetMastery + 1 }));
  }, [profile.coins, profile.magnetMastery, persist]);

  const buySkin = useCallback(
    (id) => {
      sound.resume();
      const price = SKINS.find((s) => s.id === id).price;
      if (profile.coins < price) {
        sound.denied();
        return;
      }
      sound.buy();
      persist((p) => ({
        ...p,
        coins: p.coins - price,
        skinsOwned: [...p.skinsOwned, id],
        selectedSkin: id,
      }));
    },
    [profile.coins, persist],
  );

  const equipSkin = useCallback(
    (id) => persist((p) => ({ ...p, selectedSkin: id })),
    [persist],
  );

  const toggleBoost = useCallback((id) => {
    sound.resume();
    sound.click();
    setLoadout((l) => ({ ...l, [id]: !l[id] }));
  }, []);

  const toggleMute = useCallback(() => {
    sound.resume();
    sound.setMuted(!sound.isMuted);
    persist((p) => ({ ...p, muted: !p.muted }));
  }, [persist]);

  /* ------------------------------ render ------------------------------ */

  return (
    <div className="h-full w-full bg-jungle-950 font-body">
      {screen === 'menu' && (
        <MenuScreen
          profile={profile}
          loadout={loadout}
          onToggleBoost={toggleBoost}
          onPlay={startRun}
          onShop={() => {
            sound.resume();
            sound.click();
            setScreen('shop');
          }}
          onToggleMute={toggleMute}
        />
      )}

      {screen === 'shop' && (
        <ShopScreen
          profile={profile}
          onBuyConsumable={buyConsumable}
          onBuyMastery={buyMastery}
          onBuySkin={buySkin}
          onEquipSkin={equipSkin}
          onBack={() => {
            sound.click();
            setScreen('menu');
          }}
        />
      )}

      {screen === 'game' && (
        <GameScreen
          key={runKey}
          skin={skinById(profile.selectedSkin)}
          boosts={activeBoosts}
          magnetDur={magnetDuration(profile.magnetMastery)}
          onGameOver={handleGameOver}
          onQuit={() => setScreen('menu')}
        />
      )}

      {screen === 'over' && result && (
        <div className="relative h-full w-full overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('images/menu-bg.jpg')" }}
          />
          <div className="absolute inset-0 bg-jungle-950/60" />
          <GameOverScreen
            result={result}
            onRetry={startRun}
            onMenu={() => setScreen('menu')}
            onShop={() => setScreen('shop')}
          />
        </div>
      )}
    </div>
  );
}
