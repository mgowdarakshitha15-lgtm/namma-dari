import fs from 'fs';
import path from 'path';
import { MAX_TRIP_DAYS } from '../src/config.ts';
import {
  BudgetPreference,
  CostLevel,
  DatasetValidationIssue,
  DatasetValidationResult,
  Destination,
  DestinationCategory,
  ExperienceType,
  InterestTag,
  MonthName,
  OffbeatLevel,
  PaceLevel,
  PlanRequestInput,
  PopularityTier,
  RegionName,
  SwapRequestInput,
} from '../src/types.ts';

export const VALID_REGIONS: RegionName[] = [
  'Coastal Karnataka',
  'Malnad',
  'Old Mysuru',
  'Kittur Karnataka',
  'Kalyana Karnataka',
];

export const VALID_CATEGORIES: DestinationCategory[] = [
  'temple_heritage',
  'fort_monument',
  'nature_hills',
  'coastal_beach',
  'waterfall_ghats',
  'craft_cultural_town',
  'wildlife_sanctuary',
  'stepwell_architecture',
];

export const VALID_INTERESTS: InterestTag[] = [
  'architecture',
  'history',
  'nature',
  'trekking',
  'coastal',
  'spirituality',
  'crafts',
  'food',
  'photography',
  'quiet_retreat',
];

export const VALID_MONTHS: MonthName[] = [
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

export const VALID_COST_LEVELS: CostLevel[] = ['low', 'medium', 'high'];
export const VALID_TIERS: PopularityTier[] = [1, 2, 3];
export const VALID_PACES: PaceLevel[] = ['relaxed', 'normal', 'packed'];
export const VALID_OFFBEAT_LEVELS: OffbeatLevel[] = ['classic', 'balanced', 'offbeat'];
export const VALID_BUDGET_PREFS: BudgetPreference[] = ['budget', 'moderate', 'comfort'];
export const VALID_EXPERIENCE_TYPES: ExperienceType[] = [
  'heritage_immersion',
  'nature_mist',
  'coastal_slow',
  'cultural_craft',
  'all_rounder',
];

export function isWithinKarnatakaEnvelope(lat: number, lng: number, region?: RegionName): {
  valid: boolean;
  reason?: string;
} {
  if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) {
    return { valid: false, reason: 'Coordinates must be valid numbers.' };
  }

  if (lat < 11.5 || lat > 18.5 || lng < 74.0 || lng > 78.6) {
    return {
      valid: false,
      reason: `Coordinates (${lat}, ${lng}) fall outside the documented Karnataka geographic envelope (11.5°N–18.5°N, 74.0°E–78.6°E).`,
    };
  }

  if (lat < 13.5 && lng < 74.5) {
    return {
      valid: false,
      reason: `Coordinates (${lat}, ${lng}) appear to lie offshore in the Arabian Sea west of the Karnataka coast.`,
    };
  }

  if (lat > 17.4 && lng < 75.5) {
    return {
      valid: false,
      reason: `Coordinates (${lat}, ${lng}) lie north-west of Karnataka's northern districts.`,
    };
  }

  if (region === 'Coastal Karnataka' && lng > 75.5) {
    return {
      valid: false,
      reason: `Coastal Karnataka destination has longitude ${lng}°E which is too far inland.`,
    };
  }

  return { valid: true };
}

