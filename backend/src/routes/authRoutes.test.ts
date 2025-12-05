import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import prisma from '../config/database';

describe('POST /api/auth/register', () => {
  const app = createApp();

  // Clean up test users after tests
  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'test-',
        },
      },
    });
  });

  it('should register a new user with valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'TestUser123',
        email: `test-${Date.now()}@example.com`,
        password: 'SecurePass123',
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('user');
    expect(response.body.user).toHaveProperty('id');
    expect(response.body.user).toHaveProperty('username', 'TestUser123');
    expect(response.body.user).not.toHaveProperty('passwordHash');
  });

  it('should reject registration with short password', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'TestUser456',
        email: `test-${Date.now()}@example.com`,
        password: 'short',
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('should reject registration with weak password (no uppercase)', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'TestUser789',
        email: `test-${Date.now()}@example.com`,
        password: 'weakpass123',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain('uppercase');
  });

  it('should reject registration with weak password (no number)', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'TestUser101',
        email: `test-${Date.now()}@example.com`,
        password: 'WeakPassword',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain('number');
  });

  it('should reject registration with invalid email', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'TestUser202',
        email: 'invalid-email',
        password: 'SecurePass123',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain('email');
  });

  it('should reject registration with invalid username (special chars)', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'Test@User!',
        email: `test-${Date.now()}@example.com`,
        password: 'SecurePass123',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain('Username');
  });

  it('should reject registration with duplicate username', async () => {
    const uniqueEmail1 = `test-${Date.now()}@example.com`;
    const uniqueEmail2 = `test-${Date.now() + 1}@example.com`;

    // First registration
    await request(app).post('/api/auth/register').send({
      username: 'DuplicateUser',
      email: uniqueEmail1,
      password: 'SecurePass123',
    });

    // Second registration with same username
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'DuplicateUser',
        email: uniqueEmail2,
        password: 'SecurePass123',
      });

    expect(response.status).toBe(409);
    expect(response.body.error.message).toContain('Username already taken');
  });

  it('should reject registration with duplicate email', async () => {
    const uniqueEmail = `test-${Date.now()}@example.com`;

    // First registration
    await request(app).post('/api/auth/register').send({
      username: 'UniqueUser1',
      email: uniqueEmail,
      password: 'SecurePass123',
    });

    // Second registration with same email
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'UniqueUser2',
        email: uniqueEmail,
        password: 'SecurePass123',
      });

    expect(response.status).toBe(409);
    expect(response.body.error.message).toContain('Email already registered');
  });
});
