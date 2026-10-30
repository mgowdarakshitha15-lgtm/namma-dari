import React from 'react';
import { Destination, RegionName } from '../types.ts';

interface RegionInfo {
  id: RegionName;
  kannada: string;
  english: string;
  districtsNote: string;
  character: string;
}

export const NAMMA_DAARI_REGIONS: RegionInfo[] = [
  {
    id: 'Coastal Karnataka',
    kannada: 'ಕರಾವಳಿ ಕರ್ನಾಟಕ',
    english: 'Coastal Karnataka',
    districtsNote: 'Uttara Kannada, Udupi & Dakshina Kannada',
    character: 'Arabian Sea estuaries, Alupa-era sloped-roof stone temples, Jain basadis, and Tuluva–Konkani–Kundapura culinary traditions.',
  },
  {
    id: 'Malnad',
    kannada: 'ಮಲೆನಾಡು',
    english: 'Malnad',
    districtsNote: 'Shivamogga, Chikkamagaluru, Hassan & Kodagu belt',
    character: 'Misty Western Ghats rainforest passes, Keladi Nayaka hill forts, and Hoysala soapstone temple ensembles.',
  },
  {
    id: 'Old Mysuru',
    kannada: 'ಹಳೇ ಮೈಸೂರು',
    english: 'Old Mysuru',
    districtsNote: 'Mysuru, Mandya, Ramanagara & southern plains',
    character: 'Kaveri basin temple towns, Wadiyar palace heritage, GI-tagged Channapatna woodcraft, and silk weaving clusters.',
  },
  {
    id: 'Kittur Karnataka',
    kannada: 'ಕಿತ್ತೂರು ಕರ್ನಾಟಕ',
    english: 'Kittur Karnataka',
    districtsNote: 'Bagalkote, Gadag, Dharwad, Belagavi & Haveri belt',
    character: 'Malaprabha sandstone cliffs, Early & Kalyani Chalukya architectural workshops, ornate stepwells, and handloom khana.',
  },
  {
    id: 'Kalyana Karnataka',
    kannada: 'ಕಲ್ಯಾಣ ಕರ್ನಾಟಕ',
    english: 'Kalyana Karnataka',
    districtsNote: 'Bidar, Kalaburagi, Vijayanagara, Raichur & Koppal belt',
    character: 'Vijayanagara boulder landscapes, Bahmani citadels, Bidri silver-inlay craft, Karez channels, and early Buddhist stupas.',
  },
];

interface RegionCardsProps {
  selectedRegion: RegionName | '';
  onSelectRegion: (region: RegionName | '') => void;
  places: Destination[];
}

export const RegionCards: React.FC<RegionCardsProps> = ({
  selectedRegion,
  onSelectRegion,
  places,
}) => {
  const countByRegion = (r: RegionName) => places.filter((p) => p.region === r).length;
  const tier3ByRegion = (r: RegionName) =>
    places.filter((p) => p.region === r && p.popularity_tier === 3).length;

  return (
    <section aria-labelledby="regions-heading" className="my-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-5">
        <div>
          <h2
            id="regions-heading"
            className="text-2xl md:text-3xl font-bold text-[#8E0F18] font-kannada leading-snug"
          >
            ಐದು ಪ್ರವಾಸಿ ವಲಯಗಳು
          </h2>
          <p className="text-sm font-medium text-[#2B1D14] mt-0.5">
            Five Namma Daari Travel Regions — Tap a region to filter places and pre-set starting region
          </p>
        </div>

        {selectedRegion && (
          <button
            type="button"
            onClick={() => onSelectRegion('')}
            className="self-start md:self-auto px-3.5 py-1.5 text-xs font-bold text-[#B3141F] bg-[#FFF0C7] border border-[#B3141F] rounded-xs hover:bg-[#B3141F] hover:text-[#FFF6DC] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Show All 5 Regions ({places.length})
          </button>
        )}
      </div>

      <p className="text-xs text-[#2B1D14]/85 mb-4 max-w-3xl">
        <strong>Editorial Classification Note:</strong> Every destination in{' '}
        <span className="font-semibold text-[#8E0F18]">the verified Karnataka places dataset</span> belongs to
        exactly one of these five application-defined cultural regions. This is an editorial itinerary convention, not an administrative decree.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {NAMMA_DAARI_REGIONS.map((region) => {
          const isSelected = selectedRegion === region.id;
          const totalCount = countByRegion(region.id);
          const offbeatCount = tier3ByRegion(region.id);

          return (
            <button
              key={region.id}
              type="button"
              onClick={() => onSelectRegion(isSelected ? '' : region.id)}
              aria-pressed={isSelected}
              className={`text-left p-4 rounded-xs transition-colors cursor-pointer flex flex-col justify-between border ${
                isSelected
                  ? 'bg-[#B3141F] text-[#FFF6DC] border-[#F4B400] shadow-md'
                  : 'bg-[#FFF0C7]/70 text-[#2B1D14] border-[#E2D2B4] hover:border-[#F4B400] hover:bg-[#FFF0C7]'
              }`}
            >
              <div>
                <div className="text-lg font-bold font-kannada leading-relaxed">
                  {region.kannada}
                </div>
                <div
                  className={`text-sm font-bold mt-0.5 ${
                    isSelected ? 'text-[#F4B400]' : 'text-[#8E0F18]'
                  }`}
                >
                  {region.english}
                </div>
                <p
                  className={`text-xs mt-2 leading-relaxed ${
                    isSelected ? 'text-[#FFF6DC]/90' : 'text-[#2B1D14]/80'
                  }`}
                >
                  {region.character}
                </p>
              </div>

              <div
                className={`mt-4 pt-2.5 border-t text-xs font-mono-tabular flex items-center justify-between ${
                  isSelected
                    ? 'border-[#F4B400]/40 text-[#F4B400]'
                    : 'border-[#E2D2B4] text-[#2B1D14]/75'
                }`}
              >
                <span>{totalCount} places</span>
                <span aria-hidden="true">·</span>
                <span>{offbeatCount} Offbeat</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
