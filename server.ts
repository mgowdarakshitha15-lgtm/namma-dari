import crypto from 'crypto';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  computePlanCacheKey,
  getCachedPlan,
  rankShortlistWithGemini,
  setCachedPlan,
} from './server/gemini.ts';
import {
  buildRulesBasedItinerary,
  findSwapAlternatives,
  restorePlanFromShareToken,
} from './server/planner.ts';
import {
  loadAndValidatePlacesFile,
  VALID_CATEGORIES,
  VALID_INTERESTS,
  VALID_REGIONS,
  VALID_TIERS,
  validatePlanRequestInput,
  validateSwapRequestInput,
} from './server/validator.ts';
import {
  ApiErrorResponse,
  DestinationCategory,
  InterestTag,
  PopularityTier,
  RegionName,
} from './src/types.ts';

dotenv.config();

const startupDatasetState = loadAndValidatePlacesFile();

if (!startupDatasetState.isValid) {
  console.error(
    `[DATASET_VALIDATION_WARNING] Valid records: ${startupDatasetState.validDestinations.length}, Rejected: ${startupDatasetState.rejectedCount}`
  );
} else {
  console.log(
    `[DATASET_VALIDATED] Loaded ${startupDatasetState.validDestinations.length} valid destinations (${startupDatasetState.verifiedCount} verified).`
  );
}

function sendError(res: Response, status: number, code: string, message: string): void {
  const payload: ApiErrorResponse = {
    error: {
      code,
      message,
    },
  };
  res.status(status).json(payload);
}

interface RateBucket {
  count: number;
  resetAt: number;
}

