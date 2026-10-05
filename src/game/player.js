/* Chunky animated adventurer drawn from behind, pure canvas primitives. */

const bump = (c, x, y, r, color) => {
  c.fillStyle = color;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
};

export function drawPlayer(ctx, o) {
  const u = o.h / 100; // unit scale
  const { skin, shirt, pants, hat, pack } = o.skin.colors;
  const feetY = o.groundY - o.airH * o.h * 0.62;

  ctx.save();
  ctx.translate(o.x, feetY);

  /* shadow */
  if (!o.dead || o.airH >= -0.01) {
    const shScale = Math.max(0.3, 1 - o.airH * 0.28);
    ctx.save();
    ctx.translate(0, o.groundY - feetY);
    ctx.scale(shScale, shScale * 0.5);
    ctx.fillStyle = 'rgba(8,10,14,0.38)';
    ctx.beginPath();
    ctx.arc(0, 0, 26 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (o.dead) {
    ctx.translate(0, -40 * u);
    ctx.rotate(o.tumble);
    ctx.translate(0, 40 * u);
  }

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  /* --------------------------- shield + magnet auras --------------------------- */
  if (o.shield) {
    ctx.save();
    ctx.translate(0, -52 * u);
    const r = (46 + Math.sin(o.t * 5) * 3) * u;
    const grad = ctx.createRadialGradient(0, 0, r * 0.55, 0, 0, r);
    grad.addColorStop(0, 'rgba(96,205,255,0)');
    grad.addColorStop(0.85, 'rgba(96,205,255,0.16)');
    grad.addColorStop(1, 'rgba(160,225,255,0.5)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(170,230,255,0.85)';
    ctx.lineWidth = 2.5 * u;
    ctx.setLineDash([10 * u, 8 * u]);
    ctx.lineDashOffset = -o.t * 30 * u;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.96, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  if (o.magnet) {
    ctx.save();
    ctx.translate(0, -52 * u);
    for (let i = 0; i < 3; i++) {
      const a = o.t * 2.4 + (i * Math.PI * 2) / 3;
      const r = 58 * u;
      ctx.strokeStyle = `rgba(255,209,102,${0.5 - i * 0.12})`;
      ctx.lineWidth = 2.2 * u;
      ctx.beginPath();
      ctx.arc(0, 0, r * (0.75 + i * 0.16), a, a + Math.PI * 0.9);
      ctx.stroke();
    }
    ctx.restore();
  }

  const bob = o.sliding ? 0 : Math.abs(Math.sin(o.runPhase)) * 3.2 * u;
  ctx.translate(0, -bob);
  const lean = o.airH > 0.05 ? -0.12 : 0.06 + Math.sin(o.runPhase * 2) * 0.02;
  ctx.rotate(lean);

  if (o.sliding) {
    /* ---------------------------- slide pose ---------------------------- */
    const k = u;
    ctx.save();
    ctx.translate(0, -18 * k);
    ctx.rotate(-0.32);
    // legs folded in front
    ctx.strokeStyle = pants;
    ctx.lineWidth = 11 * k;
    ctx.beginPath();
    ctx.moveTo(-14 * k, 8 * k);
    ctx.lineTo(4 * k, 14 * k);
    ctx.lineTo(20 * k, 4 * k);
    ctx.stroke();
    // torso
    ctx.fillStyle = shirt;
    roundedPath(ctx, -16 * k, -34 * k, 32 * k, 36 * k, 12 * k);
    ctx.fill();
    // pack on top (visible from above/behind)
    ctx.fillStyle = pack;
    roundedPath(ctx, -11 * k, -40 * k, 22 * k, 20 * k, 7 * k);
    ctx.fill();
    ctx.fillStyle = shade(pack, -18);
    roundedPath(ctx, -11 * k, -40 * k, 22 * k, 7 * k, 4 * k);
    ctx.fill();
    // head + hat
    bump(ctx, 6 * k, -38 * k, 11 * k, skin);
    ctx.fillStyle = hat;
    ctx.beginPath();
    ctx.ellipse(6 * k, -44 * k, 16 * k, 5 * k, -0.15, 0, Math.PI * 2);
    ctx.fill();
    roundedPath(ctx, -2 * k, -54 * k, 16 * k, 10 * k, 5 * k);
    ctx.fill();
    ctx.restore();
  } else if (o.airH > 0.12) {
    /* ---------------------------- jump pose ---------------------------- */
    const k = u;
    ctx.strokeStyle = pants;
    ctx.lineWidth = 11 * k;
    // knees tucked up
    ctx.beginPath();
    ctx.moveTo(-6 * k, -44 * k);
    ctx.lineTo(-14 * k, -26 * k);
    ctx.lineTo(-5 * k, -22 * k);
    ctx.moveTo(6 * k, -44 * k);
    ctx.lineTo(14 * k, -28 * k);
    ctx.lineTo(24 * k, -26 * k);
    ctx.stroke();
    // arms raised
    ctx.strokeStyle = shirt;
    ctx.lineWidth = 9 * k;
    ctx.beginPath();
    ctx.moveTo(-16 * k, -72 * k);
    ctx.lineTo(-26 * k, -88 * k);
    ctx.moveTo(16 * k, -72 * k);
    ctx.lineTo(28 * k, -86 * k);
    ctx.stroke();
    bump(ctx, -26 * k, -88 * k, 5 * k, skin);
    bump(ctx, 28 * k, -86 * k, 5 * k, skin);
    drawTorso(ctx, k, shirt, pack, skin, hat);
  } else {
    /* ---------------------------- run pose ---------------------------- */
    const k = u;
    const p = o.runPhase;
    // legs: from-behind alternating knee lift
    ctx.strokeStyle = pants;
    ctx.lineWidth = 11.5 * k;
    for (const side of [-1, 1]) {
      const ph = p + (side === 1 ? Math.PI : 0);
      const hipX = side * 7 * k;
      const hipY = -46 * k;
      const lift = Math.max(0, Math.sin(ph)) * 26 * k; // knee raise
      const kneeX = hipX + side * 3.5 * k;
      const kneeY = hipY + 24 * k - lift * 0.55;
      const footY = -2 * k - lift;
      const footX = kneeX + side * 1.5 * k;
      ctx.beginPath();
      ctx.moveTo(hipX, hipY);
      ctx.lineTo(kneeX, kneeY);
      ctx.lineTo(footX, footY);
      ctx.stroke();
      // boot
      ctx.fillStyle = shade(pants, -30);
      ctx.beginPath();
      ctx.ellipse(footX, footY, 7.5 * k, 5 * k, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // arms pumping beside body
    ctx.strokeStyle = shirt;
    ctx.lineWidth = 9 * k;
    for (const side of [-1, 1]) {
      const ph = p + (side === 1 ? 0 : Math.PI);
      const shX = side * 17 * k;
      const shY = -74 * k;
      const swing = Math.sin(ph);
      const elX = shX + side * 6 * k;
      const elY = shY + 16 * k - swing * 6 * k;
      const handX = shX + side * 2 * k;
      const handY = shY + 26 * k - swing * 14 * k;
      ctx.beginPath();
      ctx.moveTo(shX, shY);
      ctx.lineTo(elX, elY);
      ctx.lineTo(handX, handY);
      ctx.stroke();
      bump(ctx, handX, handY, 4.6 * k, skin);
    }
    drawTorso(ctx, k, shirt, pack, skin, hat);
  }

  ctx.restore();
}

function drawTorso(ctx, k, shirt, pack, skin, hat) {
  // torso (slight trapezoid, from behind)
  ctx.fillStyle = shirt;
  ctx.beginPath();
  ctx.moveTo(-16 * k, -46 * k);
  ctx.lineTo(-15 * k, -78 * k);
  ctx.quadraticCurveTo(0, -86 * k, 15 * k, -78 * k);
  ctx.lineTo(16 * k, -46 * k);
  ctx.quadraticCurveTo(0, -40 * k, -16 * k, -46 * k);
  ctx.fill();
  // shirt shading
  ctx.fillStyle = 'rgba(0,0,0,0.14)';
  ctx.beginPath();
  ctx.moveTo(0, -46 * k);
  ctx.quadraticCurveTo(0, -62 * k, 0, -84 * k);
  ctx.quadraticCurveTo(8, -83 * k, 15 * k, -78 * k);
  ctx.lineTo(16 * k, -46 * k);
  ctx.quadraticCurveTo(8, -42 * k, 0, -46 * k);
  ctx.fill();
  // backpack (we see his back)
  ctx.fillStyle = pack;
  roundedPath(ctx, -11 * k, -74 * k, 22 * k, 26 * k, 8 * k);
  ctx.fill();
  ctx.fillStyle = shade(pack, -22);
  roundedPath(ctx, -11 * k, -74 * k, 22 * k, 9 * k, 6 * k);
  ctx.fill();
  ctx.fillStyle = shade(pack, 26);
  ctx.fillRect(-2.5 * k, -70 * k, 5 * k, 18 * k);
  // neck + head
  bump(ctx, 0, -84 * k, 5 * k, skin);
  bump(ctx, 0, -93 * k, 11.5 * k, skin);
  // fedora: big brim visible from behind + crown
  ctx.fillStyle = hat;
  ctx.beginPath();
  ctx.ellipse(0, -98 * k, 19 * k, 5.5 * k, 0, Math.PI, 0);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, -97 * k, 19 * k, 6 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = shade(hat, 14);
  roundedPath(ctx, -10 * k, -113 * k, 20 * k, 16 * k, 7 * k);
  ctx.fill();
  ctx.fillStyle = shade(hat, -24);
  ctx.fillRect(-10 * k, -101 * k, 20 * k, 3.4 * k);
}

export function roundedPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/* tiny color shade helper (hex -> lighter/darker) */
export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, (n >> 16) + amt));
  const g = Math.min(255, Math.max(0, ((n >> 8) & 0xff) + amt));
  const b = Math.min(255, Math.max(0, (n & 0xff) + amt));
  return `rgb(${r},${g},${b})`;
}

/* mix two hex colors, f = 0..1 */
export function mixc(a, b, f) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round((pa >> 16) * (1 - f) + (pb >> 16) * f);
  const g = Math.round(((pa >> 8) & 0xff) * (1 - f) + ((pb >> 8) & 0xff) * f);
  const bl = Math.round((pa & 0xff) * (1 - f) + (pb & 0xff) * f);
  return `rgb(${r},${g},${bl})`;
}
