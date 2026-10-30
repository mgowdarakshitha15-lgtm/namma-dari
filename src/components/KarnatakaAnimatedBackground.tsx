import React from 'react';

/**
 * KarnatakaAnimatedBackground
 *
 * An immersive, elegant animated travel background inspired by Karnataka:
 * - Forest green, warm cream, muted gold, and earthy sandalwood brown.
 * - Slow-moving ambient gradient meshes creating a calm, cinematic atmosphere.
 * - Gentle drifting clouds and Western Ghats mist.
 * - Multi-layered rolling hill & mountain silhouettes (Coorg, Chikmagalur, Agumbe ridges).
 * - Subtle floating golden fireflies (ಮಿಂಚುಹುಳು / Minchuhulu) with gentle glow.
 * - Zero layout shift or unwanted scrolling (`fixed inset-0 pointer-events-none -z-10`).
 * - Strictly respects `prefers-reduced-motion`.
 */
export const KarnatakaAnimatedBackground: React.FC = () => {
  // 16 subtly positioned fireflies with deterministic organic offsets
  const fireflies = [
    { id: 1, left: '8%', top: '22%', delay: '0s', dur: '14s', size: 3.5 },
    { id: 2, left: '18%', top: '65%', delay: '2.5s', dur: '17s', size: 2.5 },
    { id: 3, left: '27%', top: '38%', delay: '5s', dur: '13s', size: 3 },
    { id: 4, left: '35%', top: '82%', delay: '1s', dur: '16s', size: 2 },
    { id: 5, left: '46%', top: '28%', delay: '4s', dur: '15s', size: 3.5 },
    { id: 6, left: '55%', top: '74%', delay: '6.5s', dur: '18s', size: 2.5 },
    { id: 7, left: '64%', top: '42%', delay: '3s', dur: '14s', size: 3 },
    { id: 8, left: '73%', top: '85%', delay: '7s', dur: '19s', size: 2 },
    { id: 9, left: '82%', top: '25%', delay: '1.5s', dur: '15s', size: 3.5 },
    { id: 10, left: '91%', top: '60%', delay: '4.5s', dur: '16s', size: 2.5 },
    { id: 11, left: '12%', top: '88%', delay: '8s', dur: '20s', size: 2 },
    { id: 12, left: '22%', top: '15%', delay: '3.5s', dur: '14s', size: 3 },
    { id: 13, left: '40%', top: '50%', delay: '6s', dur: '17s', size: 2.5 },
    { id: 14, left: '60%', top: '18%', delay: '2s', dur: '13s', size: 3 },
    { id: 15, left: '85%', top: '78%', delay: '5.5s', dur: '18s', size: 2 },
    { id: 16, left: '95%', top: '35%', delay: '9s', dur: '15s', size: 2.5 },
  ];

  return (
    <div
      className="fixed inset-0 pointer-events-none -z-10 overflow-hidden select-none bg-[#FFF8E7]"
      aria-hidden="true"
    >
      {/* 1. Ambient Moving Gradient Layer: Forest Green, Warm Cream, Muted Gold, Sandalwood Brown */}
      <div className="absolute inset-0 karnataka-ambient-mesh opacity-65" />

      {/* 2. Soft Secondary Breathing Radial Auras */}
      <div className="absolute -top-32 -left-32 w-[650px] h-[650px] rounded-full karnataka-aura-gold opacity-30 animate-aura-slow" />
      <div className="absolute top-1/3 -right-40 w-[750px] h-[750px] rounded-full karnataka-aura-forest opacity-25 animate-aura-reverse" />
      <div className="absolute -bottom-48 left-1/4 w-[850px] h-[600px] rounded-full karnataka-aura-sandalwood opacity-20 animate-aura-slow" />

      {/* 3. Layered Western Ghats Mountain & Rolling Hills Silhouettes (SVG) */}
      <div className="absolute bottom-0 left-0 right-0 w-full h-[320px] sm:h-[400px] md:h-[460px] overflow-hidden">
        {/* Layer A: Far Western Ghats High Mountain Ridge (Subtle misted forest silhouette) */}
        <svg
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
          className="absolute bottom-0 w-[120%] -left-[10%] h-full animate-ghats-far opacity-35"
        >
          <defs>
            <linearGradient id="farGhatsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1E3A27" stopOpacity="0.45" />
              <stop offset="50%" stopColor="#2E6F40" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#FFF8E7" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0,160 Q180,90 360,135 T720,110 T1080,140 T1440,95 L1440,320 L0,320 Z"
            fill="url(#farGhatsGrad)"
          />
        </svg>

        {/* Layer B: Mid Western Ghats Rolling Ridge (Forest green + sandalwood) */}
        <svg
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
          className="absolute bottom-0 w-[115%] -left-[5%] h-full animate-ghats-mid opacity-40"
        >
          <defs>
            <linearGradient id="midGhatsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2A5438" stopOpacity="0.5" />
              <stop offset="60%" stopColor="#5C4033" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#FFF8E7" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0,195 Q220,130 460,175 T920,145 T1440,185 L1440,320 L0,320 Z"
            fill="url(#midGhatsGrad)"
          />
        </svg>

        {/* Layer C: Near Rolling Coffee & Tea Plantation Hill Line */}
        <svg
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
          className="absolute bottom-0 w-[110%] left-0 h-full animate-ghats-near opacity-45"
        >
          <defs>
            <linearGradient id="nearGhatsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2E6F40" stopOpacity="0.55" />
              <stop offset="40%" stopColor="#3E6545" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#FFF8E7" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <path
            d="M0,235 Q190,180 400,215 T840,190 T1260,225 T1440,210 L1440,320 L0,320 Z"
            fill="url(#nearGhatsGrad)"
          />
        </svg>

        {/* 4. Gentle Drifting Clouds & Ghats Mist Layers */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -left-[30%] bottom-28 w-[800px] h-[100px] karnataka-mist-drift-1 opacity-25" />
          <div className="absolute -left-[10%] bottom-44 w-[950px] h-[120px] karnataka-mist-drift-2 opacity-20" />
          <div className="absolute left-[30%] bottom-16 w-[700px] h-[90px] karnataka-mist-drift-3 opacity-30" />
        </div>
      </div>

      {/* 5. Glowing Golden Fireflies (ಮಿಂಚುಹುಳು / Minchuhulu) */}
      <div className="absolute inset-0 pointer-events-none">
        {fireflies.map((f) => (
          <div
            key={f.id}
            className="firefly-particle"
            style={{
              left: f.left,
              top: f.top,
              width: `${f.size}px`,
              height: `${f.size}px`,
              animationDelay: f.delay,
              animationDuration: f.dur,
            }}
          />
        ))}
      </div>

      {/* 6. Subtle Top & Bottom Cinematic Vignette for 100% Reading Contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#FFF8E7]/55 via-transparent to-[#FFF8E7]/70" />
    </div>
  );
};
