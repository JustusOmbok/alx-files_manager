import { expect } from 'chai';
import request from 'supertest';
import app from '../app'; // assuming app is your Express app

describe('Initialize Application', () => {
  it('should initialize the application successfully', () => {
    expect(app).to.be.a('function');
  });

  it('should handle unknown routes with 404 status', async () => {
    const res = await request(app).get('/unknown-route');
    expect(res.status).to.equal(404);
    expect(res.body.error).to.equal('Not Found');
  });
});
