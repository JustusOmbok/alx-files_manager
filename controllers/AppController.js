import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const AppController = {
  async getStatus(req, res) {
    const redisStatus = redisClient.isAlive();
    const dbStatus = dbClient.isAlive();
    const status = {
      redis: redisStatus,
      db: dbStatus
    };
    return res.status(200).json(status);
  },

  async getStats(req, res) {
    const usersCount = await dbClient.nbUsers();
    const filesCount = await dbClient.nbFiles();
    const stats = {
      users: usersCount,
      files: filesCount
    };
    return res.status(200).json(stats);
  }
};

export default AppController;
