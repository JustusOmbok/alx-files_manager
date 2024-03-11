import { expect } from 'chai';
import request from 'supertest';
import app from '../app';

describe('GET /status', () => {
  it('should return status 200 and "OK"', async () => {
    const res = await request(app).get('/status');
    expect(res.status).to.equal(200);
    expect(res.body.message).to.equal('OK');
  });
});

describe('GET /stats', () => {
  it('should return status 200 and statistics data', async () => {
    const res = await request(app).get('/stats');
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('object');
    // Add more assertions for specific statistics data
  });
});
