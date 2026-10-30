import React, { useEffect, useState } from 'react';
import { AlertCircle, ChevronDown, Compass, Sparkles } from 'lucide-react';
import { ChariotWheelSpinner } from './HeritageDecor.tsx';
import {
  BudgetPreference,
  ExperienceType,
  InterestTag,
  MonthName,
  OffbeatLevel,
  PaceLevel,
  PlanRequestInput,
  RegionName,
} from '../types.ts';

interface PlannerFormProps {
  selectedRegion: RegionName | '';
  onSubmitPlan: (input: PlanRequestInput) => Promise<void>;
  isLoading: boolean;
  externalValues?: Partial<PlanRequestInput>;
}

const INTEREST_OPTIONS: { id: InterestTag; label: string; kannada: string }[] = [
  { id: 'architecture', label: 'Temple & Stepwell Architecture', kannada: 'ವಾಸ್ತುಶಿಲ್ಪ' },
  { id: 'history', label: 'Forts & Inscriptions', kannada: 'ಇತಿಹಾಸ' },
  { id: 'nature', label: 'Forests, Waterfalls & Wildlife', kannada: 'ಪ್ರಕೃತಿ' },
  { id: 'trekking', label: 'Hill Trails & Climbs', kannada: 'ಚಾರಣ' },
  { id: 'coastal', label: 'Beaches & Coastal Islands', kannada: 'ಕರಾವಳಿ' },
  { id: 'spirituality', label: 'Sacred Towns & Basadis', kannada: 'ಅಧ್ಯಾತ್ಮ' },
  { id: 'crafts', label: 'Handlooms, Woodcraft & Bidri', kannada: 'ಕರಕುಶಲ' },
  { id: 'food', label: 'Regional Kitchens', kannada: 'ಆಹಾರ' },
  { id: 'photography', label: 'Scenic Landscapes & Monuments', kannada: 'ಛಾಯಾಗ್ರಹಣ' },
  { id: 'quiet_retreat', label: 'Offbeat Villages & Solitude', kannada: 'ಶಾಂತ ತಾಣ' },
];

