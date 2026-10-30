import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  ChevronDown,
  Compass,
  Copy,
  FileText,
  HelpCircle,
  MapPin,
  Moon,
  Printer,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { DestinationCard } from './components/DestinationCard.tsx';
import {
  ChariotWheelSpinner,
  HoysalaDivider,
  LotusDayBadge,
  PersonalPhotoFrame,
} from './components/HeritageDecor.tsx';
import { ItineraryMap } from './components/ItineraryMap.tsx';
import { KarnatakaAnimatedBackground } from './components/KarnatakaAnimatedBackground.tsx';
import { PlannerForm } from './components/PlannerForm.tsx';
import { RegionCards } from './components/RegionCards.tsx';
import {
  Destination,
  InterestTag,
  PlanRequestInput,
  PlanResponse,
  RegionName,
  SwapCandidate,
} from './types.ts';

export default function App() {
  const [places, setPlaces] = useState<Destination[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<RegionName | ''>('');
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [lastInput, setLastInput] = useState<PlanRequestInput | null>(null);
  const [formValues, setFormValues] = useState<Partial<PlanRequestInput>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Initial load: Fetch destinations and check for share token in URL hash or query
  useEffect(() => {
    fetch('/api/places')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load places');
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data.places)) {
          setPlaces(data.places);
        }
      })
      .catch((err) => {
        console.error('Error loading places:', err);
      });

    // Check URL parameters for share token
    const urlParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash.replace('#', '');
    const token = urlParams.get('plan') || hash;

    if (token) {
      setIsLoading(true);
      fetch('/api/share/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
        .then((res) => {
          if (!res.ok) throw new Error('Shared plan could not be restored');
          return res.json();
        })
        .then((restoredPlan: PlanResponse) => {
          setPlan(restoredPlan);
        })
        .catch((err) => {
          console.error('Error restoring plan:', err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, []);

  const handleGeneratePlan = async (input: PlanRequestInput) => {
    setIsLoading(true);
    setPlanError(null);
    setLastInput(input);
    setFormValues(input);

    try {
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || 'Failed to create plan.');
      }

      setPlan(data);
      // Update browser URL hash with share token for instant bookmarking
      if (data.share_token) {
        window.history.replaceState(null, '', `#${data.share_token}`);
      }

      // Smooth scroll to results
      setTimeout(() => {
        document.getElementById('itinerary-results')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : 'An error occurred during planning.');
    } finally {
      setIsLoading(false);
    }
  };

  // One-tap buttons to relax filters and regenerate
  const handleRelaxFilter = (type: 'month' | 'tier' | 'interests') => {
    if (!lastInput) return;

    let updatedInput: PlanRequestInput = { ...lastInput };

    if (type === 'month') {
      updatedInput.travel_month = 'November';
    } else if (type === 'tier') {
      updatedInput.offbeat_level = 'balanced';
    } else if (type === 'interests') {
      const combined: InterestTag[] = Array.from(
        new Set([...updatedInput.interests, 'architecture', 'history', 'nature', 'crafts', 'food'])
      ) as InterestTag[];
      updatedInput.interests = combined;
    }

    setFormValues(updatedInput);
    handleGeneratePlan(updatedInput);
  };

  const handleConfirmSwap = (oldId: string, newCandidate: SwapCandidate) => {
    if (!plan) return;

    const updatedDays = plan.days.map((day) => {
      const stopIndex = day.stops.findIndex((s) => s.destination.id === oldId);
      if (stopIndex === -1) return day;

      const newStops = [...day.stops];
      const oldStop = newStops[stopIndex];

      newStops[stopIndex] = {
        ...oldStop,
        destination: newCandidate.destination,
        visit_duration_hours: newCandidate.visit_duration_hours,
        why_this_journey: newCandidate.why_suitable.map((text) => ({
          criterion: 'interest_match' as const,
          text,
        })),
        ai_selection_note: 'Manual destination swap applied from verified dataset.',
      };

      return {
        ...day,
        stops: newStops,
      };
    });

    setPlan({
      ...plan,
      days: updatedDays,
    });
  };

  const handleCopyShareLink = () => {
    if (!plan?.share_token) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?plan=${plan.share_token}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleReset = () => {
    setPlan(null);
    setPlanError(null);
    window.history.replaceState(null, '', window.location.pathname);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const allItineraryIds = plan ? plan.days.flatMap((d) => d.stops.map((s) => s.destination.id)) : [];

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF8E7]/30 text-[#2B1D14] relative">
      {/* 1. Animated Karnataka Travel Background */}
      <KarnatakaAnimatedBackground />

      {/* Header / Hero with Karnataka Flag-inspired Bands: Yellow above, Red below, with Kannada Wordmark */}
      <header className="relative w-full border-b border-[#E5D5BA]/80 overflow-hidden no-print">
        {/* Flag Bands: Turmeric Yellow top band, Kumkuma Red bottom band with subtle shimmer */}
        <div className="w-full relative overflow-hidden">
          <div className="h-5 sm:h-6 bg-[#F2A900] w-full relative">
            <div className="absolute inset-0 flag-shimmer-band pointer-events-none" aria-hidden="true" />
          </div>
          <div className="h-5 sm:h-6 bg-[#B22222] w-full relative">
            <div className="absolute inset-0 flag-shimmer-band pointer-events-none" aria-hidden="true" />
          </div>
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-6">
          {/* Gentle animated gradient behind hero content */}
          <div className="absolute inset-0 hero-ambient-glow pointer-events-none" aria-hidden="true" />

          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="font-kannada text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#B22222] tracking-tight animate-title-fade drop-shadow-2xs">
                  ನಮ್ಮ ದಾರಿ
                </span>
                <span
                  className="text-xl sm:text-2xl font-bold text-[#2B1D14] tracking-wide"
                  style={{ animation: 'cardFadeRise 0.7s ease-out 0.12s both' }}
                >
                  NAMMA DAARI
                </span>
              </div>
              <p
                className="text-sm sm:text-base font-semibold text-[#B22222] mt-1 font-kannada"
                style={{ animation: 'cardFadeRise 0.7s ease-out 0.22s both' }}
              >
                Offbeat Karnataka, planned honestly.
              </p>
              <p
                className="text-xs sm:text-sm text-[#2B1D14] mt-0.5 max-w-2xl font-medium"
                style={{ animation: 'cardFadeRise 0.7s ease-out 0.32s both' }}
              >
                Honest, personalized travel planner for Karnataka. Discover ancient stepwells, Hoysala stone craft, Western Ghats trails, and coastal retreats.
              </p>
            </div>
            {/* Badges removed as requested */}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* Simplified Form placed directly on top */}
        <div className="no-print">
          <PlannerForm
            selectedRegion={selectedRegion}
            onSubmitPlan={handleGeneratePlan}
            isLoading={isLoading}
            externalValues={formValues}
          />
        </div>

        {/* Planning Error Display */}
        {planError && (
          <div
            role="alert"
            className="my-6 p-4 bg-[#FFF2D6] border-2 border-[#B22222] rounded-xs text-[#B22222] flex items-start gap-3 shadow-xs"
          >
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-[#B22222]" aria-hidden="true" />
            <div>
              <p className="font-bold text-sm">Could Not Generate Itinerary</p>
              <p className="text-xs mt-1 text-[#2B1D14] font-medium">{planError}</p>
            </div>
          </div>
        )}

        {/* Loading State with Spinning Chariot Wheel */}
        {isLoading && (
          <div
            role="status"
            aria-live="polite"
            className="my-12 p-8 kasuti-border bg-[#FFFDF5]/90 rounded-xs text-center space-y-3 no-print"
          >
            <div className="w-12 h-12 mx-auto flex items-center justify-center">
              <ChariotWheelSpinner size={44} />
            </div>
            <h3 className="text-lg font-bold text-[#B22222] font-kannada">
              ಪ್ರಯಾಣದ ಮಾರ್ಗವನ್ನು ಸಿದ್ಧಪಡಿಸಲಾಗುತ್ತಿದೆ...
            </h3>
            <p className="text-xs text-[#2B1D14] font-medium max-w-md mx-auto">
              Checking regional distances, applying pace caps, and grouping nearby destinations.
            </p>
          </div>
        )}

        {/* Generated Itinerary Section */}
        {plan && !isLoading && (
          <section id="itinerary-results" aria-labelledby="itinerary-heading" className="my-8 space-y-8">
            {/* Status & Plan Meta Banner */}
            <div className="kasuti-border-red bg-[#FFFDF5] p-5 sm:p-6 rounded-xs space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5D5BA] pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xs text-xs font-bold uppercase tracking-wider border ${
                        plan.plan_source === 'ai_ranked'
                          ? 'bg-[#B22222] text-[#FFF8E7] border-[#F2A900]'
                          : 'bg-[#8B0000] text-[#FFF8E7] border-[#E5D5BA]'
                      }`}
                    >
                      {plan.plan_source === 'ai_ranked' ? (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-[#F2A900]" aria-hidden="true" />
                          <span>Planned with AI ranking</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 text-[#F2A900]" aria-hidden="true" />
                          <span>Planned without AI</span>
                        </>
                      )}
                    </span>

                    <span className="text-xs font-bold px-2.5 py-1 bg-[#FFF8E7] border border-[#E5D5BA] text-[#2B1D14] rounded-xs font-mono-tabular">
                      {plan.actual_days} Day{plan.actual_days === 1 ? '' : 's'} Planned
                    </span>

                    <span className="text-xs font-semibold px-2.5 py-1 bg-[#FFF8E7] border border-[#E5D5BA] text-[#B22222] rounded-xs capitalize">
                      {plan.offbeat_level} Mode
                    </span>

                    <span className="text-xs font-semibold px-2.5 py-1 bg-[#FFF8E7] border border-[#E5D5BA] text-[#2B1D14] rounded-xs capitalize">
                      {plan.pace} Pace (Max {plan.daily_hour_cap}h/day)
                    </span>
                  </div>

                  <h2
                    id="itinerary-heading"
                    className="text-2xl sm:text-3xl font-bold text-[#B22222] font-kannada"
                  >
                    ನಿಮ್ಮ ಕರ್ನಾಟಕ ಪ್ರವಾಸ ವಿವರಣೆ
                  </h2>
                  <p className="text-xs sm:text-sm font-semibold text-[#2B1D14] mt-0.5">
                    Your Personalized Karnataka Itinerary — {plan.travel_month} Departure
                  </p>
                </div>

                {/* Print and Share Action Buttons in Red and Yellow */}
                <div className="flex flex-wrap items-center gap-2 self-start md:self-center no-print">
                  <button
                    type="button"
                    onClick={handleCopyShareLink}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-[#2B1D14] bg-[#FFF8E7] hover:bg-[#F2A900] border border-[#F2A900] rounded-xs transition-colors cursor-pointer"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#B22222]" aria-hidden="true" />
                        <span>Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#B22222]" aria-hidden="true" />
                        <span>Share Plan</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-[#FFF8E7] bg-[#B22222] hover:bg-[#8B0000] border border-[#F2A900] rounded-xs transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#F2A900]" aria-hidden="true" />
                    <span>Print / Save PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#B22222] bg-[#FFF2D6] hover:bg-[#FFF8E7] border border-[#E5D5BA] rounded-xs transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Plan Another</span>
                  </button>
                </div>
              </div>

              {/* Shorter Plan Notice: Required Exact Message */}
              {plan.is_shorter_than_requested && (
                <div
                  role="note"
                  aria-label="Shorter plan notice"
                  className="p-4 bg-[#FFF8E7] border-l-4 border-[#B22222] rounded-xs text-xs space-y-3"
                >
                  <div className="flex items-start gap-2 text-[#B22222] font-bold text-sm">
                    <AlertTriangle className="w-5 h-5 text-[#B22222] shrink-0 mt-0.5" aria-hidden="true" />
                    <span>
                      {plan.shorter_plan_explanation ||
                        `We found ${plan.actual_days} days of matching places. Add more interests or relax your filters to extend it.`}
                    </span>
                  </div>

                  <p className="text-xs text-[#2B1D14] font-medium pl-7">
                    Namma Daari never repeats a place and never pads with unrelated places. Tap any button below to quickly extend your journey:
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pl-7 pt-1 no-print">
                    <button
                      type="button"
                      onClick={() => handleRelaxFilter('interests')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#B22222] text-[#FFF8E7] font-bold rounded-xs border border-[#F2A900] hover:bg-[#8B0000] transition-colors cursor-pointer text-xs"
                    >
                      <Zap className="w-3.5 h-3.5 text-[#F2A900]" aria-hidden="true" />
                      <span>Add More Interests</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRelaxFilter('tier')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#FFF2D6] text-[#B22222] font-bold rounded-xs border border-[#B22222] hover:bg-[#B22222] hover:text-[#FFF8E7] transition-colors cursor-pointer text-xs"
                    >
                      <Zap className="w-3.5 h-3.5 text-[#F2A900]" aria-hidden="true" />
                      <span>Switch to Balanced Tier</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRelaxFilter('month')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#FFF2D6] text-[#B22222] font-bold rounded-xs border border-[#B22222] hover:bg-[#B22222] hover:text-[#FFF8E7] transition-colors cursor-pointer text-xs"
                    >
                      <Zap className="w-3.5 h-3.5 text-[#F2A900]" aria-hidden="true" />
                      <span>Relax Season (November Peak)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Personal Photo Upload Frame (Hides empty frame until an image is added) */}
              <div className="no-print pt-1">
                <PersonalPhotoFrame />
              </div>
            </div>

            {/* Interactive Leaflet Journey Map with Authentic Karnataka Boundary */}
            <ItineraryMap days={plan.days} />

            {/* Day-by-Day Stops Timeline */}
            <div className="space-y-10">
              {plan.days.map((day, idx) => (
                <section
                  key={day.day_number}
                  aria-labelledby={`day-heading-${day.day_number}`}
                  className="space-y-4 print-break-inside-avoid"
                  style={{ animation: 'daySlideUp 0.5s ease-out both', animationDelay: `${idx * 0.1}s` }}
                >
                  {/* Day Header with Lotus Maroon Badge & Overnight Base Town */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-[#B22222] pb-3">
                    <div className="flex items-center gap-3">
                      <LotusDayBadge dayNumber={day.day_number} />
                      <div>
                        <h3
                          id={`day-heading-${day.day_number}`}
                          className="text-xl sm:text-2xl font-bold text-[#B22222] font-kannada"
                        >
                          {day.day_theme}
                        </h3>
                        <div className="text-xs text-[#2B1D14] font-medium flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                          <span>
                            Focus Region: <strong>{day.region_focus}</strong>
                          </span>
                          {day.overnight_base && (
                            <>
                              <span>·</span>
                              <span className="flex items-center gap-1 text-[#B22222] font-semibold">
                                <Moon className="w-3.5 h-3.5 text-[#B22222]" aria-hidden="true" />
                                <span>Suggested Overnight Base: <strong>{day.overnight_base}</strong></span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono-tabular text-[#2B1D14] bg-[#FFF2D6] px-3 py-1.5 border border-[#E5D5BA] rounded-xs self-start sm:self-center font-medium">
                      <span>Visits: ~{day.total_visit_hours}h</span>
                      <span>+</span>
                      <span>Transfers: ~{day.total_approx_travel_hours}h</span>
                      <span>=</span>
                      <strong className="text-[#B22222]">
                        ~{day.total_scheduled_hours}h / {day.daily_hour_cap}h max
                      </strong>
                    </div>
                  </div>

                  {/* Day Stops with connecting travel legs */}
                  <div className="space-y-4 pl-0 sm:pl-4">
                    {day.stops.map((stop, sIdx) => (
                      <React.Fragment key={stop.destination.id}>
                        {/* Connecting route segment between stops */}
                        {sIdx > 0 && (
                          <div
                            className="flex items-center gap-2.5 pl-3 py-1 text-xs text-[#2B1D14]/80 select-none"
                            aria-hidden="true"
                          >
                            <div className="w-2 h-2 rounded-full bg-[#F2A900] border border-[#B22222] shadow-2xs shrink-0 animate-pulse" />
                            <div className="h-0.5 w-12 sm:w-20 bg-gradient-to-r from-[#F2A900] via-[#B22222] to-[#E5D5BA] rounded-full" />
                            <span className="font-mono-tabular text-[10px] sm:text-[11px] font-semibold text-[#8E0F18] bg-[#FFF8E7] px-2.5 py-0.5 border border-[#E5D5BA] rounded-xs shadow-2xs">
                              ↓ Journey leg · {stop.travel_estimate_label}
                            </span>
                          </div>
                        )}
                        <DestinationCard
                          stop={stop}
                          dayNumber={day.day_number}
                          totalDays={plan.actual_days}
                          allItineraryIds={allItineraryIds}
                          remainingHoursInDay={Math.max(
                            0,
                            day.daily_hour_cap - day.total_scheduled_hours
                          )}
                          selectedInterests={lastInput?.interests || ['architecture', 'history']}
                          offbeatLevel={plan.offbeat_level}
                          travelMonth={plan.travel_month}
                          onSwapDestination={handleConfirmSwap}
                          indexInDay={sIdx}
                        />
                      </React.Fragment>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </section>
        )}

        <HoysalaDivider />

        {/* Item 4: ONE single collapsed section at the bottom containing 
            Honest Planning Constraints, the 5 Cultural Regions, and How This Works */}
        <section aria-labelledby="all-notes-heading" className="no-print my-8">
          <details className="kasuti-border bg-[#FFFDF5]/90 rounded-xs group overflow-hidden">
            <summary className="p-4 sm:p-5 cursor-pointer font-bold text-sm sm:text-base text-[#B22222] flex items-center justify-between select-none hover:bg-[#FFF2D6]/80 transition-colors">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#B22222]" aria-hidden="true" />
                <span id="all-notes-heading">
                  ಕರ್ನಾಟಕದ ವಲಯಗಳು, ನಿಯಮಗಳು ಮತ್ತು ಮಾಹಿತಿ · Karnataka Regions, Planning Constraints & How This Works
                </span>
              </div>
              <ChevronDown
                className="w-4 h-4 text-[#B22222] transition-transform duration-200 group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>

            <div className="p-5 sm:p-7 pt-4 border-t border-[#E5D5BA] space-y-8 bg-[#FFF8E7]/50">
              {/* Part 1: Honest Planning Constraints */}
              <div className="p-4 bg-[#FFFDF5] border border-[#E5D5BA] rounded-xs space-y-2 text-xs text-[#2B1D14]">
                <div className="flex items-center gap-2 text-[#B22222] font-bold text-sm">
                  <ShieldCheck className="w-4 h-4 text-[#B22222]" aria-hidden="true" />
                  <h4>Honest Planning Constraints</h4>
                </div>
                <p className="font-medium leading-relaxed">
                  <strong>1. No Repeated Places:</strong> Namma Daari never schedules the same destination twice and never pads with unrelated places. If fewer places match your choices, the plan will honestly cover fewer days.
                </p>
                <p className="font-medium leading-relaxed">
                  <strong>2. Travel Estimates:</strong> Distances use straight-line distance × road factor (1.35× on plains, 1.51× in Malnad ghats). Actual road condition and ghat accessibility are unverified.
                </p>
              </div>

              {/* Part 2: The 5 Cultural Regions */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[#B22222] font-bold text-sm">
                  <MapPin className="w-4 h-4 text-[#B22222]" aria-hidden="true" />
                  <h4>ಕರ್ನಾಟಕದ ೫ ಸಾಂಸ್ಕೃತಿಕ ವಲಯಗಳು · Explore Karnataka's 5 Cultural Regions</h4>
                </div>
                <RegionCards
                  selectedRegion={selectedRegion}
                  onSelectRegion={setSelectedRegion}
                  places={places}
                />
              </div>

              {/* Part 3: Editorial Integrity & How This Works */}
              <div className="p-4 bg-[#FFFDF5] border border-[#E5D5BA] rounded-xs space-y-4 text-xs text-[#2B1D14]">
                <div className="flex items-center gap-2 text-[#B22222] font-bold text-sm">
                  <FileText className="w-4 h-4 text-[#B22222]" aria-hidden="true" />
                  <h4>Editorial Integrity & How This Works</h4>
                </div>
                <div className="space-y-2 font-medium leading-relaxed">
                  <p>
                    • <strong>Dataset-First:</strong> Every recommendation comes exclusively from our verified, curated dataset. Gemini AI may rank or order candidates, but it can never introduce destinations outside the shortlist.
                  </p>
                  <p>
                    • <strong>Works Without AI:</strong> If Gemini is unavailable or times out, a full rules-based itinerary is generated independently.
                  </p>
                  <p>
                    • <strong>Classifications:</strong> Famous, Known, and Offbeat are editorial classifications designed to distribute footfall sustainably, not commercial visitor statistics.
                  </p>
                  <p>
                    • <strong>Budget Modeling:</strong> Qualitative daytime local food and transit per person, per day. Accommodation tariffs and flights are excluded.
                  </p>
                </div>
              </div>
            </div>
          </details>
        </section>
      </main>

      {/* Footer in Red & Yellow Heritage Style without Technical File Paths */}
      <footer className="mt-16 border-t border-[#E5D5BA] bg-[#FFF2D6]/90 py-8 px-4 sm:px-6 no-print">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-[#2B1D14]">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-kannada text-lg font-bold text-[#B22222]">ನಮ್ಮ ದಾರಿ</span>
              <span className="font-bold text-[#2B1D14]">Namma Daari</span>
            </div>
            <p className="text-xs text-[#2B1D14] mt-0.5 font-medium">
              Offbeat Karnataka, planned honestly. Designed with Karnataka heritage motifs, turmeric yellow and kumkuma red.
            </p>
            <p className="text-xs text-[#2B1D14]/85 mt-1">
              Boundary: DataMeet / GADM (ODbL open license) · Tiles: OpenStreetMap contributors. No telemetry or tracking.
            </p>
          </div>

          <div className="text-xs text-[#2B1D14] font-medium flex flex-col sm:flex-row sm:items-center gap-3">
            <span>Server-side rules engine & optional Gemini ranking</span>
            <span>·</span>
            <span>Curated Karnataka places dataset</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
