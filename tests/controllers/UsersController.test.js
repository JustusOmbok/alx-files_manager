import { expect } from 'chai';
import request from 'supertest';
import app from '../app';

describe('POST /users', () => {
  it('should create a new user and return status 201', async () => {
    const res = await request(app)
      .post('/users')
      .send({ username: 'testuser', email: 'test@example.com', password: 'password' });
    expect(res.status).to.equal(201);
    expect(res.body).to.be.an('object');
    // Add more assertions for user data
  });
});

describe('GET /users/me', () => {
  it('should return status 200 and user data', async () => {
    const res = await request(app).get('/users/me');
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('object');
    // Add more assertions for user data
  });
});
