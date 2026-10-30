import { MAX_TRIP_DAYS } from '../src/config.ts';
import {
  BudgetAssessment,
  BudgetPreference,
  Destination,
  ExperienceType,
  InterestTag,
  ItineraryDay,
  MonthName,
  OffbeatLevel,
  PaceLevel,
  PlanRequestInput,
  PlanResponse,
  RegionName,
  ScheduledStop,
  SwapCandidate,
  SwapRequestInput,
  SwapResponse,
  WhyThisStopReason,
} from '../src/types.ts';
import { VALID_MONTHS, VALID_OFFBEAT_LEVELS, VALID_PACES } from './validator.ts';

export const PACE_HOUR_CAPS: Record<PaceLevel, number> = {
  relaxed: 5.5,
  normal: 7.5,
  packed: 9.5,
};

export const ROAD_DISTANCE_FACTOR = 1.35;
export const AVG_ROAD_SPEED_KMH = 42;

export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function estimateRoadTravel(
  from: Destination,
  to: Destination
): { roadKm: number; travelHours: number } {
  const straightKm = haversineDistanceKm(from.lat, from.lng, to.lat, to.lng);
  const ghatFactor =
    from.region === 'Malnad' || to.region === 'Malnad'
      ? ROAD_DISTANCE_FACTOR * 1.12
      : ROAD_DISTANCE_FACTOR;
  const roadKm = Math.round(straightKm * ghatFactor);
  const rawHours = roadKm / AVG_ROAD_SPEED_KMH;
  const travelHours = Math.max(0.25, Math.round(rawHours * 10) / 10);
  return { roadKm, travelHours };
}

export interface ScoredCandidate {
  destination: Destination;
  score: number;
  matchedInterests: InterestTag[];
  inBestSeason: boolean;
  matchesBudget: boolean;
  matchesOffbeat: boolean;
  matchesExperience: boolean;
  matchesStartingRegion: boolean;
}

function doesCostFitBudget(costLevel: Destination['cost_level'], pref: BudgetPreference): boolean {
  if (pref === 'budget') return costLevel === 'low';
  if (pref === 'moderate') return costLevel === 'low' || costLevel === 'medium';
  return true;
}

function doesCategoryMatchExperience(
  dest: Destination,
  experience: ExperienceType
): boolean {
  if (experience === 'all_rounder') return true;
  if (experience === 'heritage_immersion') {
    return (
      dest.category === 'temple_heritage' ||
      dest.category === 'fort_monument' ||
      dest.category === 'stepwell_architecture'
    );
  }
  if (experience === 'nature_mist') {
    return (
      dest.category === 'nature_hills' ||
      dest.category === 'waterfall_ghats' ||
      dest.category === 'wildlife_sanctuary' ||
      dest.interest_tags.includes('nature') ||
      dest.interest_tags.includes('trekking')
    );
  }
  if (experience === 'coastal_slow') {
    return dest.category === 'coastal_beach' || dest.region === 'Coastal Karnataka';
  }
  if (experience === 'cultural_craft') {
    return (
      dest.category === 'craft_cultural_town' ||
      dest.interest_tags.includes('crafts') ||
      dest.interest_tags.includes('food') ||
      dest.local_craft.trim().length > 0
    );
  }
  return false;
}