export function createApp(options?: {
  datasetOverride?: ReturnType<typeof loadAndValidatePlacesFile>;
  rateLimitMaxPerWindow?: number;
  rateLimitWindowMs?: number;
}) {
  const app = express();
  const datasetState = options?.datasetOverride ?? startupDatasetState;
  const maxReqs = options?.rateLimitMaxPerWindow ?? 30;
  const windowMs = options?.rateLimitWindowMs ?? 60_000;
  const rateBuckets = new Map<string, RateBucket>();

  app.use(express.json({ limit: '16kb' }));

  app.use((err: Error & { status?: number; type?: string }, _req: Request, res: Response, next: NextFunction) => {
    if (err) {
      if (err.type === 'entity.too.large' || err.status === 413) {
        sendError(res, 413, 'PAYLOAD_TOO_LARGE', 'Request body exceeds the 16KB maximum limit.');
        return;
      }
      sendError(res, 400, 'MALFORMED_JSON', 'Request body could not be parsed as valid JSON.');
      return;
    }
    next();
  });

  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    const requestId = crypto.randomUUID();
    res.locals.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    const startHr = process.hrtime.bigint();

    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startHr) / 1_000_000;
      console.log(
        `[API_TIMING] reqId=${requestId} method=${req.method} path=${req.baseUrl}${req.path} status=${res.statusCode} durationMs=${durationMs.toFixed(2)}`
      );
    });
    next();
  });

  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    const clientKey =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'local-client';
    const now = Date.now();
    const bucket = rateBuckets.get(clientKey);

    if (!bucket || now > bucket.resetAt) {
      rateBuckets.set(clientKey, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (bucket.count >= maxReqs) {
      res.setHeader('Retry-After', Math.ceil((bucket.resetAt - now) / 1000).toString());
      sendError(
        res,
        429,
        'RATE_LIMIT_EXCEEDED',
        'Too many requests. Please wait a moment before generating or modifying another itinerary.'
      );
      return;
    }

    bucket.count += 1;
    next();
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    const usable = datasetState.validDestinations.length > 0;
    res.status(usable ? 200 : 503).json({
      status: usable ? 'ok' : 'degraded_unusable_dataset',
      total_valid_destinations: datasetState.validDestinations.length,
      verified_destinations: datasetState.verifiedCount,
      rejected_destinations: datasetState.rejectedCount,
      dataset_validation_status: datasetState.isValid
        ? 'valid_all_records_passed'
        : usable
          ? 'partial_records_rejected'
          : 'failed_no_valid_records',
      validation_issues: datasetState.issues,
      checked_at: datasetState.checkedAt,
      note: 'Structural validation confirms schema and geographic envelope rules only; factual verification is tracked separately via verified flags.',
    });
  });

  app.get('/api/places', (req: Request, res: Response) => {
    if (datasetState.validDestinations.length === 0) {
      sendError(
        res,
        503,
        'DATASET_UNAVAILABLE',
        'The destination dataset contains no valid records. Cannot serve places.'
      );
      return;
    }

    let results = [...datasetState.validDestinations];
    const { region, interest, category, tier } = req.query;

    if (typeof region === 'string' && region.trim() !== '') {
      if (!VALID_REGIONS.includes(region as RegionName)) {
        sendError(res, 400, 'INVALID_REGION_FILTER', `Unknown region filter: ${region}`);
        return;
      }
      results = results.filter((d) => d.region === region);
    }

    if (typeof interest === 'string' && interest.trim() !== '') {
      if (!VALID_INTERESTS.includes(interest as InterestTag)) {
        sendError(res, 400, 'INVALID_INTEREST_FILTER', `Unknown interest filter: ${interest}`);
        return;
      }
      results = results.filter((d) => d.interest_tags.includes(interest as InterestTag));
    }

    if (typeof category === 'string' && category.trim() !== '') {
      if (!VALID_CATEGORIES.includes(category as DestinationCategory)) {
        sendError(res, 400, 'INVALID_CATEGORY_FILTER', `Unknown category filter: ${category}`);
        return;
      }
      results = results.filter((d) => d.category === category);
    }

    if (typeof tier === 'string' && tier.trim() !== '') {
      const parsedTier = Number(tier) as PopularityTier;
      if (!VALID_TIERS.includes(parsedTier)) {
        sendError(res, 400, 'INVALID_TIER_FILTER', 'Popularity tier filter must be 1, 2, or 3.');
        return;
      }
      results = results.filter((d) => d.popularity_tier === parsedTier);
    }

    res.json({
      total: results.length,
      places: results,
    });
  });

  app.post('/api/plan', async (req: Request, res: Response) => {
    const requestId = res.locals.requestId || crypto.randomUUID();
    const t0 = Date.now();

    if (datasetState.validDestinations.length === 0) {
      sendError(
        res,
        503,
        'DATASET_UNUSABLE',
        'The destination dataset failed validation and has no valid places. Refusing to serve a fabricated itinerary.'
      );
      return;
    }

    const inputValidation = validatePlanRequestInput(req.body);
    if (!inputValidation.valid || !inputValidation.data) {
      sendError(
        res,
        400,
        'INVALID_PLAN_INPUT',
        inputValidation.errorMessage || 'Invalid planning request parameters.'
      );
      return;
    }

    const input = inputValidation.data;
    const cacheKey = computePlanCacheKey(input);
    const cached = getCachedPlan(cacheKey);
    if (cached) {
      console.log(`[PLAN_STAGE] reqId=${requestId} stage=cache_hit ms=${Date.now() - t0}`);
      res.json({
        ...cached,
        request_id: requestId,
      });
      return;
    }

    const tRulesStart = Date.now();
    const { plan: rulesPlan, shortlist } = buildRulesBasedItinerary(
      datasetState.validDestinations,
      input,
      requestId
    );
    console.log(
      `[PLAN_STAGE] reqId=${requestId} stage=rules_planner shortlist=${shortlist.length} days=${rulesPlan.actual_days} ms=${Date.now() - tRulesStart}`
    );

    const tAiStart = Date.now();
    const finalPlan = await rankShortlistWithGemini(shortlist, input, rulesPlan);
    console.log(
      `[PLAN_STAGE] reqId=${requestId} stage=gemini_ranking source=${finalPlan.plan_source} ms=${Date.now() - tAiStart}`
    );

    setCachedPlan(cacheKey, finalPlan);
    res.json(finalPlan);
  });

  app.post('/api/swap', (req: Request, res: Response) => {
    const requestId = res.locals.requestId || crypto.randomUUID();

    if (datasetState.validDestinations.length === 0) {
      sendError(res, 503, 'DATASET_UNUSABLE', 'Dataset is unavailable.');
      return;
    }

    const validation = validateSwapRequestInput(req.body);
    if (!validation.valid || !validation.data) {
      sendError(
        res,
        400,
        'INVALID_SWAP_INPUT',
        validation.errorMessage || 'Invalid swap parameters.'
      );
      return;
    }

    const validIds = new Set(datasetState.validDestinations.map((d) => d.id));
    if (!validIds.has(validation.data.current_destination_id)) {
      sendError(
        res,
        400,
        'UNKNOWN_DESTINATION_ID',
        `Destination '${validation.data.current_destination_id}' does not exist in the dataset.`
      );
      return;
    }

    for (const id of validation.data.existing_itinerary_ids) {
      if (!validIds.has(id)) {
        sendError(
          res,
          400,
          'UNKNOWN_ITINERARY_ID',
          `Existing itinerary contains unknown destination ID '${id}'.`
        );
        return;
      }
    }

    const result = findSwapAlternatives(
      datasetState.validDestinations,
      validation.data,
      requestId
    );
    res.json(result);
  });

  app.post('/api/share/restore', (req: Request, res: Response) => {
    const requestId = res.locals.requestId || crypto.randomUUID();

    if (datasetState.validDestinations.length === 0) {
      sendError(res, 503, 'DATASET_UNUSABLE', 'Dataset is unavailable.');
      return;
    }

    const token = req.body && typeof req.body.token === 'string' ? req.body.token.trim() : '';
    if (!token) {
      sendError(res, 400, 'MISSING_SHARE_TOKEN', 'A share token is required to restore an itinerary.');
      return;
    }

    const restored = restorePlanFromShareToken(
      token,
      datasetState.validDestinations,
      requestId
    );

    if (!restored.valid || !restored.plan) {
      sendError(
        res,
        400,
        'INVALID_SHARED_PLAN',
        restored.errorMessage || 'Shared itinerary failed validation.'
      );
      return;
    }

    res.json(restored.plan);
  });

  app.use('/api', (_req: Request, res: Response) => {
    sendError(res, 404, 'API_NOT_FOUND', 'The requested API endpoint does not exist.');
  });

  app.use((_err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    sendError(res, 500, 'INTERNAL_SERVER_ERROR', 'An unexpected server error occurred.');
  });

  return app;
}

async function startServer() {
  const app = createApp();
  const PORT = 3000;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Namma Daari full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.js'));

if (isDirectRun) {
  startServer();
}
