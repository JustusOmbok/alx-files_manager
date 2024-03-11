import { expect } from 'chai';
import request from 'supertest';
import app from '../app';

describe('GET /connect', () => {
  it('should return status 200 and a token', async () => {
    const res = await request(app).get('/connect');
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('token');
  });
});

describe('GET /disconnect', () => {
  it('should return status 204 (No Content)', async () => {
    const res = await request(app).get('/disconnect');
    expect(res.status).to.equal(204);
    expect(res.body).to.be.empty;
  });
});
