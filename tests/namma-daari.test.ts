import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import test from 'node:test';
import { createApp } from '../server.ts';
import {
  clearPlanCache,
  rankShortlistWithGemini,
  validateAndApplyGeminiRanking,
} from '../server/gemini.ts';
import {
  buildRulesBasedItinerary,
  encodeShareToken,
  findSwapAlternatives,
  PACE_HOUR_CAPS,
  restorePlanFromShareToken,
} from '../server/planner.ts';
import {
  loadAndValidatePlacesFile,
  validateDatasetRecords,
} from '../server/validator.ts';
import { Destination, PlanRequestInput } from '../src/types.ts';

// Helper to make HTTP JSON requests against an ephemeral Express server instance
async function requestJson(
  app: ReturnType<typeof createApp>,
  method: 'GET' | 'POST',
  urlPath: string,
  body?: unknown
): Promise<{ status: number; data: any }> {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address() as { port: number };
  const url = `http://127.0.0.1:${addr.port}${urlPath}`;

  try {
    const res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    return { status: res.status, data };
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

const datasetState = loadAndValidatePlacesFile();
const validDestinations: Destination[] = datasetState.validDestinations;

// 1. Unique dataset IDs & expanded dataset requirements (>= 60 places across 5 regions, >= 10/region, Old Mysuru Tier-3 places)
test('1. Dataset loads >= 60 valid destinations across 5 regions with unique IDs, >= 10 per region, and Tier-3 places in Old Mysuru', () => {
  assert.equal(datasetState.isValid, true, 'places.json must pass all validation rules');
  assert.ok(validDestinations.length >= 60, `Dataset must contain at least 60 destinations, found ${validDestinations.length}`);

  const ids = new Set(validDestinations.map((d) => d.id));
  assert.equal(ids.size, validDestinations.length, 'Every destination ID must be unique');

  const regions = new Set(validDestinations.map((d) => d.region));
  assert.equal(regions.size, 5, 'All 5 Namma Daari regions must be represented');

  // Verify at least 10 places in each of the 5 regions
  for (const r of regions) {
    const count = validDestinations.filter((d) => d.region === r).length;
    assert.ok(count >= 10, `Region ${r} must have at least 10 places, found ${count}`);
  }

  // Verify Old Mysuru has Tier-3 offbeat places
  const oldMysuruTier3 = validDestinations.filter(
    (d) => d.region === 'Old Mysuru' && d.popularity_tier === 3
  );
  assert.ok(oldMysuruTier3.length >= 2, `Old Mysuru must have Tier-3 places, found ${oldMysuruTier3.length}`);

  const totalTier3 = validDestinations.filter((d) => d.popularity_tier === 3).length;
  assert.ok(totalTier3 >= 15, `Expected healthy mix of Tier-3 destinations, found ${totalTier3}`);

  // Check duplicate ID rejection
  const dupResult = validateDatasetRecords([validDestinations[0], validDestinations[0]]);
  assert.equal(dupResult.isValid, false);
  assert.equal(dupResult.rejectedCount, 1);
  assert.ok(dupResult.issues.some((i) => i.message.includes('Duplicate destination id')));
});

// 2. Invalid records rejected
test('2. Invalid records are rejected without silent correction or invention', () => {
  const invalidRecord = {
    ...validDestinations[0],
    id: 'broken-record',
    typical_duration_hours: -3,
    phrases: [],
  };
  const res = validateDatasetRecords([validDestinations[0], invalidRecord]);
  assert.equal(res.isValid, false);
  assert.equal(res.validDestinations.length, 1);
  assert.equal(res.rejectedCount, 1);
});

// 3. Invalid regions rejected
test('3. Invalid regions outside the 5 Namma Daari regions are rejected', () => {
  const badRegionRecord = {
    ...validDestinations[0],
    id: 'bad-region-place',
    region: 'South India Generic',
  };
  const res = validateDatasetRecords([badRegionRecord]);
  assert.equal(res.isValid, false);
  assert.equal(res.validDestinations.length, 0);
  assert.ok(res.issues.some((i) => i.field === 'region'));
});

// 4. Invalid coordinates rejected
test('4. Coordinates outside the documented Karnataka geographic envelope or offshore are rejected', () => {
  const delhiCoords = {
    ...validDestinations[0],
    id: 'delhi-outlier',
    lat: 28.6139,
    lng: 77.209,
  };
  const arabianSeaOffshore = {
    ...validDestinations[0],
    id: 'sea-outlier',
    lat: 12.5,
    lng: 74.1,
  };
  const res = validateDatasetRecords([delhiCoords, arabianSeaOffshore]);
  assert.equal(res.isValid, false);
  assert.equal(res.validDestinations.length, 0);
  assert.equal(res.rejectedCount, 2);
});

// 5. No itinerary IDs outside the dataset
test('5. Rules-based planner never outputs destination IDs outside the dataset', () => {
  const input: PlanRequestInput = {
    days: 4,
    budget_preference: 'moderate',
    interests: ['architecture', 'history', 'nature', 'coastal'],
    experience_type: 'all_rounder',
    travel_month: 'November',
    offbeat_level: 'offbeat',
    pace: 'normal',
  };
  const { plan } = buildRulesBasedItinerary(validDestinations, input, 'test-req-5');
  const validIdSet = new Set(validDestinations.map((d) => d.id));

  assert.ok(plan.days.length > 0);
  for (const day of plan.days) {
    for (const stop of day.stops) {
      assert.ok(
        validIdSet.has(stop.destination.id),
        `Stop ID ${stop.destination.id} must exist in dataset`
      );
    }
  }
});

// 6. Unknown Gemini IDs rejected
test('6. Gemini output containing unknown or non-shortlisted IDs is rejected', () => {
  const input: PlanRequestInput = {
    days: 2,
    budget_preference: 'moderate',
    interests: ['architecture', 'history'],
    experience_type: 'heritage_immersion',
    travel_month: 'December',
    offbeat_level: 'offbeat',
    pace: 'normal',
  };
  const { shortlist } = buildRulesBasedItinerary(validDestinations, input, 'test-req-6');

  const fakeGeminiOutput = {
    days: [
      {
        day_number: 1,
        day_theme: 'Invented Heritage Day',
        stops: [
          {
            destination_id: 'invented-mysore-secret-palace-999',
            selection_reason: 'Matches architecture.',
          },
        ],
      },
    ],
  };

  const validation = validateAndApplyGeminiRanking(fakeGeminiOutput, shortlist, input);
  assert.equal(validation.valid, false);
  assert.ok(validation.reason?.includes('unknown or non-shortlisted'));
});

// 7. Duplicate Gemini IDs rejected
test('7. Gemini output with duplicate destination IDs is rejected', () => {
  const input: PlanRequestInput = {
    days: 2,
    budget_preference: 'moderate',
    interests: ['architecture', 'history'],
    experience_type: 'heritage_immersion',
    travel_month: 'December',
    offbeat_level: 'balanced',
    pace: 'normal',
  };
  const { shortlist } = buildRulesBasedItinerary(validDestinations, input, 'test-req-7');
  const firstId = shortlist[0].destination.id;

  const duplicateGeminiOutput = {
    days: [
      {
        day_number: 1,
        day_theme: 'Day 1',
        stops: [{ destination_id: firstId, selection_reason: 'First visit' }],
      },
      {
        day_number: 2,
        day_theme: 'Day 2',
        stops: [{ destination_id: firstId, selection_reason: 'Duplicate visit' }],
      },
    ],
  };

  const validation = validateAndApplyGeminiRanking(duplicateGeminiOutput, shortlist, input);
  assert.equal(validation.valid, false);
  assert.ok(validation.reason?.includes('duplicate destination ID'));
});

// 8. Malformed Gemini responses trigger rules-only fallback
test('8. Malformed Gemini JSON response safely falls back to rules-only planner', async () => {
  const input: PlanRequestInput = {
    days: 2,
    budget_preference: 'moderate',
    interests: ['architecture', 'history'],
    experience_type: 'heritage_immersion',
    travel_month: 'January',
    offbeat_level: 'offbeat',
    pace: 'normal',
  };
  const { plan: basePlan, shortlist } = buildRulesBasedItinerary(
    validDestinations,
    input,
    'test-req-8'
  );

  const result = await rankShortlistWithGemini(shortlist, input, basePlan, {
    apiKeyOverride: 'test-dummy-key',
    mockClientCall: async () => '{ malformed json ::: not valid ',
  });

  assert.equal(result.plan_source, 'rules_only');
  assert.equal(result.plan_source_label, 'Planned without AI');
  assert.ok(result.days.length > 0);
});

// 9. Gemini failure / timeout triggers rules-only fallback
test('9. Gemini network error or timeout triggers rules-only fallback', async () => {
  const input: PlanRequestInput = {
    days: 2,
    budget_preference: 'moderate',
    interests: ['nature', 'trekking'],
    experience_type: 'nature_mist',
    travel_month: 'November',
    offbeat_level: 'offbeat',
    pace: 'normal',
  };
  const { plan: basePlan, shortlist } = buildRulesBasedItinerary(
    validDestinations,
    input,
    'test-req-9'
  );

  const result = await rankShortlistWithGemini(shortlist, input, basePlan, {
    apiKeyOverride: 'test-dummy-key',
    mockClientCall: async () => {
      throw new Error('503 Service Unavailable from upstream model');
    },
  });

  assert.equal(result.plan_source, 'rules_only');
  assert.equal(result.plan_source_label, 'Planned without AI');
  assert.equal(result.days.length, basePlan.days.length);
});

// 10. Daily activity-hour caps respected
test('10. Daily activity-hour caps (visit + intra-day travel) are strictly respected across paces', () => {
  for (const pace of ['relaxed', 'normal', 'packed'] as const) {
    const input: PlanRequestInput = {
      days: 4,
      budget_preference: 'comfort',
      interests: ['architecture', 'history', 'nature', 'coastal', 'crafts'],
      experience_type: 'all_rounder',
      travel_month: 'December',
      offbeat_level: 'balanced',
      pace,
    };
    const { plan } = buildRulesBasedItinerary(validDestinations, input, `test-cap-${pace}`);
    const cap = PACE_HOUR_CAPS[pace];

    for (const day of plan.days) {
      assert.ok(
        day.total_scheduled_hours <= cap,
        `Day ${day.day_number} scheduled hours (${day.total_scheduled_hours}) exceeded ${pace} cap (${cap})`
      );
    }
  }
});

// 11. Invalid trip lengths (<1) return HTTP 400, while trips of 1 or more succeed
test('11. POST /api/plan rejects trips outside 1+ with HTTP 400, while trips of 1 or more succeed', async () => {
  clearPlanCache();
  const app = createApp();

  // 0 days rejected with HTTP 400
  const zeroDaysRes = await requestJson(app, 'POST', '/api/plan', {
    days: 0,
    budget_preference: 'moderate',
    interests: ['history'],
    experience_type: 'heritage_immersion',
    travel_month: 'November',
    offbeat_level: 'offbeat',
    pace: 'normal',
  });
  assert.equal(zeroDaysRes.status, 400);
  assert.equal(zeroDaysRes.data.error.code, 'INVALID_PLAN_INPUT');

  // > 30 days (e.g. 35 days) succeeds with HTTP 200 (limit removed)
  const overThirtyRes = await requestJson(app, 'POST', '/api/plan', {
    days: 35,
    budget_preference: 'moderate',
    interests: ['history'],
    experience_type: 'heritage_immersion',
    travel_month: 'November',
    offbeat_level: 'offbeat',
    pace: 'normal',
    disable_ai: true,
  });
  assert.equal(overThirtyRes.status, 200);
  assert.ok(overThirtyRes.data.actual_days > 0);

  // Valid long trip (12 days) succeeds with HTTP 200
  const validLongRes = await requestJson(app, 'POST', '/api/plan', {
    days: 12,
    budget_preference: 'moderate',
    interests: ['history', 'architecture'],
    experience_type: 'heritage_immersion',
    travel_month: 'November',
    offbeat_level: 'offbeat',
    pace: 'normal',
    disable_ai: true,
  });
  assert.equal(validLongRes.status, 200);
  assert.ok(validLongRes.data.actual_days > 0 && validLongRes.data.actual_days <= 12);

  const oversizedSpecialReq = await requestJson(app, 'POST', '/api/plan', {
    days: 3,
    budget_preference: 'moderate',
    interests: ['history'],
    experience_type: 'heritage_immersion',
    travel_month: 'November',
    offbeat_level: 'offbeat',
    pace: 'normal',
    special_request: 'x'.repeat(205),
  });
  assert.equal(oversizedSpecialReq.status, 400);
});

// 12. Rate limiting returns HTTP 429
test('12. Server-side rate limiting returns HTTP 429 when limit is exceeded', async () => {
  const app = createApp({ rateLimitMaxPerWindow: 2, rateLimitWindowMs: 60_000 });
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address() as { port: number };
  const url = `http://127.0.0.1:${addr.port}/api/health`;

  try {
    const r1 = await fetch(url);
    const r2 = await fetch(url);
    const r3 = await fetch(url);
    assert.equal(r1.status, 200);
    assert.equal(r2.status, 200);
    assert.equal(r3.status, 429);
    const body3 = await r3.json();
    assert.equal(body3.error.code, 'RATE_LIMIT_EXCEEDED');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

// 13. Too few matches produce an honest shorter plan without unrelated padding
test('13. Narrow constraints with too few matches produce an honest shorter plan without unrelated padding', () => {
  const narrowInput: PlanRequestInput = {
    days: 25,
    budget_preference: 'budget',
    interests: ['coastal'],
    experience_type: 'coastal_slow',
    travel_month: 'January',
    offbeat_level: 'offbeat',
    pace: 'packed',
  };
  const { plan } = buildRulesBasedItinerary(validDestinations, narrowInput, 'test-req-13');
  assert.equal(plan.is_shorter_than_requested, true);
  assert.ok(plan.actual_days < 25, 'Should return fewer than 25 days rather than padding');
  assert.ok(
    plan.shorter_plan_explanation &&
      plan.shorter_plan_explanation.includes('We found') &&
      plan.shorter_plan_explanation.includes('Add more interests or relax your filters to extend it'),
    'Must explain why the plan is shorter with exact required message'
  );
  assert.ok(plan.relax_suggestions && plan.relax_suggestions.length > 0);
});

// 14. Swaps cannot introduce unknown IDs
test('14. Destination swap rejects unknown IDs and returns only valid dataset alternatives', async () => {
  const app = createApp();
  const badSwapRes = await requestJson(app, 'POST', '/api/swap', {
    current_destination_id: 'unknown-place-id-999',
    day_number: 1,
    existing_itinerary_ids: ['lakkundi-stepwells-temples'],
    remaining_hours_in_day: 6,
    interests: ['architecture'],
    offbeat_level: 'offbeat',
    travel_month: 'November',
  });
  assert.equal(badSwapRes.status, 400);
  assert.equal(badSwapRes.data.error.code, 'UNKNOWN_DESTINATION_ID');

  const validSwap = findSwapAlternatives(
    validDestinations,
    {
      current_destination_id: 'lakkundi-stepwells-temples',
      day_number: 1,
      existing_itinerary_ids: ['lakkundi-stepwells-temples'],
      remaining_hours_in_day: 6,
      interests: ['architecture', 'history'],
      offbeat_level: 'offbeat',
      travel_month: 'November',
    },
    'test-swap-14'
  );
  const validIdSet = new Set(validDestinations.map((d) => d.id));
  assert.ok(validSwap.alternatives.length <= 3);
  for (const alt of validSwap.alternatives) {
    assert.ok(validIdSet.has(alt.destination.id));
    assert.notEqual(alt.destination.id, 'lakkundi-stepwells-temples');
  }
});

// 15. Shared plans with unknown IDs are rejected
test('15. Restoring a shared plan containing an unknown destination ID is rejected', () => {
  const forgedToken = encodeShareToken(
    {
      days: 1,
      budget_preference: 'moderate',
      interests: ['history'],
      experience_type: 'heritage_immersion',
      travel_month: 'November',
      offbeat_level: 'offbeat',
      pace: 'normal',
    },
    [
      {
        day_number: 1,
        day_theme: 'Forged Day',
        stop_ids: ['non-existent-place-xyz'],
      },
    ]
  );

  const restored = restorePlanFromShareToken(forgedToken, validDestinations, 'test-restore-15');
  assert.equal(restored.valid, false);
  assert.ok(restored.errorMessage?.includes('unknown destination ID'));
});

// 16. Missing API keys are handled safely
test('16. Missing GEMINI_API_KEY is handled safely without failing itinerary planning', async () => {
  const input: PlanRequestInput = {
    days: 2,
    budget_preference: 'moderate',
    interests: ['architecture', 'history'],
    experience_type: 'heritage_immersion',
    travel_month: 'November',
    offbeat_level: 'offbeat',
    pace: 'normal',
  };
  const { plan: basePlan, shortlist } = buildRulesBasedItinerary(
    validDestinations,
    input,
    'test-req-16'
  );

  const result = await rankShortlistWithGemini(shortlist, input, basePlan, {
    apiKeyOverride: '',
  });
  assert.equal(result.plan_source, 'rules_only');
  assert.equal(result.plan_source_label, 'Planned without AI');
  assert.ok(result.days.length > 0);
});

// 17. API keys are absent from client source code and production client bundle (if built)
test('17. GEMINI_API_KEY and @google/genai are strictly absent from client src/ files and dist/ bundle', () => {
  const srcDir = path.resolve(process.cwd(), 'src');
  const walkFiles = (dir: string): string[] => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    return entries.flatMap((e) =>
      e.isDirectory() ? walkFiles(path.join(dir, e.name)) : [path.join(dir, e.name)]
    );
  };

  for (const file of walkFiles(srcDir)) {
    const content = fs.readFileSync(file, 'utf-8');
    assert.ok(
      !content.includes('GEMINI_API_KEY'),
      `Client file ${file} must not reference GEMINI_API_KEY`
    );
    assert.ok(
      !content.includes('@google/genai'),
      `Client file ${file} must not import @google/genai`
    );
  }

  const distDir = path.resolve(process.cwd(), 'dist');
  if (fs.existsSync(distDir)) {
    for (const file of walkFiles(distDir)) {
      if (file.endsWith('.js') || file.endsWith('.html')) {
        const content = fs.readFileSync(file, 'utf-8');
        assert.ok(!content.includes('GEMINI_API_KEY'), 'Built client bundle must not contain GEMINI_API_KEY');
      }
    }
  }
});

// 18. Empty fields are not presented as verified facts
test('18. Empty optional fields (e.g. Dambal local_craft or Maravanthe heritage_era) remain empty and unverified', () => {
  const dambal = validDestinations.find((d) => d.id === 'dambal-dodda-basappa');
  const maravanthe = validDestinations.find((d) => d.id === 'maravanthe-river-sea');
  assert.ok(dambal);
  assert.ok(maravanthe);
  assert.equal(dambal.local_craft, '');
  assert.equal(maravanthe.heritage_era, '');
  assert.equal(dambal.verified, false);
});

// 19. A failed map does not disable the itinerary
test('19. ItineraryMap includes explicit error catch & fallback while keeping full itinerary usable', () => {
  const mapSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/ItineraryMap.tsx'),
    'utf-8'
  );
  assert.ok(mapSource.includes('Map unavailable.'));
  assert.ok(mapSource.includes('Approximate straight-line connection, not a road route'));
});

// 20. Budget uncertainty is communicated honestly
test('20. Budget assessment explicitly communicates "Budget feasibility not verified." and excluded expenses', () => {
  const input: PlanRequestInput = {
    days: 2,
    budget_preference: 'budget',
    interests: ['architecture'],
    experience_type: 'heritage_immersion',
    travel_month: 'November',
    offbeat_level: 'offbeat',
    pace: 'normal',
  };
  const { plan } = buildRulesBasedItinerary(validDestinations, input, 'test-req-20');
  assert.equal(plan.budget_assessment.feasibility_notice, 'Budget feasibility not verified.');
  assert.ok(plan.budget_assessment.excluded_expenses.length >= 3);
  assert.ok(plan.warnings.includes('Budget feasibility not verified.'));
});

// 21. Share links restore valid itineraries correctly
test('21. Share links round-trip and restore valid itineraries with matching days and destination IDs', () => {
  const input: PlanRequestInput = {
    days: 2,
    budget_preference: 'moderate',
    interests: ['architecture', 'history'],
    experience_type: 'heritage_immersion',
    travel_month: 'November',
    offbeat_level: 'offbeat',
    pace: 'normal',
  };
  const { plan } = buildRulesBasedItinerary(validDestinations, input, 'test-req-21');
  assert.ok(plan.share_token.length > 10);

  const restored = restorePlanFromShareToken(
    plan.share_token,
    validDestinations,
    'test-restore-21'
  );
  assert.equal(restored.valid, true);
  assert.ok(restored.plan);
  assert.equal(restored.plan.actual_days, plan.actual_days);
  assert.deepEqual(
    restored.plan.days.map((d) => d.stops.map((s) => s.destination.id)),
    plan.days.map((d) => d.stops.map((s) => s.destination.id))
  );
});