export function validateDatasetRecords(rawRecords: unknown): DatasetValidationResult {
  const issues: DatasetValidationIssue[] = [];
  const validDestinations: Destination[] = [];
  const seenIds = new Set<string>();
  let rejectedCount = 0;

  if (!Array.isArray(rawRecords)) {
    return {
      isValid: false,
      validDestinations: [],
      rejectedCount: 1,
      verifiedCount: 0,
      issues: [
        {
          recordId: 'ROOT',
          field: 'root',
          message: 'Dataset root must be a JSON array of destination objects.',
        },
      ],
      checkedAt: new Date().toISOString(),
    };
  }

  for (let idx = 0; idx < rawRecords.length; idx++) {
    const item = rawRecords[idx] as Record<string, unknown>;
    const recordIssues: DatasetValidationIssue[] = [];
    const recordId =
      item && typeof item.id === 'string' && item.id.trim().length > 0
        ? item.id.trim()
        : `INDEX_${idx}`;

    if (!item || typeof item !== 'object') {
      issues.push({
        recordId,
        field: 'record',
        message: 'Record must be a non-null object.',
      });
      rejectedCount++;
      continue;
    }

    if (typeof item.id !== 'string' || item.id.trim().length === 0) {
      recordIssues.push({
        recordId,
        field: 'id',
        message: 'id is required and must be a non-empty string.',
      });
    } else if (seenIds.has(item.id.trim())) {
      recordIssues.push({
        recordId,
        field: 'id',
        message: `Duplicate destination id '${item.id}'. IDs must be unique.`,
      });
    } else {
      seenIds.add(item.id.trim());
    }

    const requiredStrings = [
      'name',
      'kannada_name',
      'district',
      'short_description',
      'how_to_reach',
      'source',
      'last_checked',
    ] as const;

    for (const field of requiredStrings) {
      if (typeof item[field] !== 'string' || (item[field] as string).trim().length === 0) {
        recordIssues.push({
          recordId,
          field,
          message: `${field} is required and must be a non-empty string.`,
        });
      }
    }

    const optionalStrings = ['heritage_era', 'local_craft', 'cultural_note'] as const;
    for (const field of optionalStrings) {
      if (item[field] !== undefined && typeof item[field] !== 'string') {
        recordIssues.push({
          recordId,
          field,
          message: `${field} must be a string (can be empty string if unknown).`,
        });
      }
    }

    if (!VALID_REGIONS.includes(item.region as RegionName)) {
      recordIssues.push({
        recordId,
        field: 'region',
        message: `Invalid region '${String(item.region)}'. Must be one of: ${VALID_REGIONS.join(', ')}.`,
      });
    }

    if (!VALID_CATEGORIES.includes(item.category as DestinationCategory)) {
      recordIssues.push({
        recordId,
        field: 'category',
        message: `Invalid category '${String(item.category)}'.`,
      });
    }

    if (!VALID_TIERS.includes(item.popularity_tier as PopularityTier)) {
      recordIssues.push({
        recordId,
        field: 'popularity_tier',
        message: `Invalid popularity_tier '${String(item.popularity_tier)}'. Must be 1, 2, or 3.`,
      });
    }

    if (!VALID_COST_LEVELS.includes(item.cost_level as CostLevel)) {
      recordIssues.push({
        recordId,
        field: 'cost_level',
        message: `Invalid cost_level '${String(item.cost_level)}'. Must be low, medium, or high.`,
      });
    }

    if (
      typeof item.typical_duration_hours !== 'number' ||
      Number.isNaN(item.typical_duration_hours) ||
      item.typical_duration_hours <= 0 ||
      item.typical_duration_hours > 12
    ) {
      recordIssues.push({
        recordId,
        field: 'typical_duration_hours',
        message: 'typical_duration_hours must be a positive number between 0.5 and 12.',
      });
    }

    if (
      !Array.isArray(item.interest_tags) ||
      item.interest_tags.length === 0 ||
      !item.interest_tags.every((t) => VALID_INTERESTS.includes(t as InterestTag))
    ) {
      recordIssues.push({
        recordId,
        field: 'interest_tags',
        message: 'interest_tags must be a non-empty array of valid interest tags.',
      });
    }

    if (
      !Array.isArray(item.best_season) ||
      item.best_season.length === 0 ||
      !item.best_season.every((m) => VALID_MONTHS.includes(m as MonthName))
    ) {
      recordIssues.push({
        recordId,
        field: 'best_season',
        message: 'best_season must be a non-empty array of valid month names.',
      });
    }

    if (!Array.isArray(item.local_food) || !item.local_food.every((f) => typeof f === 'string')) {
      recordIssues.push({
        recordId,
        field: 'local_food',
        message: 'local_food must be an array of strings.',
      });
    }

    const coordCheck = isWithinKarnatakaEnvelope(
      item.lat as number,
      item.lng as number,
      item.region as RegionName
    );
    if (!coordCheck.valid) {
      recordIssues.push({
        recordId,
        field: 'coordinates',
        message: coordCheck.reason || 'Invalid coordinates.',
      });
    }

    if (typeof item.coords_approx !== 'boolean') {
      recordIssues.push({
        recordId,
        field: 'coords_approx',
        message: 'coords_approx must be a boolean.',
      });
    }

    if (typeof item.verified !== 'boolean') {
      recordIssues.push({
        recordId,
        field: 'verified',
        message: 'verified must be a boolean.',
      });
    }

    if (!Array.isArray(item.festivals)) {
      recordIssues.push({
        recordId,
        field: 'festivals',
        message: 'festivals must be an array.',
      });
    } else {
      for (const fest of item.festivals as Record<string, unknown>[]) {
        if (
          !fest ||
          typeof fest.name !== 'string' ||
          !fest.name.trim() ||
          !VALID_MONTHS.includes(fest.typical_month as MonthName) ||
          typeof fest.note !== 'string' ||
          !fest.note.trim()
        ) {
          recordIssues.push({
            recordId,
            field: 'festivals',
            message: 'Every festival must have non-empty name, valid typical_month, and note.',
          });
        }
      }
    }

    if (!Array.isArray(item.phrases) || item.phrases.length === 0) {
      recordIssues.push({
        recordId,
        field: 'phrases',
        message: 'phrases must be a non-empty array of Kannada phrases.',
      });
    } else {
      for (const phr of item.phrases as Record<string, unknown>[]) {
        if (
          !phr ||
          typeof phr.kannada !== 'string' ||
          !phr.kannada.trim() ||
          typeof phr.transliteration !== 'string' ||
          !phr.transliteration.trim() ||
          typeof phr.english !== 'string' ||
          !phr.english.trim() ||
          typeof phr.when_to_use !== 'string' ||
          !phr.when_to_use.trim() ||
          (phr.review_status !== 'draft' && phr.review_status !== 'reviewed')
        ) {
          recordIssues.push({
            recordId,
            field: 'phrases',
            message:
              'Every phrase must contain kannada, transliteration, english, when_to_use, and review_status ("draft" | "reviewed").',
          });
        }
      }
    }

    if (recordIssues.length > 0) {
      issues.push(...recordIssues);
      rejectedCount++;
    } else {
      validDestinations.push(item as unknown as Destination);
    }
  }

  const verifiedCount = validDestinations.filter((d) => d.verified === true).length;

  return {
    isValid: validDestinations.length > 0 && rejectedCount === 0,
    validDestinations,
    rejectedCount,
    verifiedCount,
    issues,
    checkedAt: new Date().toISOString(),
  };
}

