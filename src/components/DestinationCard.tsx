import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowLeftRight,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  HelpCircle,
  Info,
  MapPin,
  Sparkles,
  Utensils,
} from 'lucide-react';
import {
  Destination,
  InterestTag,
  MonthName,
  OffbeatLevel,
  ScheduledStop,
  SwapCandidate,
} from '../types.ts';
import { KannadaSpeechButton } from './KannadaSpeechButton.tsx';

interface DestinationCardProps {
  stop: ScheduledStop;
  dayNumber: number;
  totalDays: number;
  allItineraryIds: string[];
  remainingHoursInDay: number;
  selectedInterests: InterestTag[];
  offbeatLevel: OffbeatLevel;
  travelMonth: MonthName;
  onSwapDestination?: (oldId: string, newCandidate: SwapCandidate) => void;
  indexInDay?: number;
}

export const DestinationCard: React.FC<DestinationCardProps> = ({
  stop,
  dayNumber,
  allItineraryIds,
  remainingHoursInDay,
  selectedInterests,
  offbeatLevel,
  travelMonth,
  onSwapDestination,
  indexInDay = 0,
}) => {
  const dest = stop.destination;
  const [showSwapDrawer, setShowSwapDrawer] = useState(false);
  const [swapLoading, setSwapLoading] = useState(false);
  const [swapCandidates, setSwapCandidates] = useState<SwapCandidate[]>([]);
  const [swapError, setSwapError] = useState<string | null>(null);

  const fetchSwapAlternatives = async () => {
    setShowSwapDrawer(true);
    setSwapLoading(true);
    setSwapError(null);

    try {
      const res = await fetch('/api/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_destination_id: dest.id,
          day_number: dayNumber,
          existing_itinerary_ids: allItineraryIds,
          remaining_hours_in_day: remainingHoursInDay,
          interests: selectedInterests,
          offbeat_level: offbeatLevel,
          travel_month: travelMonth,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error?.message || 'Could not fetch alternatives');
      }

      const data = await res.json();
      setSwapCandidates(data.alternatives || []);
    } catch (err) {
      setSwapError(err instanceof Error ? err.message : 'Failed to load swap alternatives.');
    } finally {
      setSwapLoading(false);
    }
  };

  const tierBadgeColor =
    dest.popularity_tier === 3
      ? 'bg-[#B3141F] text-[#FFF6DC] border-[#F4B400]'
      : dest.popularity_tier === 2
        ? 'bg-[#8E0F18] text-[#FFF6DC] border-[#E2D2B4]'
        : 'bg-[#FFF0C7] text-[#8E0F18] border-[#B3141F]';

  const tierLabel =
    dest.popularity_tier === 3
      ? 'Offbeat'
      : dest.popularity_tier === 2
        ? 'Known'
        : 'Famous';

  // Verification status and non-duplicate travel warnings
  const isDraft = !dest.verified;
  const isApproxCoords = Boolean(dest.coords_approx);
  const otherWarnings = stop.stop_warnings.filter(
    (w) =>
      !w.toLowerCase().includes('draft data') &&
      !w.toLowerCase().includes('coordinates are approximate') &&
      !w.toLowerCase().includes('typical timing only')
  );
  const hasTravelInfo = isDraft || isApproxCoords || otherWarnings.length > 0;

  return (
    <article
      aria-labelledby={`destination-${dest.id}`}
      style={{
        animation: 'cardFadeRise 0.45s cubic-bezier(0.16, 1, 0.3, 1) both',
        animationDelay: `${Math.min(indexInDay * 0.08, 0.36)}s`,
      }}
      className="kasuti-border bg-[#FFFDF5]/90 rounded-xs p-5 sm:p-6 card-hover-elevate transition-all"
    >
      {/* Transfer distance pill before stop */}
      {stop.approx_Road_distance_km_from_prev > 0 ? (
        <div
          role="note"
          aria-label="Travel distance estimate from previous stop"
          className="mb-4 inline-flex items-center gap-2 px-3 py-1 bg-[#FFF6DC] border border-[#F4B400] rounded-xs text-xs text-[#2B1D14] font-mono-tabular"
        >
          <Compass className="w-3.5 h-3.5 text-[#B3141F]" aria-hidden="true" />
          <span>{stop.travel_estimate_label}</span>
        </div>
      ) : (
        <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 bg-[#FFF6DC] border border-[#E2D2B4] rounded-xs text-xs text-[#2B1D14] font-medium">
          <Compass className="w-3.5 h-3.5 text-[#B3141F]" aria-hidden="true" />
          <span>Starting anchor for this segment (verify access locally)</span>
        </div>
      )}

      {/* Header: Kannada title first, English name, district & region */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-[#E2D2B4] pb-4 mb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span
              className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 border rounded-xs ${tierBadgeColor}`}
            >
              {tierLabel}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 bg-[#FFF6DC] border border-[#E2D2B4] text-[#2B1D14] rounded-xs">
              {dest.region} · {dest.district}
            </span>
            <span className="text-xs px-2 py-0.5 bg-[#FFF6DC] border border-[#E2D2B4] text-[#8E0F18] font-bold rounded-xs capitalize">
              Cost: {dest.cost_level}
            </span>
            {isDraft && (
              <span className="text-[10px] font-semibold px-2 py-0.5 bg-[#FFF2D6] border border-[#E5D5BA] text-[#5C4033] rounded-xs inline-flex items-center gap-1">
                <Info className="w-2.5 h-2.5 text-[#B22222]" aria-hidden="true" />
                <span>Draft record</span>
              </span>
            )}
            {isApproxCoords && (
              <span className="text-[10px] font-semibold px-2 py-0.5 bg-[#FFF2D6] border border-[#E5D5BA] text-[#5C4033] rounded-xs inline-flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5 text-[#5C4033]" aria-hidden="true" />
                <span>Approx coords</span>
              </span>
            )}
          </div>

          <h3
            id={`destination-${dest.id}`}
            className="text-2xl sm:text-3xl font-bold text-[#8E0F18] font-kannada leading-tight"
          >
            {dest.kannada_name}
            <span className="ml-3 text-lg sm:text-xl font-medium text-[#2B1D14]">
              {dest.name}
            </span>
          </h3>

          <div className="flex flex-wrap items-center gap-3 text-xs text-[#2B1D14]/85 mt-1 font-mono-tabular">
            <span className="flex items-center gap-1 font-semibold">
              <Clock className="w-3.5 h-3.5 text-[#B3141F]" aria-hidden="true" />
              Visit duration: ~{dest.typical_duration_hours}h
            </span>
            <span>·</span>
            <span>
              Best season: {dest.best_season.join(', ')}
            </span>
            {dest.heritage_era && (
              <>
                <span>·</span>
                <span className="font-sans font-medium text-[#8E0F18]">{dest.heritage_era}</span>
              </>
            )}
          </div>
        </div>

        {/* Swap stop button */}
        {onSwapDestination && (
          <button
            type="button"
            onClick={fetchSwapAlternatives}
            className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#FFF6DC] bg-[#8E0F18] hover:bg-[#B3141F] hover:shadow-xs active:scale-[0.97] border border-[#F4B400] rounded-xs transition-all cursor-pointer shrink-0 no-print"
            aria-label={`Find alternative stops to replace ${dest.name}`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-[#F4B400]" aria-hidden="true" />
            <span>Swap Stop</span>
          </button>
        )}
      </div>

      {/* Compact Travel Information status row */}
      {hasTravelInfo && (
        <div
          role="note"
          aria-label="Travel information and verification status"
          className="mb-3.5 px-3 py-1.5 bg-[#FFFDF5] border border-[#E5D5BA] rounded-xs text-xs text-[#2B1D14] flex flex-wrap items-center gap-x-2.5 gap-y-1"
        >
          <span className="font-bold text-[#8E0F18] flex items-center gap-1 text-[11px] uppercase tracking-wider shrink-0">
            <Info className="w-3.5 h-3.5 text-[#B22222]" aria-hidden="true" />
            <span>Travel information:</span>
          </span>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#5C4033]">
            {isDraft && (
              <span>Draft data, verify before travelling.</span>
            )}
            {isDraft && (isApproxCoords || otherWarnings.length > 0) && (
              <span className="text-[#E5D5BA]" aria-hidden="true">·</span>
            )}
            {isApproxCoords && (
              <span>Coordinates are approximate; verify exact monument entrance locally.</span>
            )}
            {isApproxCoords && otherWarnings.length > 0 && (
              <span className="text-[#E5D5BA]" aria-hidden="true">·</span>
            )}
            {otherWarnings.map((w, idx) => (
              <span key={idx} className="text-[#8E0F18] font-medium">
                {w}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      <p className="text-sm text-[#2B1D14] leading-relaxed mb-4">
        {dest.short_description}
      </p>

      {/* Why This Journey Explanation */}
      <div className="mb-4 p-3.5 bg-[#FFF6DC] border border-[#E2D2B4] rounded-xs">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#8E0F18] mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#F4B400]" aria-hidden="true" />
          <span>Why This Destination · ಪ್ರಯಾಣದ ಕಾರಣ</span>
        </h4>
        <ul className="space-y-1.5 text-xs text-[#2B1D14]">
          {stop.why_this_journey.map((reason, rIdx) => (
            <li key={rIdx} className="flex items-start gap-2">
              <span className="text-[#B3141F] font-bold">›</span>
              <span>{reason.text}</span>
            </li>
          ))}
          {stop.ai_selection_note && (
            <li className="flex items-start gap-2 text-[#8E0F18] font-medium pt-1 border-t border-[#E2D2B4]">
              <span className="text-[#F4B400] font-bold">★</span>
              <span>AI Ranking Note: {stop.ai_selection_note}</span>
            </li>
          )}
        </ul>
      </div>

      {/* Cultural details: Food, Craft, Festivals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 text-xs">
        {/* Local food */}
        {dest.local_food && dest.local_food.length > 0 && (
          <div className="p-3 bg-[#FFF6DC] border border-[#E2D2B4] rounded-xs">
            <div className="font-bold uppercase tracking-wider text-[#8E0F18] flex items-center gap-1.5 mb-1.5">
              <Utensils className="w-3.5 h-3.5 text-[#B3141F]" aria-hidden="true" />
              <span>Local Food · ಸ್ಥಳೀಯ ಆಹಾರ</span>
            </div>
            <p className="text-[#2B1D14] leading-relaxed">
              {dest.local_food.join(' · ')}
            </p>
          </div>
        )}

        {/* Local craft */}
        {dest.local_craft && dest.local_craft.trim().length > 0 && (
          <div className="p-3 bg-[#FFF6DC] border border-[#E2D2B4] rounded-xs">
            <div className="font-bold uppercase tracking-wider text-[#8E0F18] flex items-center gap-1.5 mb-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#B3141F]" aria-hidden="true" />
              <span>Craft & Handloom · ಕರಕುಶಲ</span>
            </div>
            <p className="text-[#2B1D14] leading-relaxed">{dest.local_craft}</p>
          </div>
        )}
      </div>

      {/* Cultural note */}
      {dest.cultural_note && dest.cultural_note.trim().length > 0 && (
        <div className="mb-4 p-3 bg-[#FFF6DC] border border-[#E2D2B4] rounded-xs text-xs">
          <span className="font-bold text-[#8E0F18] uppercase tracking-wider block mb-1">
            Cultural Context · ಸಾಂಸ್ಕೃತಿಕ ಹಿನ್ನೆಲೆ
          </span>
          <p className="text-[#2B1D14] leading-relaxed">{dest.cultural_note}</p>
        </div>
      )}

      {/* Festivals info */}
      {dest.festivals && dest.festivals.length > 0 && (
        <div className="mb-4 p-3 bg-[#FFF6DC] border border-[#E2D2B4] rounded-xs text-xs">
          <div className="font-bold uppercase tracking-wider text-[#8E0F18] flex items-center gap-1.5 mb-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#B3141F]" aria-hidden="true" />
            <span>Festivals & Celebrations · ಜಾತ್ರೆ & ಉತ್ಸವಗಳು</span>
          </div>
          <div className="space-y-1">
            {dest.festivals.map((fest, fIdx) => (
              <div key={fIdx} className="text-[#2B1D14]">
                <strong className="text-[#8E0F18]">{fest.name}</strong> ({fest.typical_month}):{' '}
                {fest.note}
              </div>
            ))}
            <p className="text-[11px] text-[#8E0F18] mt-1 font-semibold">
              Typical timing only. Dates change every year; verify locally before travelling.
            </p>
          </div>
        </div>
      )}

      {/* Kannada Phrase Pack with Web Speech button */}
      {dest.phrases && dest.phrases.length > 0 && (
        <div className="p-3.5 bg-[#FFF6DC] border border-[#F4B400] rounded-xs">
          <div className="flex items-center justify-between border-b border-[#E2D2B4] pb-2 mb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#8E0F18] flex items-center gap-1.5">
              <span>Kannada Phrase Pack · ಕನ್ನಡ ನುಡಿಗಟ್ಟುಗಳು</span>
            </h4>
            <span className="text-[10px] font-bold text-[#8E0F18] bg-[#FFF0C7] px-2 py-0.5 border border-[#F4B400] rounded-xs">
              Needs native-speaker review
            </span>
          </div>

          <div className="space-y-2.5">
            {dest.phrases.map((phrase, pIdx) => (
              <div
                key={pIdx}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-[#FFF0C7]/60 rounded-xs border border-[#E2D2B4]"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-kannada text-base font-bold text-[#8E0F18]">
                      {phrase.kannada}
                    </span>
                    <span className="text-xs text-[#2B1D14]/80 font-mono-tabular">
                      ({phrase.transliteration})
                    </span>
                  </div>
                  <p className="text-xs font-medium text-[#2B1D14] mt-0.5">
                    "{phrase.english}" · <span className="text-[#2B1D14]/75">{phrase.when_to_use}</span>
                  </p>
                </div>

                <div className="self-start sm:self-center shrink-0">
                  <KannadaSpeechButton
                    kannadaText={phrase.kannada}
                    transliteration={phrase.transliteration}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How to Reach & Verification Meta */}
      <div className="mt-4 pt-3 border-t border-[#E2D2B4] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-[#2B1D14]/75">
        <div>
          <span className="font-semibold text-[#8E0F18]">How to reach: </span>
          <span>{dest.how_to_reach}</span>
        </div>
        <div className="flex items-center gap-2 font-mono-tabular shrink-0">
          <span>Source: {dest.source}</span>
          <span>·</span>
          <span>Checked: {dest.last_checked}</span>
        </div>
      </div>

      {/* Swap alternatives modal drawer */}
      {showSwapDrawer && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`swap-title-${dest.id}`}
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
        >
          <div className="kasuti-border bg-[#FFF6DC] rounded-xs max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E2D2B4] pb-3 mb-4">
              <div>
                <h3
                  id={`swap-title-${dest.id}`}
                  className="text-lg font-bold text-[#8E0F18] font-kannada"
                >
                  ಬದಲಿ ತಾಣಗಳು · Swap Destination
                </h3>
                <p className="text-xs text-[#2B1D14]">
                  Alternatives to replace <strong>{dest.name}</strong> from dataset
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSwapDrawer(false)}
                className="text-xs px-2.5 py-1 bg-[#FFF0C7] border border-[#E2D2B4] text-[#2B1D14] hover:border-[#8E0F18] rounded-xs cursor-pointer font-bold"
              >
                Close ✕
              </button>
            </div>

            {swapLoading && (
              <p className="text-xs text-[#2B1D14] py-8 text-center animate-pulse">
                Filtering dataset alternatives within travel and pace caps...
              </p>
            )}

            {swapError && (
              <div className="p-3 bg-[#FFF0C7] border border-[#B3141F] rounded-xs text-xs text-[#8E0F18] mb-3">
                {swapError}
              </div>
            )}

            {!swapLoading && !swapError && swapCandidates.length === 0 && (
              <div className="py-6 text-center text-xs text-[#2B1D14]">
                <HelpCircle className="w-6 h-6 mx-auto text-[#B3141F] mb-2" aria-hidden="true" />
                <p className="font-semibold text-[#8E0F18]">No alternatives found within constraints.</p>
                <p className="mt-1 text-[#2B1D14]/80">
                  All other matching places are either already in this itinerary or exceed the daily pace cap.
                </p>
              </div>
            )}

            {!swapLoading && swapCandidates.length > 0 && (
              <div className="space-y-3">
                {swapCandidates.map((cand) => (
                  <div
                    key={cand.destination.id}
                    className="p-3 bg-[#FFF0C7]/70 border border-[#E2D2B4] rounded-xs flex flex-col justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-kannada font-bold text-sm text-[#8E0F18]">
                          {cand.destination.kannada_name} · {cand.destination.name}
                        </span>
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-[#FFF6DC] border border-[#F4B400] text-[#8E0F18] rounded-xs">
                          {cand.destination.popularity_tier === 3
                            ? 'Offbeat'
                            : cand.destination.popularity_tier === 2
                              ? 'Known'
                              : 'Famous'}
                        </span>
                      </div>
                      <p className="text-xs text-[#2B1D14]/85 mt-0.5">
                        {cand.destination.region} · {cand.destination.district} · Visit ~{cand.visit_duration_hours}h
                      </p>
                      <ul className="mt-2 text-xs text-[#2B1D14] space-y-0.5">
                        {cand.why_suitable.map((w, wIdx) => (
                          <li key={wIdx} className="flex items-start gap-1">
                            <span className="text-[#B3141F]">›</span>
                            <span>{w}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (onSwapDestination) {
                          onSwapDestination(dest.id, cand);
                        }
                        setShowSwapDrawer(false);
                      }}
                      className="mt-2 w-full py-1.5 px-3 bg-[#B3141F] text-[#FFF6DC] font-bold text-xs rounded-xs hover:bg-[#8E0F18] transition-colors border border-[#F4B400] cursor-pointer"
                    >
                      Swap with {cand.destination.name}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  );
};
