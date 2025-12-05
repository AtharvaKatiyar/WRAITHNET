import { describe, it, expect } from 'vitest';
import { createApp } from './app';
import request from 'supertest';

describe('Backend Core Setup', () => {
  const app = createApp();

  it('should respond to health check endpoint', async () => {
    const response = await request(app).get('/health');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'alive');
    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('timestamp');
  });

  it('should return 404 for non-existent routes', async () => {
    const response = await request(app).get('/non-existent-route');
    
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toHaveProperty('statusCode', 404);
  });

  it('should have CORS headers', async () => {
    const response = await request(app).get('/health');
    
    expect(response.headers).toHaveProperty('access-control-allow-origin');
  });

  it('should have security headers from helmet', async () => {
    const response = await request(app).get('/health');
    
    expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
  });

  it('should parse JSON request bodies', async () => {
    const response = await request(app)
      .post('/health')
      .send({ test: 'data' })
      .set('Content-Type', 'application/json');
    
    // Should not fail due to body parsing
    expect(response.status).toBe(404); // 404 because POST /health doesn't exist
  });
});
