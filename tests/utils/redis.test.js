import { expect } from 'chai';
import redisClient from '../utils/redis';

describe('Redis Client', () => {
  it('should connect to Redis successfully', async () => {
    const isConnected = await redisClient.connect();
    expect(isConnected).to.be.true;
  });

  it('should set and get a value from Redis', async () => {
    await redisClient.set('testKey', 'testValue');
    const value = await redisClient.get('testKey');
    expect(value).to.equal('testValue');
  });

  it('should delete a key from Redis', async () => {
    await redisClient.del('testKey');
    const value = await redisClient.get('testKey');
    expect(value).to.be.null;
  });
});