export function loadAndValidatePlacesFile(filePath?: string): DatasetValidationResult {
  const resolvedPath = filePath || path.resolve(process.cwd(), 'server/data/places.json');
  try {
    const rawText = fs.readFileSync(resolvedPath, 'utf-8');
    const parsed = JSON.parse(rawText);
    return validateDatasetRecords(parsed);
  } catch (err) {
    return {
      isValid: false,
      validDestinations: [],
      rejectedCount: 1,
      verifiedCount: 0,
      issues: [
        {
          recordId: 'FILE_LOAD',
          field: 'file',
          message: err instanceof Error ? err.message : 'Unable to read or parse places.json',
        },
      ],
      checkedAt: new Date().toISOString(),
    };
  }
}

export function validatePlanRequestInput(body: unknown): {
  valid: boolean;
  data?: PlanRequestInput;
  errorMessage?: string;
} {
  if (!body || typeof body !== 'object') {
    return { valid: false, errorMessage: 'Request body must be a JSON object.' };
  }

  const b = body as Record<string, unknown>;

  if (
    typeof b.days !== 'number' ||
    !Number.isInteger(b.days) ||
    b.days < 1
  ) {
    return {
      valid: false,
      errorMessage: 'Days must be an integer of 1 or more.',
    };
  }

  if (!VALID_BUDGET_PREFS.includes(b.budget_preference as BudgetPreference)) {
    return {
      valid: false,
      errorMessage: `budget_preference must be one of: ${VALID_BUDGET_PREFS.join(', ')}.`,
    };
  }

  if (
    !Array.isArray(b.interests) ||
    b.interests.length === 0 ||
    b.interests.length > 10 ||
    !b.interests.every((i) => VALID_INTERESTS.includes(i as InterestTag))
  ) {
    return {
      valid: false,
      errorMessage: 'Select at least one valid interest tag from the supported options.',
    };
  }

  if (!VALID_EXPERIENCE_TYPES.includes(b.experience_type as ExperienceType)) {
    return {
      valid: false,
      errorMessage: `experience_type must be one of: ${VALID_EXPERIENCE_TYPES.join(', ')}.`,
    };
  }

  if (!VALID_MONTHS.includes(b.travel_month as MonthName)) {
    return {
      valid: false,
      errorMessage: 'travel_month must be a valid calendar month name (January–December).',
    };
  }

  if (!VALID_OFFBEAT_LEVELS.includes(b.offbeat_level as OffbeatLevel)) {
    return {
      valid: false,
      errorMessage: 'offbeat_level must be one of: classic, balanced, offbeat.',
    };
  }

  if (!VALID_PACES.includes(b.pace as PaceLevel)) {
    return {
      valid: false,
      errorMessage: 'pace must be one of: relaxed, normal, packed.',
    };
  }

  if (
    b.starting_region !== undefined &&
    b.starting_region !== '' &&
    !VALID_REGIONS.includes(b.starting_region as RegionName)
  ) {
    return {
      valid: false,
      errorMessage: `starting_region must be empty or one of: ${VALID_REGIONS.join(', ')}.`,
    };
  }

  if (b.starting_point !== undefined && typeof b.starting_point !== 'string') {
    return { valid: false, errorMessage: 'starting_point must be a string.' };
  }

  if (typeof b.starting_point === 'string' && b.starting_point.length > 80) {
    return { valid: false, errorMessage: 'starting_point must not exceed 80 characters.' };
  }

  if (b.special_request !== undefined && typeof b.special_request !== 'string') {
    return { valid: false, errorMessage: 'special_request must be a string.' };
  }

  if (typeof b.special_request === 'string' && b.special_request.length > 200) {
    return {
      valid: false,
      errorMessage: 'Special request must be 200 characters or fewer.',
    };
  }

  return {
    valid: true,
    data: {
      days: b.days,
      budget_preference: b.budget_preference as BudgetPreference,
      interests: Array.from(new Set(b.interests as InterestTag[])),
      experience_type: b.experience_type as ExperienceType,
      travel_month: b.travel_month as MonthName,
      offbeat_level: b.offbeat_level as OffbeatLevel,
      pace: b.pace as PaceLevel,
      starting_region: (b.starting_region as RegionName | '') || '',
      starting_point: typeof b.starting_point === 'string' ? b.starting_point.trim() : '',
      special_request: typeof b.special_request === 'string' ? b.special_request.trim() : '',
      disable_ai: Boolean(b.disable_ai),
    },
  };
}

