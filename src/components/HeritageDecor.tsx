import React, { useState } from 'react';
import { Camera, Image as ImageIcon, X } from 'lucide-react';

/**
 * Animated SVG Karnataka architectural skyline:
 * 1. Western Ghats mountain ridge in subtle green with slow-drifting mist
 * 2. Deccan dome & minarets (Gol Gumbaz / Bijapur-Bidar)
 * 3. Stepped Hoysala vimana tower with lathe-turned pillars
 * 4. Indo-Saracenic palace dome & arches (Mysuru)
 * 5. Hampi Stone Chariot: gently rolls along ground line with spinning wheels
 * Palette: Turmeric yellow #F2A900, Kumkuma red #B22222, Warm cream #FFF8E7,
 * Sandalwood brown #5C4033, Western Ghats green #2E6F40.
 */
export const KarnatakaHeritageSkyline: React.FC = () => {
  return (
    <div className="w-full overflow-hidden select-none relative" aria-hidden="true">
      <svg
        viewBox="0 0 1200 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto max-h-52"
        preserveAspectRatio="xMidYBottom meet"
      >
        <defs>
          {/* Subtle mist gradient for Western Ghats */}
          <linearGradient id="mistGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FFF8E7" stopOpacity="0" />
            <stop offset="50%" stopColor="#E5D5BA" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#FFF8E7" stopOpacity="0" />
          </linearGradient>

          {/* Western Ghats hills gradient with subtle green and sandalwood brown */}
          <linearGradient id="ghatsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2E6F40" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#5C4033" stopOpacity="0.15" />
          </linearGradient>
        </defs>

        {/* Western Ghats mountain silhouettes in the background */}
        <path
          d="M0 196 L0 152 Q120 130 240 148 T480 142 T720 136 T960 146 T1200 150 L1200 196 Z"
          fill="url(#ghatsGrad)"
        />



        {/* Ground baseline */}
        <line x1="20" y1="196" x2="1180" y2="196" stroke="#B22222" strokeWidth="2.5" />
        <line x1="40" y1="202" x2="1160" y2="202" stroke="#F2A900" strokeWidth="2" strokeDasharray="6 4" />

        {/* 1. Left: Deccan Sultanate / Gol Gumbaz (fade in 1) */}
        <g transform="translate(80, 35)" style={{ animation: 'pinnacleFadeIn 1.2s ease-out 0.2s both' }}>
          <path
            d="M45 95 C45 38, 155 38, 155 95 Z"
            fill="#FFF2D6"
            stroke="#B22222"
            strokeWidth="2"
          />
          <line x1="100" y1="35" x2="100" y2="52" stroke="#F2A900" strokeWidth="2.5" />
          <circle cx="100" cy="33" r="3.5" fill="#F2A900" />
          <path d="M42 95 L158 95" stroke="#F2A900" strokeWidth="3" />
          <rect x="35" y="95" width="130" height="66" fill="#FFF8E7" stroke="#5C4033" strokeWidth="2" />
          <path d="M58 161 L58 122 C58 110, 78 110, 78 122 L78 161" stroke="#B22222" strokeWidth="2" />
          <path d="M88 161 L88 115 C88 102, 112 102, 112 115 L112 161" stroke="#B22222" strokeWidth="2.2" />
          <path d="M122 161 L122 122 C122 110, 142 110, 142 122 L142 161" stroke="#B22222" strokeWidth="2" />
          <rect x="16" y="65" width="19" height="96" fill="#FFF2D6" stroke="#5C4033" strokeWidth="1.8" />
          <path d="M16 65 C16 52, 35 52, 35 65 Z" fill="#B22222" />
          <rect x="165" y="65" width="19" height="96" fill="#FFF2D6" stroke="#5C4033" strokeWidth="1.8" />
          <path d="M165 65 C165 52, 184 52, 184 65 Z" fill="#B22222" />
          <line x1="16" y1="88" x2="35" y2="88" stroke="#F2A900" strokeWidth="1.5" />
          <line x1="16" y1="115" x2="35" y2="115" stroke="#F2A900" strokeWidth="1.5" />
          <line x1="165" y1="88" x2="184" y2="88" stroke="#F2A900" strokeWidth="1.5" />
          <line x1="165" y1="115" x2="184" y2="115" stroke="#F2A900" strokeWidth="1.5" />
        </g>

        {/* 2. Center-Left: Stepped Hoysala Stellate Vimana (fade in 2) */}
        <g transform="translate(340, 30)" style={{ animation: 'pinnacleFadeIn 1.2s ease-out 0.5s both' }}>
          <line x1="110" y1="22" x2="110" y2="38" stroke="#F2A900" strokeWidth="2.5" />
          <circle cx="110" cy="20" r="4" fill="#F2A900" />
          <polygon points="110,36 82,56 138,56" fill="#B22222" stroke="#5C4033" strokeWidth="1.5" />
          <rect x="74" y="56" width="72" height="14" fill="#FFF2D6" stroke="#5C4033" strokeWidth="1.6" />
          <rect x="64" y="70" width="92" height="16" fill="#FFF8E7" stroke="#5C4033" strokeWidth="1.6" />
          <rect x="52" y="86" width="116" height="18" fill="#FFF2D6" stroke="#5C4033" strokeWidth="1.8" />
          <line x1="52" y1="95" x2="168" y2="95" stroke="#F2A900" strokeWidth="2" strokeDasharray="3 3" />
          <rect x="35" y="104" width="150" height="46" fill="#FFF8E7" stroke="#5C4033" strokeWidth="2" />
          <line x1="60" y1="104" x2="60" y2="150" stroke="#B22222" strokeWidth="2.5" />
          <line x1="85" y1="104" x2="85" y2="150" stroke="#B22222" strokeWidth="2.5" />
          <line x1="110" y1="104" x2="110" y2="150" stroke="#B22222" strokeWidth="2.5" />
          <line x1="135" y1="104" x2="135" y2="150" stroke="#B22222" strokeWidth="2.5" />
          <line x1="160" y1="104" x2="160" y2="150" stroke="#B22222" strokeWidth="2.5" />
          <rect x="18" y="150" width="184" height="16" fill="#E5D5BA" stroke="#5C4033" strokeWidth="2" />
        </g>

        {/* 3. Center-Right: Mysuru Indo-Saracenic Palace Domes (fade in 3) */}
        <g transform="translate(615, 25)" style={{ animation: 'pinnacleFadeIn 1.2s ease-out 0.8s both' }}>
          <path
            d="M85 75 C85 32, 145 32, 145 75 Z"
            fill="#B22222"
            stroke="#5C4033"
            strokeWidth="2"
          />
          <line x1="115" y1="18" x2="115" y2="38" stroke="#F2A900" strokeWidth="2.5" />
          <circle cx="115" cy="16" r="4" fill="#F2A900" />
          <rect x="80" y="75" width="70" height="24" fill="#FFF2D6" stroke="#5C4033" strokeWidth="1.8" />
          <rect x="20" y="99" width="190" height="72" fill="#FFF8E7" stroke="#5C4033" strokeWidth="2" />
          <path d="M30 99 C30 78, 60 78, 60 99 Z" fill="#F2A900" stroke="#5C4033" strokeWidth="1.6" />
          <path d="M170 99 C170 78, 200 78, 200 99 Z" fill="#F2A900" stroke="#5C4033" strokeWidth="1.6" />
          <path d="M40 171 L40 128 C40 114, 72 114, 72 128 L72 171" stroke="#B22222" strokeWidth="2" />
          <path d="M90 171 L90 122 C90 106, 140 106, 140 122 L140 171" stroke="#B22222" strokeWidth="2.2" />
          <path d="M158 171 L158 128 C158 114, 190 114, 190 128 L190 171" stroke="#B22222" strokeWidth="2" />
          <line x1="20" y1="106" x2="210" y2="106" stroke="#F2A900" strokeWidth="2" />
        </g>

        {/* 4. Right: Hampi Stone Chariot (fade in 4 + gentle rolling + spinning wheels) */}
        <g
          transform="translate(895, 38)"
          className="animate-chariot-roll"
          style={{ animation: 'pinnacleFadeIn 1.2s ease-out 1.1s both' }}
        >
          <polygon points="105,28 75,55 135,55" fill="#FFF2D6" stroke="#B22222" strokeWidth="1.8" />
          <rect x="65" y="55" width="80" height="16" fill="#E5D5BA" stroke="#5C4033" strokeWidth="1.8" />
          <rect x="52" y="71" width="106" height="54" fill="#FFF8E7" stroke="#5C4033" strokeWidth="2" />
          <rect x="86" y="83" width="38" height="32" fill="#FFF2D6" stroke="#B22222" strokeWidth="1.8" />
          <rect x="38" y="125" width="134" height="18" fill="#E5D5BA" stroke="#5C4033" strokeWidth="2" />

          {/* Left Stone Chariot Wheel (16 carved spokes with spinning animation) */}
          <g transform="translate(68, 140)">
            <g className="animate-wheel-spin">
              <circle cx="0" cy="0" r="18" fill="#FFF8E7" stroke="#B22222" strokeWidth="2.5" />
              <circle cx="0" cy="0" r="6" fill="#F2A900" />
              <line x1="-18" y1="0" x2="18" y2="0" stroke="#B22222" strokeWidth="1.5" />
              <line x1="0" y1="-18" x2="0" y2="18" stroke="#B22222" strokeWidth="1.5" />
              <line x1="-13" y1="-13" x2="13" y2="13" stroke="#B22222" strokeWidth="1.3" />
              <line x1="-13" y1="13" x2="13" y2="-13" stroke="#B22222" strokeWidth="1.3" />
              <line x1="-16" y1="-7" x2="16" y2="7" stroke="#5C4033" strokeWidth="1" />
              <line x1="-7" y1="-16" x2="7" y2="16" stroke="#5C4033" strokeWidth="1" />
              <line x1="-16" y1="7" x2="16" y2="-7" stroke="#5C4033" strokeWidth="1" />
              <line x1="7" y1="-16" x2="-7" y2="16" stroke="#5C4033" strokeWidth="1" />
            </g>
          </g>

          {/* Right Stone Chariot Wheel (16 carved spokes with spinning animation) */}
          <g transform="translate(142, 140)">
            <g className="animate-wheel-spin">
              <circle cx="0" cy="0" r="18" fill="#FFF8E7" stroke="#B22222" strokeWidth="2.5" />
              <circle cx="0" cy="0" r="6" fill="#F2A900" />
              <line x1="-18" y1="0" x2="18" y2="0" stroke="#B22222" strokeWidth="1.5" />
              <line x1="0" y1="-18" x2="0" y2="18" stroke="#B22222" strokeWidth="1.5" />
              <line x1="-13" y1="-13" x2="13" y2="13" stroke="#B22222" strokeWidth="1.3" />
              <line x1="-13" y1="13" x2="13" y2="-13" stroke="#B22222" strokeWidth="1.3" />
              <line x1="-16" y1="-7" x2="16" y2="7" stroke="#5C4033" strokeWidth="1" />
              <line x1="-7" y1="-16" x2="7" y2="16" stroke="#5C4033" strokeWidth="1" />
              <line x1="-16" y1="7" x2="16" y2="-7" stroke="#5C4033" strokeWidth="1" />
              <line x1="7" y1="-16" x2="-7" y2="16" stroke="#5C4033" strokeWidth="1" />
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
};

/**
 * Spinning Stone Chariot Wheel for Loading State:
 * Requirement: "While loading, show a spinning chariot wheel."
 */
export const ChariotWheelSpinner: React.FC<{ size?: number }> = ({ size = 36 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    className="animate-fast-spin shrink-0"
    aria-hidden="true"
  >
    <circle cx="24" cy="24" r="22" fill="#FFFDF5" stroke="#B22222" strokeWidth="3" />
    <circle cx="24" cy="24" r="19" stroke="#F2A900" strokeWidth="1.5" strokeDasharray="3 3" />
    <circle cx="24" cy="24" r="7" fill="#F2A900" stroke="#B22222" strokeWidth="2" />
    {/* 8 axes (16 spokes) */}
    <line x1="2" y1="24" x2="46" y2="24" stroke="#B22222" strokeWidth="2" />
    <line x1="24" y1="2" x2="24" y2="46" stroke="#B22222" strokeWidth="2" />
    <line x1="8.4" y1="8.4" x2="39.6" y2="39.6" stroke="#B22222" strokeWidth="2" />
    <line x1="8.4" y1="39.6" x2="39.6" y2="8.4" stroke="#B22222" strokeWidth="2" />
    <line x1="3.5" y1="15.8" x2="44.5" y2="32.2" stroke="#5C4033" strokeWidth="1.4" />
    <line x1="15.8" y1="3.5" x2="32.2" y2="44.5" stroke="#5C4033" strokeWidth="1.4" />
    <line x1="3.5" y1="32.2" x2="44.5" y2="15.8" stroke="#5C4033" strokeWidth="1.4" />
    <line x1="32.2" y1="3.5" x2="15.8" y2="44.5" stroke="#5C4033" strokeWidth="1.4" />
  </svg>
);

/**
 * Personal Photo Frame:
 * Requirement: "Hide the empty photo frame until an image is added."
 */
export const PersonalPhotoFrame: React.FC = () => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState<string>('My Karnataka Journey');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPreviewUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  if (!previewUrl) {
    return (
      <div className="pt-2">
        <label className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#B22222] bg-[#FFF2D6] border border-[#F2A900] rounded-xs hover:bg-[#F2A900] hover:text-[#2B1D14] transition-colors cursor-pointer whitespace-nowrap">
          <Camera className="w-4 h-4 text-[#B22222]" aria-hidden="true" />
          <span>Add Your Travel Photo</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="sr-only"
          />
        </label>
      </div>
    );
  }

  return (
    <div className="kasuti-border bg-[#FFF2D6]/80 p-3.5 rounded-xs flex flex-col justify-between max-w-sm">
      <div className="flex items-center justify-between border-b border-[#E5D5BA] pb-1.5 mb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-[#B22222] flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-[#B22222]" aria-hidden="true" />
          <span>Travel Photo · ಯಾತ್ರಿಕನ ಚಿತ್ರ</span>
        </span>
        <button
          type="button"
          onClick={() => setPreviewUrl(null)}
          aria-label="Remove photo"
          className="text-[#B22222] hover:text-[#8B0000] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-[#FFF8E7] border border-[#F2A900] p-2 flex flex-col items-center group overflow-hidden">
        <img
          src={previewUrl}
          alt={caption}
          className="max-h-44 w-auto object-contain rounded-xs transition-transform duration-500 ease-out group-hover:scale-105"
        />
        <div className="mt-2 w-full">
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            aria-label="Photograph caption"
            className="w-full bg-transparent border-b border-[#E5D5BA] text-[#2B1D14] font-medium text-xs px-1 py-0.5 focus:outline-none focus:border-[#B22222]"
          />
        </div>
      </div>
    </div>
  );
};

/**
 * Karnataka-style border pattern divider with subtle shimmer:
 * Requirement: "Use a Karnataka-style border pattern as a divider, with a subtle shimmer."
 */
export const HoysalaDivider: React.FC = () => (
  <div className="relative my-8 select-none py-2" aria-hidden="true">
    {/* Subtle animated shimmer background line */}
    <div className="h-1.5 w-full karnataka-divider-shimmer rounded-full opacity-70" />

    {/* Central Kasuti-Hoysala motif in Turmeric Yellow and Kumkuma Red */}
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="bg-[#FFF8E7] px-4 py-0.5 flex items-center gap-2.5">
        <svg width="110" height="20" viewBox="0 0 110 20" fill="none">
          <polygon points="10,10 16,4 22,10 16,16" stroke="#F2A900" strokeWidth="1.5" fill="#FFF2D6" />
          <polygon points="35,10 41,4 47,10 41,16" stroke="#B22222" strokeWidth="1.5" fill="#FFF2D6" />
          {/* Central Hoysala star medallion */}
          <polygon points="55,1 63,10 55,19 47,10" stroke="#B22222" strokeWidth="1.8" fill="#FFFDF5" />
          <circle cx="55" cy="10" r="3" fill="#F2A900" />
          <polygon points="63,10 69,4 75,10 69,16" stroke="#B22222" strokeWidth="1.5" fill="#FFF2D6" />
          <polygon points="88,10 94,4 100,10 94,16" stroke="#F2A900" strokeWidth="1.5" fill="#FFF2D6" />
        </svg>
      </div>
    </div>
  </div>
);

/**
 * Lotus-inspired Day Badge in Kumkuma Red with Turmeric Yellow border
 */
export const LotusDayBadge: React.FC<{ dayNumber: number }> = ({ dayNumber }) => (
  <div className="relative inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#B22222] text-[#FFF8E7] border-2 border-[#F2A900] shadow-xs shrink-0">
    <svg
      className="absolute inset-0 w-full h-full opacity-35"
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="20" stroke="#F2A900" strokeWidth="1" strokeDasharray="3 3" />
    </svg>
    <div className="text-center leading-none">
      <span className="block text-[10px] uppercase font-bold tracking-wider text-[#F2A900]">Day</span>
      <span className="block text-base font-bold font-mono-tabular text-[#FFF8E7]">{dayNumber}</span>
    </div>
  </div>
);
