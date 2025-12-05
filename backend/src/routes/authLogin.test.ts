import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import prisma from '../config/database';

describe('POST /api/auth/login', () => {
  const app = createApp();
  const testUser = {
    username: 'LoginTestUser',
    email: `login-test-${Date.now()}@example.com`,
    password: 'SecurePass123',
  };
  let userId: string;

  // Create a test user before running login tests
  beforeAll(async () => {
    const response = await request(app).post('/api/auth/register').send(testUser);
    userId = response.body.user.id;
  });

  // Clean up test user after tests
  afterAll(async () => {
    if (userId) {
      await prisma.user.delete({ where: { id: userId } });
    }
  });

  it('should login successfully with valid credentials', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: testUser.email,
      password: testUser.password,
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('user');
    expect(response.body.user).toHaveProperty('id', userId);
    expect(response.body.user).toHaveProperty('username', testUser.username);
    expect(response.body.user).toHaveProperty('email', testUser.email);
    expect(response.body.user).not.toHaveProperty('passwordHash');

    // Verify token is a valid JWT format
    expect(response.body.token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
  });

  it('should reject login with incorrect password', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: testUser.email,
      password: 'WrongPassword123',
    });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toContain('Invalid email or password');
  });

  it('should reject login with non-existent email', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: 'nonexistent@example.com',
      password: 'SecurePass123',
    });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toContain('Invalid email or password');
  });

  it('should reject login with invalid email format', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: 'invalid-email',
      password: 'SecurePass123',
    });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('should reject login with missing password', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: testUser.email,
    });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('should reject login with empty password', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: testUser.email,
      password: '',
    });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('should be case-insensitive for email', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: testUser.email.toUpperCase(),
      password: testUser.password,
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
  });

  it('should update lastLogin timestamp on successful login', async () => {
    const beforeLogin = new Date();

    await request(app).post('/api/auth/login').send({
      email: testUser.email,
      password: testUser.password,
    });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    expect(user).toBeDefined();
    expect(user!.lastLogin.getTime()).toBeGreaterThanOrEqual(beforeLogin.getTime());
  });
});