export function filterAndScoreDestinations(
  destinations: Destination[],
  input: PlanRequestInput
): {
  shortlist: ScoredCandidate[];
  relaxSuggestions: string[];
} {
  const candidates: ScoredCandidate[] = [];

  for (const dest of destinations) {
    const matchedInterests = dest.interest_tags.filter((tag) => input.interests.includes(tag));
    const inBestSeason = dest.best_season.includes(input.travel_month);
    const matchesBudget = doesCostFitBudget(dest.cost_level, input.budget_preference);
    const matchesExperience = doesCategoryMatchExperience(dest, input.experience_type);
    const matchesStartingRegion =
      Boolean(input.starting_region) && dest.region === input.starting_region;

    if (matchedInterests.length === 0 && !matchesExperience) {
      continue;
    }

    if (input.budget_preference === 'budget' && dest.cost_level === 'high') {
      continue;
    }

    const dailyCap = PACE_HOUR_CAPS[input.pace];
    if (dest.typical_duration_hours > dailyCap) {
      continue;
    }

    let score = 0;
    score += matchedInterests.length * 20;

    if (matchesExperience) {
      score += 15;
    }

    if (inBestSeason) {
      score += 15;
    }

    if (matchesBudget) {
      score += 10;
    }

    let matchesOffbeat = false;
    if (input.offbeat_level === 'classic') {
      if (dest.popularity_tier === 1) {
        score += 25;
        matchesOffbeat = true;
      } else if (dest.popularity_tier === 2) {
        score += 12;
        matchesOffbeat = true;
      } else {
        score += 2;
      }
    } else if (input.offbeat_level === 'balanced') {
      if (dest.popularity_tier === 2) {
        score += 22;
        matchesOffbeat = true;
      } else {
        score += 16;
        matchesOffbeat = true;
      }
    } else if (input.offbeat_level === 'offbeat') {
      if (dest.popularity_tier === 3) {
        score += 30;
        matchesOffbeat = true;
      } else if (dest.popularity_tier === 2) {
        score += 14;
        matchesOffbeat = true;
      } else {
        score -= 5;
      }
    }

    if (matchesStartingRegion) {
      score += 18;
    }

    if (input.starting_point) {
      const q = input.starting_point.toLowerCase();
      if (
        dest.name.toLowerCase().includes(q) ||
        dest.district.toLowerCase().includes(q) ||
        dest.kannada_name.includes(q)
      ) {
        score += 25;
      }
    }

    if (input.special_request) {
      const reqLower = input.special_request.toLowerCase();
      if (reqLower.includes('stepwell') && dest.category === 'stepwell_architecture') score += 10;
      if (reqLower.includes('quiet') && dest.interest_tags.includes('quiet_retreat')) score += 10;
      if (reqLower.includes('craft') && dest.local_craft.trim().length > 0) score += 10;
      if (reqLower.includes('food') && dest.local_food.length > 0) score += 8;
    }

    candidates.push({
      destination: dest,
      score,
      matchedInterests,
      inBestSeason,
      matchesBudget,
      matchesOffbeat,
      matchesExperience,
      matchesStartingRegion,
    });
  }

  candidates.sort((a, b) => b.score - a.score || a.destination.id.localeCompare(b.destination.id));

  const relaxSuggestions: string[] = [];
  if (candidates.length < input.days * 2) {
    if (input.interests.length <= 2) {
      relaxSuggestions.push('Add more interest tags (such as History, Architecture, or Nature) to widen matching places.');
    }
    if (input.offbeat_level === 'offbeat' || input.offbeat_level === 'classic') {
      relaxSuggestions.push('Switch Offbeat Preference to "Balanced" to combine Tier 1, Tier 2, and Tier 3 stops.');
    }
    if (input.pace === 'relaxed') {
      relaxSuggestions.push('Change Pace from "Relaxed" (5.5h/day cap) to "Normal" (7.5h/day cap) to fit longer monument visits.');
    }
    if (input.starting_region) {
      relaxSuggestions.push(`Clear the starting region filter (${input.starting_region}) to allow neighboring regions.`);
    }
  }

  return { shortlist: candidates, relaxSuggestions };
}

export function orderShortlistGeographically(
  shortlist: ScoredCandidate[],
  input: PlanRequestInput,
  maxStopsNeeded: number
): ScoredCandidate[] {
  if (shortlist.length === 0) return [];

  const pool = shortlist.slice(0, Math.min(shortlist.length, maxStopsNeeded + 6));

  let startIndex = 0;
  if (input.starting_point) {
    const q = input.starting_point.toLowerCase();
    const idx = pool.findIndex(
      (c) =>
        c.destination.name.toLowerCase().includes(q) ||
        c.destination.district.toLowerCase().includes(q)
    );
    if (idx >= 0) startIndex = idx;
  } else if (input.starting_region) {
    const idx = pool.findIndex((c) => c.destination.region === input.starting_region);
    if (idx >= 0) startIndex = idx;
  }

  const ordered: ScoredCandidate[] = [];
  const remaining = [...pool];
  const [first] = remaining.splice(startIndex, 1);
  ordered.push(first);

  while (remaining.length > 0 && ordered.length < maxStopsNeeded) {
    const current = ordered[ordered.length - 1];
    let bestIdx = -1;
    let bestComposite = -Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const cand = remaining[i];
      const { roadKm } = estimateRoadTravel(current.destination, cand.destination);

      const distancePenalty = roadKm * 0.22;
      const sameRegionBonus = cand.destination.region === current.destination.region ? 18 : 0;
      const composite = cand.score + sameRegionBonus - distancePenalty;

      if (composite > bestComposite) {
        bestComposite = composite;
        bestIdx = i;
      }
    }

    if (bestIdx === -1) break;
    const [nextStop] = remaining.splice(bestIdx, 1);
    ordered.push(nextStop);
  }

  return ordered;
}