const MONTHS: MonthName[] = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const PlannerForm: React.FC<PlannerFormProps> = ({
  selectedRegion,
  onSubmitPlan,
  isLoading,
  externalValues,
}) => {
  const [days, setDays] = useState<number>(3);
  const [travelMonth, setTravelMonth] = useState<MonthName>('November');
  const [interests, setInterests] = useState<InterestTag[]>([
    'architecture',
    'history',
    'quiet_retreat',
  ]);

  // Options in collapsed "More options" section
  const [pace, setPace] = useState<PaceLevel>('normal');
  const [offbeatLevel, setOffbeatLevel] = useState<OffbeatLevel>('balanced');
  const [budgetPreference, setBudgetPreference] = useState<BudgetPreference>('moderate');
  const [startingPoint, setStartingPoint] = useState<string>('');
  const [specialRequest, setSpecialRequest] = useState<string>('');
  const [disableAi, setDisableAi] = useState<boolean>(false);
  const [showMoreOptions, setShowMoreOptions] = useState<boolean>(false);

  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync external values when triggered by relax actions
  useEffect(() => {
    if (externalValues) {
      if (typeof externalValues.days === 'number') setDays(externalValues.days);
      if (externalValues.travel_month) setTravelMonth(externalValues.travel_month);
      if (externalValues.interests) setInterests(externalValues.interests);
      if (externalValues.pace) setPace(externalValues.pace);
      if (externalValues.offbeat_level) setOffbeatLevel(externalValues.offbeat_level);
      if (externalValues.budget_preference) setBudgetPreference(externalValues.budget_preference);
      if (typeof externalValues.starting_point === 'string') setStartingPoint(externalValues.starting_point);
      if (typeof externalValues.special_request === 'string') setSpecialRequest(externalValues.special_request);
      if (typeof externalValues.disable_ai === 'boolean') setDisableAi(externalValues.disable_ai);
    }
  }, [externalValues]);

  const toggleInterest = (tag: InterestTag) => {
    setValidationError(null);
    setInterests((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (days < 1 || !Number.isInteger(days)) {
      setValidationError('Please choose a trip length of 1 or more days.');
      return;
    }

    if (interests.length === 0) {
      setValidationError('Please select at least one interest to match destinations.');
      return;
    }

    if (specialRequest.length > 200) {
      setValidationError('Special request must be 200 characters or fewer.');
      return;
    }

    // Automatically map primary theme based on selected interests for backend consistency
    let experienceType: ExperienceType = 'all_rounder';
    if (interests.includes('coastal') && interests.length <= 2) {
      experienceType = 'coastal_slow';
    } else if ((interests.includes('nature') || interests.includes('trekking')) && interests.length <= 3) {
      experienceType = 'nature_mist';
    } else if ((interests.includes('crafts') || interests.includes('food')) && interests.length <= 3) {
      experienceType = 'cultural_craft';
    } else if (interests.includes('architecture') || interests.includes('history')) {
      experienceType = 'heritage_immersion';
    }

    await onSubmitPlan({
      days,
      budget_preference: budgetPreference,
      interests,
      experience_type: experienceType,
      travel_month: travelMonth,
      offbeat_level: offbeatLevel,
      pace,
      starting_region: selectedRegion,
      starting_point: startingPoint.trim(),
      special_request: specialRequest.trim(),
      disable_ai: disableAi,
    });
  };

  return (
    <section
      id="planner-form-section"
      aria-labelledby="planner-heading"
      className="my-6 kasuti-border bg-[#FFFDF5]/90 p-5 sm:p-7 rounded-xs no-print shadow-xs"
    >
      <div className="border-b border-[#E5D5BA] pb-3.5 mb-5">
        <h2
          id="planner-heading"
          className="text-2xl sm:text-3xl font-bold text-[#B22222] font-kannada leading-tight"
        >
          ನಿಮ್ಮ ಪ್ರಯಾಣವನ್ನು ರೂಪಿಸಿ
        </h2>
        {/* Exact subtitle required: "Plan Your Karnataka Journey" */}
        <p className="text-sm sm:text-base font-bold text-[#2B1D14] mt-0.5">
          Plan Your Karnataka Journey
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Main Screen: Only Trip length, Travel month, Interest chips, and Generate button */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="days-input"
              className="block text-xs font-bold uppercase tracking-wider text-[#B22222] mb-1.5"
            >
              Trip Length (Days)
            </label>
            <div className="flex items-center gap-2">
              <input
                id="days-input"
                type="number"
                min={1}
                value={days}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setDays(Number.isNaN(val) ? 1 : val);
                }}
                className="w-full px-3.5 py-2.5 text-base bg-[#FFF8E7] border-2 border-[#F2A900] rounded-xs text-[#2B1D14] font-bold font-mono-tabular focus:border-[#B22222]"
              />
              <span className="text-sm font-bold text-[#2B1D14] whitespace-nowrap">Days</span>
            </div>
            <p className="text-xs font-medium text-[#2B1D14] mt-1">
              Any length of 1 or more days.
            </p>
          </div>

          <div>
            <label
              htmlFor="month-select"
              className="block text-xs font-bold uppercase tracking-wider text-[#B22222] mb-1.5"
            >
              Travel Month
            </label>
            <select
              id="month-select"
              value={travelMonth}
              onChange={(e) => setTravelMonth(e.target.value as MonthName)}
              className="w-full px-3.5 py-2.5 text-sm bg-[#FFF8E7] border-2 border-[#F2A900] rounded-xs text-[#2B1D14] font-semibold focus:border-[#B22222]"
            >
              {MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <p className="text-xs font-medium text-[#2B1D14] mt-1">
              Matches weather suitability and seasonal festivals.
            </p>
          </div>
        </div>

        {/* Interest Chips */}
        <fieldset className="p-4 bg-[#FFF8E7] border border-[#E5D5BA] rounded-xs">
          <legend className="text-xs font-bold uppercase tracking-wider text-[#B22222] px-1">
            Select Your Interests (Choose 1 or more)
          </legend>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
            {INTEREST_OPTIONS.map((item) => {
              const active = interests.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleInterest(item.id)}
                  aria-pressed={active}
                  className={`relative px-3 py-2 text-left rounded-xs border transition-all duration-200 cursor-pointer hover:-translate-y-0.5 active:scale-[0.97] ${
                    active
                      ? 'bg-[#B22222] text-[#FFF8E7] border-[#F2A900] shadow-xs animate-chip-selected'
                      : 'bg-[#FFF2D6]/70 text-[#2B1D14] border-[#E5D5BA] hover:border-[#F2A900] hover:bg-[#FFF2D6]'
                  }`}
                >
                  <div className="text-xs font-kannada font-bold opacity-90">{item.kannada}</div>
                  <div className="text-xs font-bold leading-tight mt-0.5">{item.label}</div>
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Collapsed "More options" Section (Closed by default) */}
        <div className="border border-[#E5D5BA] rounded-xs bg-[#FFF8E7]/60 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowMoreOptions((prev) => !prev)}
            aria-expanded={showMoreOptions}
            className="w-full p-3.5 flex items-center justify-between text-left text-xs font-bold uppercase tracking-wider text-[#B22222] hover:bg-[#FFF2D6]/70 transition-colors cursor-pointer select-none"
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#F2A900]" aria-hidden="true" />
              <span>More Options (Daily pace, offbeat level, budget, starting point & rules mode)</span>
            </span>
            <ChevronDown
              className={`w-4 h-4 text-[#B22222] transition-transform duration-200 ${
                showMoreOptions ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            />
          </button>

          {showMoreOptions && (
            <div className="p-4 sm:p-5 pt-1 border-t border-[#E5D5BA] space-y-5 bg-[#FFFDF5]">
              {/* Daily Pace & Offbeat Preference */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="pace-select"
                    className="block text-xs font-bold uppercase tracking-wider text-[#B22222] mb-1.5"
                  >
                    Daily Sightseeing Pace & Cap
                  </label>
                  <select
                    id="pace-select"
                    value={pace}
                    onChange={(e) => setPace(e.target.value as PaceLevel)}
                    className="w-full px-3.5 py-2.5 text-sm bg-[#FFF8E7] border-2 border-[#F2A900] rounded-xs text-[#2B1D14] font-semibold focus:border-[#B22222]"
                  >
                    <option value="relaxed">Relaxed (Max 5.5h/day · 1 stop/day)</option>
                    <option value="normal">Normal (Max 7.5h/day · up to 2 stops/day)</option>
                    <option value="packed">Packed (Max 9.5h/day · up to 3 stops/day)</option>
                  </select>
                  <p className="text-xs font-medium text-[#2B1D14] mt-1">
                    Caps visit time plus travel transfer hours.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="offbeat-select"
                    className="block text-xs font-bold uppercase tracking-wider text-[#B22222] mb-1.5"
                  >
                    Offbeat Preference
                  </label>
                  <select
                    id="offbeat-select"
                    value={offbeatLevel}
                    onChange={(e) => setOffbeatLevel(e.target.value as OffbeatLevel)}
                    className="w-full px-3.5 py-2.5 text-sm bg-[#FFF8E7] border-2 border-[#F2A900] rounded-xs text-[#2B1D14] font-semibold focus:border-[#B22222]"
                  >
                    <option value="balanced">Balanced (Mix famous anchors with offbeat stops)</option>
                    <option value="classic">Classic (Prioritise famous icons)</option>
                    <option value="offbeat">Offbeat (Prioritise quiet offbeat stepwells & forts)</option>
                  </select>
                  <p className="text-xs font-medium text-[#2B1D14] mt-1">
                    Editorial classifications: Famous, Known, and Offbeat.
                  </p>
                </div>
              </div>

              {/* Budget Preference */}
              <div>
                <label
                  htmlFor="budget-select"
                  className="block text-xs font-bold uppercase tracking-wider text-[#B22222] mb-1.5"
                >
                  Budget Preference (Per Person, Per Day)
                </label>
                <select
                  id="budget-select"
                  value={budgetPreference}
                  onChange={(e) => setBudgetPreference(e.target.value as BudgetPreference)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FFF8E7] border-2 border-[#F2A900] rounded-xs text-[#2B1D14] font-semibold focus:border-[#B22222]"
                >
                  <option value="budget">Budget (Focuses on low-cost stops & village dining)</option>
                  <option value="moderate">Moderate (Includes low and medium cost destinations)</option>
                  <option value="comfort">Flexible / Comfort (Accommodates all cost levels)</option>
                </select>
                <p className="text-xs font-medium text-[#2B1D14] mt-1">
                  Qualitative assessment for daytime local food and transit.
                </p>
              </div>

              {/* Starting Region & Starting Town */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="starting-region-display"
                    className="block text-xs font-bold uppercase tracking-wider text-[#B22222] mb-1.5"
                  >
                    Starting Region (Optional)
                  </label>
                  <div
                    id="starting-region-display"
                    className="px-3.5 py-2.5 text-sm bg-[#FFF8E7] border border-[#E5D5BA] rounded-xs text-[#2B1D14] font-medium"
                  >
                    {selectedRegion ? (
                      <span className="font-bold text-[#B22222]">{selectedRegion}</span>
                    ) : (
                      <span>Any Region (Leave open or choose below)</span>
                    )}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="starting-point-input"
                    className="block text-xs font-bold uppercase tracking-wider text-[#B22222] mb-1.5"
                  >
                    Starting Town / City (Optional)
                  </label>
                  <input
                    id="starting-point-input"
                    type="text"
                    maxLength={80}
                    value={startingPoint}
                    onChange={(e) => setStartingPoint(e.target.value)}
                    placeholder="e.g., Gadag, Mysuru, Udupi, Bidar"
                    className="w-full px-3.5 py-2.5 text-sm bg-[#FFF8E7] border border-[#F2A900] rounded-xs text-[#2B1D14] font-medium focus:border-[#B22222]"
                  />
                </div>
              </div>

              {/* Special Request */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="special-request-input"
                    className="block text-xs font-bold uppercase tracking-wider text-[#B22222]"
                  >
                    Special Request (Optional)
                  </label>
                  <span className="text-xs font-mono font-bold text-[#B22222]">
                    {specialRequest.length}/200 chars
                  </span>
                </div>
                <input
                  id="special-request-input"
                  type="text"
                  maxLength={200}
                  value={specialRequest}
                  onChange={(e) => setSpecialRequest(e.target.value)}
                  placeholder="e.g., Prefer stepwells and quiet handloom towns"
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FFF8E7] border border-[#F2A900] rounded-xs text-[#2B1D14] font-medium focus:border-[#B22222]"
                />
              </div>

              {/* Force Rules-Based Planner Checkbox */}
              <div className="pt-2 border-t border-[#E5D5BA]">
                <label className="inline-flex items-center gap-2 text-xs font-bold text-[#2B1D14] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={disableAi}
                    onChange={(e) => setDisableAi(e.target.checked)}
                    className="w-4 h-4 accent-[#B22222]"
                  />
                  <span>
                    Force Rules-Based Planner (Skip Gemini AI ranking and run 100% deterministic rules)
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>

        {validationError && (
          <div
            role="alert"
            className="p-3.5 bg-[#B22222]/10 border border-[#B22222] rounded-xs text-xs font-bold text-[#B22222] flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 text-[#B22222] shrink-0" aria-hidden="true" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Generate Button on Main Screen */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="relative overflow-hidden w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 text-sm sm:text-base font-bold bg-[#B22222] text-[#FFF8E7] border-2 border-[#F2A900] rounded-xs hover:bg-[#8B0000] hover:shadow-[0_0_22px_rgba(242,169,0,0.38)] active:scale-[0.98] disabled:opacity-60 transition-all cursor-pointer shadow-sm animate-gentle-pulse group"
          >
            {/* Subtle animated highlight sweep */}
            <span className="btn-shimmer-gleam" aria-hidden="true" />
            {isLoading ? (
              <>
                <ChariotWheelSpinner size={22} />
                <span>Planning Your Journey…</span>
              </>
            ) : (
              <>
                <Compass className="w-5 h-5 text-[#F2A900] transition-transform duration-300 group-hover:rotate-45" aria-hidden="true" />
                <span>Generate Itinerary</span>
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
};
