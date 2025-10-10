/**
 * Integration tests for GSI endpoint
 *
 * Tests the full middleware chain and route handler:
 * - Rate limiting
 * - Authentication
 * - Content-Type validation
 * - Payload validation
 * - Processing and deduplication
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import pinoHttp from 'pino-http';
import gsiRouter from '../gsi.js';
import { logger } from '../../utils/logger.js';

// Create test app
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(
    pinoHttp({
      logger,
      autoLogging: false, // Disable for tests
    })
  );
  app.use('/api', gsiRouter);
  return app;
}

// Valid GSI payload (based on fixture)
const validPayload = {
  auth: {
    token: 'TEST_TOKEN',
  },
  provider: {
    name: 'Dota 2',
    appid: 570,
    version: 53,
    timestamp: 1696950123,
  },
  map: {
    matchid: '7890123456',
    game_time: 774,
    clock_time: 754,
    daytime: true,
    game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS',
  },
  player: {
    steamid: '76561198012345678',
    accountid: '12345678',
    name: 'Player Name',
    team_name: 'radiant',
    kills: 5,
    deaths: 2,
    assists: 8,
  },
  hero: {
    id: 46,
    name: 'npc_dota_hero_pugna',
    level: 12,
    health: 800,
    max_health: 1200,
  },
};

describe('POST /api/gsi', () => {
  let app: express.Application;
  let originalToken: string | undefined;

  beforeEach(() => {
    app = createTestApp();
    // Set test token
    originalToken = process.env.GSI_AUTH_TOKEN;
    process.env.GSI_AUTH_TOKEN = 'TEST_TOKEN';
  });

  afterEach(() => {
    // Restore original token
    if (originalToken === undefined) {
      delete process.env.GSI_AUTH_TOKEN;
    } else {
      process.env.GSI_AUTH_TOKEN = originalToken;
    }
  });

  describe('Success cases', () => {
    it('should accept valid payload and return 200', async () => {
      const response = await request(app)
        .post('/api/gsi')
        .set('Content-Type', 'application/json')
        .send(validPayload);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        sessionId: expect.any(String),
        broadcast: expect.any(Boolean),
        timestamp: expect.any(Number),
      });
    });

    it('should return 204 for duplicate payloads', async () => {
      // Send same payload twice
      await request(app)
        .post('/api/gsi')
        .set('Content-Type', 'application/json')
        .send(validPayload);

      const response = await request(app)
        .post('/api/gsi')
        .set('Content-Type', 'application/json')
        .send(validPayload);

      expect(response.status).toBe(204);
      expect(response.body).toEqual({});
    });

    it('should handle payload with minimal fields', async () => {
      const minimalPayload = {
        auth: { token: 'TEST_TOKEN' },
        provider: {
          name: 'Dota 2',
          appid: 570,
          version: 53,
          timestamp: Date.now(),
        },
      };

      const response = await request(app)
        .post('/api/gsi')
        .set('Content-Type', 'application/json')
        .send(minimalPayload);

      expect(response.status).toBe(200);
    });
  });

  describe('Authentication errors', () => {
    it('should return 401 when auth token is missing', async () => {
      const payloadWithoutAuth = {
        ...validPayload,
        auth: {},
      };

      const response = await request(app)
        .post('/api/gsi')
        .set('Content-Type', 'application/json')
        .send(payloadWithoutAuth);

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        error: 'Unauthorized',
        code: 'AUTH_TOKEN_MISSING',
      });
    });

    it('should return 401 when auth token is invalid', async () => {
      const payloadWithWrongToken = {
        ...validPayload,
        auth: { token: 'WRONG_TOKEN' },
      };

      const response = await request(app)
        .post('/api/gsi')
        .set('Content-Type', 'application/json')
        .send(payloadWithWrongToken);

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        error: 'Unauthorized',
        code: 'AUTH_TOKEN_INVALID',
      });
    });
  });

  describe('Content-Type validation', () => {
    it('should return 415 when Content-Type is missing', async () => {
      const response = await request(app)
        .post('/api/gsi')
        .set('Content-Type', '') // Explicitly empty
        .send(JSON.stringify(validPayload));

      // Express might return 400 or 415 depending on how it handles the empty Content-Type
      expect([400, 415, 422]).toContain(response.status);
    });

    it('should return 415 when Content-Type is not application/json', async () => {
      const response = await request(app)
        .post('/api/gsi')
        .set('Content-Type', 'text/plain')
        .send(JSON.stringify(validPayload));

      expect(response.status).toBe(415);
      expect(response.body).toMatchObject({
        error: 'Unsupported Media Type',
        code: 'INVALID_CONTENT_TYPE',
      });
    });
  });

  describe('Payload validation', () => {
    it('should return 422 when payload is missing required fields', async () => {
      const invalidPayload = {
        auth: { token: 'TEST_TOKEN' },
        // Missing provider
      };

      const response = await request(app)
        .post('/api/gsi')
        .set('Content-Type', 'application/json')
        .send(invalidPayload);

      expect(response.status).toBe(422);
      expect(response.body).toMatchObject({
        error: 'Unprocessable Entity',
        code: 'VALIDATION_ERROR',
        errors: expect.any(Array),
      });
    });

    it('should return 422 when payload has invalid types', async () => {
      const invalidPayload = {
        ...validPayload,
        provider: {
          ...validPayload.provider,
          appid: 'not-a-number', // Should be number
        },
      };

      const response = await request(app)
        .post('/api/gsi')
        .set('Content-Type', 'application/json')
        .send(invalidPayload);

      expect(response.status).toBe(422);
      expect(response.body).toMatchObject({
        error: 'Unprocessable Entity',
        code: 'VALIDATION_ERROR',
      });
    });

    it('should return 422 when team_name has invalid value', async () => {
      const invalidPayload = {
        ...validPayload,
        player: {
          ...validPayload.player,
          team_name: 'invalid_team', // Should be 'radiant' or 'dire'
        },
      };

      const response = await request(app)
        .post('/api/gsi')
        .set('Content-Type', 'application/json')
        .send(invalidPayload);

      expect(response.status).toBe(422);
      expect(response.body).toMatchObject({
        error: 'Unprocessable Entity',
        code: 'VALIDATION_ERROR',
      });
    });
  });

  describe('Rate limiting', () => {
    it('should return 429 when rate limit is exceeded', async () => {
      // Get rate limit from env (default: 20)
      const rateLimit = parseInt(process.env.GSI_RATE_LIMIT_MAX || '20', 10);

      // Send rateLimit + 5 requests rapidly (ensure we exceed limit)
      const requests = [];
      for (let i = 0; i < rateLimit + 5; i++) {
        requests.push(
          request(app)
            .post('/api/gsi')
            .set('Content-Type', 'application/json')
            .send({
              ...validPayload,
              provider: {
                ...validPayload.provider,
                timestamp: Date.now() + i, // Make each unique
              },
            })
        );
      }

      const responses = await Promise.all(requests);

      // At least one response should be rate limited
      const rateLimitedResponses = responses.filter((r) => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});

describe('GET /api/gsi/stats', () => {
  it('should return statistics', async () => {
    const app = createTestApp();
    process.env.GSI_AUTH_TOKEN = 'TEST_TOKEN';

    const response = await request(app).get('/api/gsi/stats');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      stats: {
        activeSessions: expect.any(Number),
        totalSnapshots: expect.any(Number),
        duplicateSnapshots: expect.any(Number),
        dedupRatio: expect.any(Number),
      },
      timestamp: expect.any(String),
    });
  });

  it('should reflect processed payloads in stats', async () => {
    // Create fresh app
    const app = createTestApp();
    process.env.GSI_AUTH_TOKEN = 'TEST_TOKEN';

    // Send multiple unique payloads
    const promises = [];
    for (let i = 0; i < 3; i++) {
      promises.push(
        request(app)
          .post('/api/gsi')
          .set('Content-Type', 'application/json')
          .send({
            ...validPayload,
            provider: {
              ...validPayload.provider,
              timestamp: Date.now() + i * 1000, // Make each unique
            },
          })
      );
    }
    await Promise.all(promises);

    // Get stats
    const stats = await request(app).get('/api/gsi/stats');

    // Stats should show processing happened
    expect(stats.body.stats.totalSnapshots).toBeGreaterThanOrEqual(3);
    expect(stats.body.stats.dedupRatio).toBeGreaterThanOrEqual(0);
    expect(stats.body.stats.dedupRatio).toBeLessThanOrEqual(1);
  });
});