export function buildWhyThisJourneyReasons(
  candidate: ScoredCandidate,
  prevStop: Destination | null,
  roadKmFromPrev: number,
  remainingHoursBeforeStop: number,
  input: PlanRequestInput
): WhyThisStopReason[] {
  const reasons: WhyThisStopReason[] = [];

  if (candidate.matchedInterests.length > 0) {
    reasons.push({
      criterion: 'interest_match',
      text: `Matches your selected ${candidate.matchedInterests.length === 1 ? 'interest' : 'interests'}: ${candidate.matchedInterests.join(', ')}.`,
    });
  }

  if (candidate.matchesOffbeat) {
    const tierLabel =
      candidate.destination.popularity_tier === 3
        ? 'Offbeat'
        : candidate.destination.popularity_tier === 2
          ? 'Known'
          : 'Famous';
    reasons.push({
      criterion: 'offbeat_fit',
      text: `Fits your "${input.offbeat_level}" preference as a ${tierLabel} stop.`,
    });
  }

  if (prevStop && roadKmFromPrev > 0 && roadKmFromPrev <= 140) {
    reasons.push({
      criterion: 'geographic_proximity',
      text: `Geographically close to ${prevStop.name} (~${roadKmFromPrev} km estimated road distance).`,
    });
  } else if (!prevStop && candidate.matchesStartingRegion && input.starting_region) {
    reasons.push({
      criterion: 'starting_region_match',
      text: `Located in your requested starting region (${input.starting_region}).`,
    });
  }

  if (candidate.inBestSeason) {
    reasons.push({
      criterion: 'seasonal_fit',
      text: `${input.travel_month} is listed within this destination's recommended season.`,
    });
  }

  reasons.push({
    criterion: 'daily_time_fit',
    text: `Typical ${candidate.destination.typical_duration_hours}h visit fits within the ${remainingHoursBeforeStop.toFixed(1)}h remaining in the day's ${PACE_HOUR_CAPS[input.pace]}h ${input.pace} pace cap.`,
  });

  return reasons;
}

export function buildBudgetAssessment(
  scheduledStops: Destination[],
  pref: BudgetPreference
): BudgetAssessment {
  const counts = { low: 0, medium: 0, high: 0 };
  for (const s of scheduledStops) {
    counts[s.cost_level]++;
  }

  const dominantCost =
    counts.high > 0
      ? 'mixed low-to-high'
      : counts.medium > counts.low
        ? 'predominantly medium'
        : 'predominantly low-to-medium';

  return {
    budget_preference: pref,
    qualitative_fit: `Selected stops have ${dominantCost} local expense tiers (${counts.low} low-tier, ${counts.medium} medium-tier, ${counts.high} high-tier stops) aligned with your "${pref}" preference (per person, per day).`,
    feasibility_notice: 'Budget feasibility not verified.',
    included_in_qualitative_tier: [
      'Qualitative daytime local food & basic local transit category per person, per day',
    ],
    excluded_expenses: [
      'Long-distance travel to the starting point (flights, inter-city trains, or private highway cab hires)',
      'Overnight hotel or homestay tariffs (rates vary by season and booking window)',
      'Monument entry fees, camera fees, and forest department trekking permits',
    ],
    honest_disclaimer:
      'Dataset contains qualitative cost tiers (low/medium/high) only. Exact rupee totals are not calculated because live accommodation, transport, and ticket prices are not in the dataset.',
  };
}

