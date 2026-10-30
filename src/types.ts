export type RegionName =
  | 'Coastal Karnataka'
  | 'Malnad'
  | 'Old Mysuru'
  | 'Kittur Karnataka'
  | 'Kalyana Karnataka';

export type PopularityTier = 1 | 2 | 3;

export type CostLevel = 'low' | 'medium' | 'high';

export type DestinationCategory =
  | 'temple_heritage'
  | 'fort_monument'
  | 'nature_hills'
  | 'coastal_beach'
  | 'waterfall_ghats'
  | 'craft_cultural_town'
  | 'wildlife_sanctuary'
  | 'stepwell_architecture';

export type InterestTag =
  | 'architecture'
  | 'history'
  | 'nature'
  | 'trekking'
  | 'coastal'
  | 'spirituality'
  | 'crafts'
  | 'food'
  | 'photography'
  | 'quiet_retreat';

export type MonthName =
  | 'January'
  | 'February'
  | 'March'
  | 'April'
  | 'May'
  | 'June'
  | 'July'
  | 'August'
  | 'September'
  | 'October'
  | 'November'
  | 'December';

export type PaceLevel = 'relaxed' | 'normal' | 'packed';

export type OffbeatLevel = 'classic' | 'balanced' | 'offbeat';

export type BudgetPreference = 'budget' | 'moderate' | 'comfort';

export type ExperienceType =
  | 'heritage_immersion'
  | 'nature_mist'
  | 'coastal_slow'
  | 'cultural_craft'
  | 'all_rounder';

export interface FestivalInfo {
  name: string;
  typical_month: MonthName;
  note: string;
}

export interface KannadaPhrase {
  kannada: string;
  transliteration: string;
  english: string;
  when_to_use: string;
  review_status: 'draft' | 'reviewed';
}

export interface FieldVerificationMeta {
  coordinates_verified: boolean;
  cultural_notes_verified: boolean;
  phrases_verified: boolean;
  festivals_verified: boolean;
}

export interface Destination {
  id: string;
  name: string;
  kannada_name: string;
  district: string;
  region: RegionName;
  category: DestinationCategory;
  interest_tags: InterestTag[];
  best_season: MonthName[];
  typical_duration_hours: number;
  cost_level: CostLevel;
  popularity_tier: PopularityTier;
  short_description: string;
  how_to_reach: string;
  lat: number;
  lng: number;
  coords_approx: boolean;
  heritage_era: string;
  local_food: string[];
  local_craft: string;
  cultural_note: string;
  festivals: FestivalInfo[];
  phrases: KannadaPhrase[];
  source: string;
  last_checked: string;
  verified: boolean;
  field_verification?: FieldVerificationMeta;
}

export interface DatasetValidationIssue {
  recordId: string;
  field: string;
  message: string;
}

export interface DatasetValidationResult {
  isValid: boolean;
  validDestinations: Destination[];
  rejectedCount: number;
  verifiedCount: number;
  issues: DatasetValidationIssue[];
  checkedAt: string;
}

export interface PlanRequestInput {
  days: number;
  budget_preference: BudgetPreference;
  interests: InterestTag[];
  experience_type: ExperienceType;
  travel_month: MonthName;
  offbeat_level: OffbeatLevel;
  pace: PaceLevel;
  starting_region?: RegionName | '';
  starting_point?: string;
  special_request?: string;
  disable_ai?: boolean;
}

export interface WhyThisStopReason {
  criterion:
    | 'interest_match'
    | 'offbeat_fit'
    | 'geographic_proximity'
    | 'daily_time_fit'
    | 'seasonal_fit'
    | 'starting_region_match'
    | 'experience_match';
  text: string;
}

export interface ScheduledStop {
  destination: Destination;
  order_in_day: number;
  visit_duration_hours: number;
  approx_Road_distance_km_from_prev: number;
  approx_travel_hours_from_prev: number;
  travel_estimate_label: string;
  route_feasibility_status: 'unverified';
  why_this_journey: WhyThisStopReason[];
  ai_selection_note?: string;
  matching_festivals: FestivalInfo[];
  stop_warnings: string[];
}

export interface ItineraryDay {
  day_number: number;
  day_theme: string;
  region_focus: RegionName;
  overnight_base?: string;
  total_visit_hours: number;
  total_approx_travel_hours: number;
  total_scheduled_hours: number;
  daily_hour_cap: number;
  stops: ScheduledStop[];
}

export interface BudgetAssessment {
  budget_preference: BudgetPreference;
  qualitative_fit: string;
  feasibility_notice: string;
  included_in_qualitative_tier: string[];
  excluded_expenses: string[];
  honest_disclaimer: string;
}

export interface PlanResponse {
  request_id: string;
  plan_source: 'ai_ranked' | 'rules_only';
  plan_source_label: 'Planned with AI ranking' | 'Planned without AI' | 'Rules-Based';
  requested_days: number;
  actual_days: number;
  is_shorter_than_requested: boolean;
  shorter_plan_explanation?: string;
  relax_suggestions?: string[];
  pace: PaceLevel;
  daily_hour_cap: number;
  travel_month: MonthName;
  offbeat_level: OffbeatLevel;
  warnings: string[];
  feasibility_message: string;
  budget_assessment: BudgetAssessment;
  days: ItineraryDay[];
  share_token: string;
  generated_at: string;
}

export interface SwapRequestInput {
  current_destination_id: string;
  day_number: number;
  existing_itinerary_ids: string[];
  remaining_hours_in_day: number;
  prev_stop_id?: string;
  next_stop_id?: string;
  interests: InterestTag[];
  offbeat_level: OffbeatLevel;
  travel_month: MonthName;
}

export interface SwapCandidate {
  destination: Destination;
  visit_duration_hours: number;
  approx_extra_travel_hours: number;
  approx_distance_km: number;
  why_suitable: string[];
}

export interface SwapResponse {
  request_id: string;
  current_destination_id: string;
  alternatives: SwapCandidate[];
  message: string;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}