export function validateSwapRequestInput(body: unknown): {
  valid: boolean;
  data?: SwapRequestInput;
  errorMessage?: string;
} {
  if (!body || typeof body !== 'object') {
    return { valid: false, errorMessage: 'Swap request body must be a JSON object.' };
  }
  const b = body as Record<string, unknown>;

  if (typeof b.current_destination_id !== 'string' || !b.current_destination_id.trim()) {
    return { valid: false, errorMessage: 'current_destination_id is required.' };
  }

  if (typeof b.day_number !== 'number' || !Number.isInteger(b.day_number) || b.day_number < 1) {
    return {
      valid: false,
      errorMessage: 'day_number must be an integer of 1 or more.',
    };
  }

  if (
    !Array.isArray(b.existing_itinerary_ids) ||
    !b.existing_itinerary_ids.every((id) => typeof id === 'string')
  ) {
    return { valid: false, errorMessage: 'existing_itinerary_ids must be an array of strings.' };
  }

  if (typeof b.remaining_hours_in_day !== 'number' || b.remaining_hours_in_day <= 0) {
    return { valid: false, errorMessage: 'remaining_hours_in_day must be a positive number.' };
  }

  if (
    !Array.isArray(b.interests) ||
    b.interests.length === 0 ||
    !b.interests.every((i) => VALID_INTERESTS.includes(i as InterestTag))
  ) {
    return { valid: false, errorMessage: 'interests must be a non-empty array of valid tags.' };
  }

  if (!VALID_OFFBEAT_LEVELS.includes(b.offbeat_level as OffbeatLevel)) {
    return { valid: false, errorMessage: 'Invalid offbeat_level.' };
  }

  if (!VALID_MONTHS.includes(b.travel_month as MonthName)) {
    return { valid: false, errorMessage: 'Invalid travel_month.' };
  }

  return {
    valid: true,
    data: {
      current_destination_id: b.current_destination_id.trim(),
      day_number: b.day_number,
      existing_itinerary_ids: b.existing_itinerary_ids as string[],
      remaining_hours_in_day: b.remaining_hours_in_day,
      prev_stop_id: typeof b.prev_stop_id === 'string' ? b.prev_stop_id : undefined,
      next_stop_id: typeof b.next_stop_id === 'string' ? b.next_stop_id : undefined,
      interests: b.interests as InterestTag[],
      offbeat_level: b.offbeat_level as OffbeatLevel,
      travel_month: b.travel_month as MonthName,
    },
  };
}