export function getOvernightBaseTown(region: RegionName, stops: ScheduledStop[]): string {
  if (stops.length > 0) {
    const districts = stops.map((s) => s.destination.district);
    if (districts.includes('Vijayanagara') || districts.includes('Ballari')) return 'Hosapete (Hampi)';
    if (districts.includes('Bagalkote')) return 'Badami';
    if (districts.includes('Gadag')) return 'Gadag';
    if (districts.includes('Bidar')) return 'Bidar';
    if (districts.includes('Kalaburagi')) return 'Kalaburagi';
    if (districts.includes('Udupi')) return 'Udupi';
    if (districts.includes('Uttara Kannada'))
      return stops.some((s) => s.destination.id.includes('gokarna') || s.destination.id.includes('mirjan'))
        ? 'Gokarna'
        : 'Kumta / Honnavar';
    if (districts.includes('Dakshina Kannada')) return 'Mangaluru';
    if (districts.includes('Kodagu')) return 'Madikeri';
    if (districts.includes('Shivamogga'))
      return stops.some((s) => s.destination.id.includes('jog') || s.destination.id.includes('ikkeri'))
        ? 'Sagar'
        : 'Shivamogga / Thirthahalli';
    if (districts.includes('Chikkamagaluru')) return 'Chikkamagaluru';
    if (districts.includes('Hassan')) return 'Hassan';
    if (districts.includes('Mysuru')) return 'Mysuru';
    if (districts.includes('Mandya')) return 'Mysuru / Mandya';
    if (districts.includes('Tumakuru')) return 'Tumakuru';
    if (districts.includes('Belagavi')) return 'Belagavi';
  }
  const defaults: Record<RegionName, string> = {
    'Coastal Karnataka': 'Udupi',
    Malnad: 'Shivamogga / Chikkamagaluru',
    'Old Mysuru': 'Mysuru',
    'Kittur Karnataka': 'Badami',
    'Kalyana Karnataka': 'Hosapete (Hampi)',
  };
  return defaults[region];
}

function defaultDayTheme(region: RegionName, dayNumber: number, stops: ScheduledStop[]): string {
  if (stops.length === 1) {
    return `Day ${dayNumber}: Exploring ${stops[0].destination.name} (${region})`;
  }
  const names = stops.map((s) => s.destination.name).join(' & ');
  return `Day ${dayNumber}: ${region} Trail — ${names}`;
}

export function encodeShareToken(
  input: PlanRequestInput,
  days: { day_number: number; day_theme: string; stop_ids: string[] }[]
): string {
  const payload = {
    v: 1,
    d: input.days,
    b: input.budget_preference,
    i: input.interests,
    e: input.experience_type,
    m: input.travel_month,
    o: input.offbeat_level,
    p: input.pace,
    days: days.map((d) => ({ n: d.day_number, t: d.day_theme, s: d.stop_ids })),
  };
  return Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
}

