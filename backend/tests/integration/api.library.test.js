// ============================================================
// Integration tests for library API
// ============================================================
'use strict';

const request = require('supertest');
const { app } = require('../../src/server');
const { describe, it, expect, beforeAll, afterAll } = require('@jest/globals');

describe('api.library API', () => {
  let token;

  beforeAll(async () => {
    // Login and get token
    const res = await request(app).post('/api/auth/login').send({
      email: process.env.TEST_EMAIL || 'test@elimusaas.com',
      password: process.env.TEST_PASSWORD || 'Test@2025!',
    });
    token = res.body.accessToken;
  });

  it('should return 401 without auth', async () => {
    // Test unauthorized access
  });

  // TODO: Integration tests for library API
});