export function buildRulesBasedItinerary(
  allValidDestinations: Destination[],
  input: PlanRequestInput,
  requestId: string
): {
  plan: PlanResponse;
  shortlist: ScoredCandidate[];
  candidateMap: Map<string, ScoredCandidate>;
} {
  const dailyCap = PACE_HOUR_CAPS[input.pace];
  const { shortlist, relaxSuggestions } = filterAndScoreDestinations(allValidDestinations, input);
  const candidateMap = new Map<string, ScoredCandidate>();
  for (const c of shortlist) {
    candidateMap.set(c.destination.id, c);
  }

  const maxStopsPerDay = input.pace === 'relaxed' ? 1 : input.pace === 'normal' ? 2 : 3;
  const maxTotalStops = input.days * maxStopsPerDay;

  const orderedCandidates = orderShortlistGeographically(shortlist, input, maxTotalStops);

  // Strict Rule: Never repeat a place across the entire itinerary
  const usedDestinationIds = new Set<string>();
  const days: ItineraryDay[] = [];
  let candidateCursor = 0;
  let prevDestinationOverall: Destination | null = null;

  for (let dayNum = 1; dayNum <= input.days; dayNum++) {
    if (candidateCursor >= orderedCandidates.length) {
      break;
    }

    const dayStops: ScheduledStop[] = [];
    let dayVisitHours = 0;
    let dayTravelHours = 0;

    while (
      candidateCursor < orderedCandidates.length &&
      dayStops.length < maxStopsPerDay
    ) {
      const nextCand = orderedCandidates[candidateCursor];
      const dest = nextCand.destination;

      if (usedDestinationIds.has(dest.id)) {
        candidateCursor++;
        continue;
      }

      let roadKm = 0;
      let travelHrs = 0;

      if (dayStops.length > 0) {
        const prevInDay = dayStops[dayStops.length - 1].destination;
        const est = estimateRoadTravel(prevInDay, dest);
        roadKm = est.roadKm;
        travelHrs = est.travelHours;
      } else if (prevDestinationOverall) {
        const est = estimateRoadTravel(prevDestinationOverall, dest);
        roadKm = est.roadKm;
        travelHrs = Math.min(2.0, est.travelHours);
      }

      const projectedTotal =
        Math.round((dayVisitHours + dayTravelHours + dest.typical_duration_hours + travelHrs) * 10) /
        10;

      if (dayStops.length > 0 && projectedTotal > dailyCap) {
        break;
      }

      if (dayStops.length === 0 && projectedTotal > dailyCap) {
        if (dest.typical_duration_hours <= dailyCap) {
          travelHrs = Math.max(0, Math.round((dailyCap - dest.typical_duration_hours) * 10) / 10);
        } else {
          candidateCursor++;
          continue;
        }
      }

      const remainingBeforeStop = Math.max(
        0,
        Math.round((dailyCap - (dayVisitHours + dayTravelHours)) * 10) / 10
      );

      const whyReasons = buildWhyThisJourneyReasons(
        nextCand,
        dayStops.length > 0 ? dayStops[dayStops.length - 1].destination : prevDestinationOverall,
        roadKm,
        remainingBeforeStop,
        input
      );

      const matchingFestivals = dest.festivals.filter(
        (f) => f.typical_month === input.travel_month
      );

      const stopWarnings: string[] = [];
      if (!dest.verified) {
        stopWarnings.push('Draft data, verify before travelling.');
      }
      if (dest.coords_approx) {
        stopWarnings.push('Coordinates are approximate; verify exact monument entrance locally.');
      }
      if (!nextCand.inBestSeason) {
        stopWarnings.push(
          `${input.travel_month} is outside ${dest.name}'s primary recommended season (${dest.best_season.join(', ')}).`
        );
      }
      if (matchingFestivals.length > 0) {
        stopWarnings.push('Typical timing only. Dates change every year; verify before travelling.');
      }

      dayStops.push({
        destination: dest,
        order_in_day: dayStops.length + 1,
        visit_duration_hours: dest.typical_duration_hours,
        approx_Road_distance_km_from_prev: roadKm,
        approx_travel_hours_from_prev: travelHrs,
        travel_estimate_label:
          roadKm > 0
            ? `~${roadKm} km · ~${travelHrs}h est. road transfer (Approximate travel estimate. Verify your route before travelling.)`
            : 'Starting anchor for the itinerary (Verify local access before travelling.)',
        route_feasibility_status: 'unverified',
        why_this_journey: whyReasons,
        matching_festivals: matchingFestivals,
        stop_warnings: stopWarnings,
      });

      usedDestinationIds.add(dest.id);
      dayVisitHours = Math.round((dayVisitHours + dest.typical_duration_hours) * 10) / 10;
      dayTravelHours = Math.round((dayTravelHours + travelHrs) * 10) / 10;
      prevDestinationOverall = dest;
      candidateCursor++;
    }

    if (dayStops.length > 0) {
      const regionFocus = dayStops[0].destination.region;
      const baseTown = getOvernightBaseTown(regionFocus, dayStops);
      days.push({
        day_number: days.length + 1,
        day_theme: defaultDayTheme(regionFocus, days.length + 1, dayStops),
        region_focus: regionFocus,
        overnight_base: baseTown,
        total_visit_hours: dayVisitHours,
        total_approx_travel_hours: dayTravelHours,
        total_scheduled_hours: Math.round((dayVisitHours + dayTravelHours) * 10) / 10,
        daily_hour_cap: dailyCap,
        stops: dayStops,
      });
    }
  }

  const allScheduledDestinations = days.flatMap((d) => d.stops.map((s) => s.destination));
  const isShorter = days.length < input.days;

  const warnings: string[] = [
    'Approximate travel estimate. Verify your route before travelling.',
    'Actual road route feasibility is unverified (distances use straight-line distance × road factor, not live turn-by-turn routing).',
    'Budget feasibility not verified.',
  ];

  if (allScheduledDestinations.some((d) => !d.verified)) {
    warnings.push(
      'One or more destinations contain unverified draft dataset records and draft Kannada phrases marked "Needs native-speaker review."'
    );
  }

  // Exact required message when fewer places match than trip needs:
  // "We found X days of matching places. Add more interests or relax your filters to extend it."
  let shorterExplanation: string | undefined;
  if (isShorter) {
    const actualDays = days.length;
    shorterExplanation = `We found ${actualDays} days of matching places. Add more interests or relax your filters to extend it.`;
    warnings.push(shorterExplanation);
  }

  const shareToken =
    days.length > 0
      ? encodeShareToken(
          input,
          days.map((d) => ({
            day_number: d.day_number,
            day_theme: d.day_theme,
            stop_ids: d.stops.map((s) => s.destination.id),
          }))
        )
      : '';

  const plan: PlanResponse = {
    request_id: requestId,
    plan_source: 'rules_only',
    plan_source_label: 'Planned without AI',
    requested_days: input.days,
    actual_days: days.length,
    is_shorter_than_requested: isShorter,
    shorter_plan_explanation: shorterExplanation,
    relax_suggestions: isShorter ? relaxSuggestions : undefined,
    pace: input.pace,
    daily_hour_cap: dailyCap,
    travel_month: input.travel_month,
    offbeat_level: input.offbeat_level,
    warnings,
    feasibility_message:
      'Route feasibility is unverified. Travel times are approximate estimates based on straight-line distance × road factor; check ghat road conditions, monument timings, and local transport before departure.',
    budget_assessment: buildBudgetAssessment(allScheduledDestinations, input.budget_preference),
    days,
    share_token: shareToken,
    generated_at: new Date().toISOString(),
  };

  return { plan, shortlist, candidateMap };
}

export function restorePlanFromShareToken(
  token: string,
  validDestinations: Destination[],
  requestId: string
): { valid: boolean; plan?: PlanResponse; errorMessage?: string } {
  if (!token || typeof token !== 'string' || token.length > 8192) {
    return { valid: false, errorMessage: 'Invalid or oversized share token.' };
  }

  let decoded: Record<string, unknown>;
  try {
    const jsonStr = Buffer.from(token, 'base64url').toString('utf-8');
    decoded = JSON.parse(jsonStr);
  } catch {
    return { valid: false, errorMessage: 'Share token could not be decoded as valid JSON.' };
  }

  if (!decoded || typeof decoded !== 'object') {
    return { valid: false, errorMessage: 'Malformed share payload.' };
  }

  const requestedDays = Number(decoded.d);
  const pace = decoded.p as PaceLevel;
  const travelMonth = decoded.m as MonthName;
  const offbeatLevel = decoded.o as OffbeatLevel;
  const budgetPref = (decoded.b as BudgetPreference) || 'moderate';
  const interests: InterestTag[] = Array.isArray(decoded.i)
    ? (decoded.i as InterestTag[])
    : ['history'];
  const experienceType = (decoded.e as ExperienceType) || 'all_rounder';

  if (
    !Number.isInteger(requestedDays) ||
    requestedDays < 1 ||
    !VALID_PACES.includes(pace) ||
    !VALID_MONTHS.includes(travelMonth) ||
    !VALID_OFFBEAT_LEVELS.includes(offbeatLevel) ||
    !Array.isArray(decoded.days) ||
    decoded.days.length === 0
  ) {
    return { valid: false, errorMessage: 'Shared plan constraints are invalid.' };
  }

  const destMap = new Map<string, Destination>();
  for (const d of validDestinations) {
    destMap.set(d.id, d);
  }

  const seenStopIds = new Set<string>();
  const dailyCap = PACE_HOUR_CAPS[pace];
  const restoredDays: ItineraryDay[] = [];
  let prevDest: Destination | null = null;

  const syntheticInput: PlanRequestInput = {
    days: requestedDays,
    budget_preference: budgetPref,
    interests,
    experience_type: experienceType,
    travel_month: travelMonth,
    offbeat_level: offbeatLevel,
    pace,
  };

  const { shortlist } = filterAndScoreDestinations(validDestinations, syntheticInput);
  const scoreMap = new Map<string, ScoredCandidate>();
  for (const sc of shortlist) scoreMap.set(sc.destination.id, sc);

  for (let i = 0; i < decoded.days.length; i++) {
    const rawDay = decoded.days[i] as Record<string, unknown>;
    if (!rawDay || !Array.isArray(rawDay.s) || rawDay.s.length === 0 || rawDay.s.length > 4) {
      return { valid: false, errorMessage: `Invalid stops in day ${i + 1} of shared itinerary.` };
    }

    const dayStops: ScheduledStop[] = [];
    let dayVisitHours = 0;
    let dayTravelHours = 0;

    for (const stopId of rawDay.s) {
      if (typeof stopId !== 'string' || !destMap.has(stopId)) {
        return {
          valid: false,
          errorMessage: `Shared plan contains unknown destination ID '${String(stopId)}' outside the dataset.`,
        };
      }
      if (seenStopIds.has(stopId)) {
        return {
          valid: false,
          errorMessage: `Shared plan contains duplicate destination ID '${stopId}'.`,
        };
      }
      seenStopIds.add(stopId);

      const dest = destMap.get(stopId)!;
      let roadKm = 0;
      let travelHrs = 0;

      if (dayStops.length > 0) {
        const est = estimateRoadTravel(dayStops[dayStops.length - 1].destination, dest);
        roadKm = est.roadKm;
        travelHrs = est.travelHours;
      } else if (prevDest) {
        const est = estimateRoadTravel(prevDest, dest);
        roadKm = est.roadKm;
        travelHrs = Math.min(2.0, est.travelHours);
      }

      const candidateInfo: ScoredCandidate = scoreMap.get(dest.id) || {
        destination: dest,
        score: 20,
        matchedInterests: dest.interest_tags.filter((t) => interests.includes(t)),
        inBestSeason: dest.best_season.includes(travelMonth),
        matchesBudget: true,
        matchesOffbeat: true,
        matchesExperience: true,
        matchesStartingRegion: false,
      };

      const remainingBeforeStop = Math.max(
        0,
        Math.round((dailyCap - (dayVisitHours + dayTravelHours)) * 10) / 10
      );

      const matchingFestivals = dest.festivals.filter((f) => f.typical_month === travelMonth);
      const stopWarnings: string[] = [];
      if (!dest.verified) stopWarnings.push('Draft data, verify before travelling.');
      if (dest.coords_approx) {
        stopWarnings.push('Coordinates are approximate; verify exact monument entrance locally.');
      }
      if (matchingFestivals.length > 0) {
        stopWarnings.push('Typical timing only. Dates change every year; verify before travelling.');
      }

      dayStops.push({
        destination: dest,
        order_in_day: dayStops.length + 1,
        visit_duration_hours: dest.typical_duration_hours,
        approx_Road_distance_km_from_prev: roadKm,
        approx_travel_hours_from_prev: travelHrs,
        travel_estimate_label:
          roadKm > 0
            ? `~${roadKm} km · ~${travelHrs}h est. road transfer (Approximate travel estimate. Verify your route before travelling.)`
            : 'Starting anchor for the itinerary (Verify local access before travelling.)',
        route_feasibility_status: 'unverified',
        why_this_journey: buildWhyThisJourneyReasons(
          candidateInfo,
          dayStops.length > 0 ? dayStops[dayStops.length - 1].destination : prevDest,
          roadKm,
          remainingBeforeStop,
          syntheticInput
        ),
        matching_festivals: matchingFestivals,
        stop_warnings: stopWarnings,
      });

      dayVisitHours = Math.round((dayVisitHours + dest.typical_duration_hours) * 10) / 10;
      dayTravelHours = Math.round((dayTravelHours + travelHrs) * 10) / 10;
      prevDest = dest;
    }

    if (dayVisitHours + dayTravelHours > dailyCap + 0.5) {
      return {
        valid: false,
        errorMessage: `Shared plan violates daily activity-hour cap on day ${i + 1}.`,
      };
    }

    const regionFocus = dayStops[0].destination.region;
    const baseTown = getOvernightBaseTown(regionFocus, dayStops);
    restoredDays.push({
      day_number: i + 1,
      day_theme:
        typeof rawDay.t === 'string' && rawDay.t.trim().length > 0 && rawDay.t.length <= 120
          ? rawDay.t.trim()
          : defaultDayTheme(regionFocus, i + 1, dayStops),
      region_focus: regionFocus,
      overnight_base: baseTown,
      total_visit_hours: dayVisitHours,
      total_approx_travel_hours: dayTravelHours,
      total_scheduled_hours: Math.round((dayVisitHours + dayTravelHours) * 10) / 10,
      daily_hour_cap: dailyCap,
      stops: dayStops,
    });
  }

  const allScheduledDestinations = restoredDays.flatMap((d) => d.stops.map((s) => s.destination));

  return {
    valid: true,
    plan: {
      request_id: requestId,
      plan_source: 'rules_only',
      plan_source_label: 'Planned without AI',
      requested_days: requestedDays,
      actual_days: restoredDays.length,
      is_shorter_than_requested: restoredDays.length < requestedDays,
      pace,
      daily_hour_cap: dailyCap,
      travel_month: travelMonth,
      offbeat_level: offbeatLevel,
      warnings: [
        'Restored from validated share link.',
        'Approximate travel estimate. Verify your route before travelling.',
        'Budget feasibility not verified.',
      ],
      feasibility_message:
        'Route feasibility is unverified. Travel times are approximate estimates based on straight-line distance × road factor; check ghat road conditions, monument timings, and local transport before departure.',
      budget_assessment: buildBudgetAssessment(allScheduledDestinations, budgetPref),
      days: restoredDays,
      share_token: token,
      generated_at: new Date().toISOString(),
    },
  };
}

export function findSwapAlternatives(
  allValidDestinations: Destination[],
  input: SwapRequestInput,
  requestId: string
): SwapResponse {
  const destMap = new Map<string, Destination>();
  for (const d of allValidDestinations) {
    destMap.set(d.id, d);
  }

  const currentDest = destMap.get(input.current_destination_id);
  const prevDest = input.prev_stop_id ? destMap.get(input.prev_stop_id) : undefined;
  const nextDest = input.next_stop_id ? destMap.get(input.next_stop_id) : undefined;
  const anchorDest = prevDest || nextDest || currentDest;

  const excludedIds = new Set<string>(input.existing_itinerary_ids);
  excludedIds.add(input.current_destination_id);

  const scoredSwaps: { candidate: SwapCandidate; score: number }[] = [];

  for (const cand of allValidDestinations) {
    if (excludedIds.has(cand.id)) continue;

    const matchedInterests = cand.interest_tags.filter((t) => input.interests.includes(t));
    if (matchedInterests.length === 0) continue;

    let roadKm = 0;
    let travelHours = 0;
    if (anchorDest) {
      const est = estimateRoadTravel(anchorDest, cand);
      roadKm = est.roadKm;
      travelHours = est.travelHours;
    }

    if (anchorDest && roadKm > 260) {
      continue;
    }

    const totalNeededHours = prevDest
      ? Math.round((cand.typical_duration_hours + travelHours) * 10) / 10
      : cand.typical_duration_hours;

    if (totalNeededHours > input.remaining_hours_in_day + 0.5) {
      continue;
    }

    const whySuitable: string[] = [];
    whySuitable.push(`Matches interests: ${matchedInterests.join(', ')}.`);

    let score = matchedInterests.length * 20;

    if (input.offbeat_level === 'offbeat' && cand.popularity_tier === 3) {
      score += 25;
      whySuitable.push('Tier 3 (Offbeat) classification fits your offbeat preference.');
    } else if (input.offbeat_level === 'classic' && cand.popularity_tier === 1) {
      score += 20;
      whySuitable.push('Tier 1 (Famous) classification fits your classic preference.');
    } else if (cand.popularity_tier === 2) {
      score += 15;
      whySuitable.push('Tier 2 (Known) destination balances access and discovery.');
    }

    if (cand.best_season.includes(input.travel_month)) {
      score += 12;
      whySuitable.push(`Recommended in ${input.travel_month}.`);
    }

    if (anchorDest) {
      score -= roadKm * 0.15;
      whySuitable.push(
        `~${roadKm} km (~${travelHours}h est. drive) from ${anchorDest.name}; fits within remaining daily hours.`
      );
    }

    scoredSwaps.push({
      score,
      candidate: {
        destination: cand,
        visit_duration_hours: cand.typical_duration_hours,
        approx_extra_travel_hours: travelHours,
        approx_distance_km: roadKm,
        why_suitable: whySuitable,
      },
    });
  }

  scoredSwaps.sort((a, b) => b.score - a.score);
  const alternatives = scoredSwaps.slice(0, 3).map((s) => s.candidate);

  return {
    request_id: requestId,
    current_destination_id: input.current_destination_id,
    alternatives,
    message:
      alternatives.length > 0
        ? `Found ${alternatives.length} validated dataset alternative(s) matching your route and time constraints.`
        : 'No suitable alternative destinations in the dataset fit this day’s route proximity and remaining hours.',
  };
}
