import sha1 from 'sha1';
import redisClientInstance from '../utils/redis';
import dbClient from '../utils/db';

const UsersController = {
  async postNew(req, res) {
    try {
      const { email, password } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Missing email' });
      }

      if (!password) {
        return res.status(400).json({ error: 'Missing password' });
      }

      // Check if email already exists
      const existingUser = await dbClient.client
        .db()
        .collection('users')
        .findOne({ email });

      if (existingUser) {
        return res.status(400).json({ error: 'Already exist' });
      }

      const hashedPassword = sha1(password);

      const newUser = await dbClient.client
        .db()
        .collection('users')
        .insertOne({ email, password: hashedPassword });

      return res.status(201).json({ id: newUser.insertedId, email });
    } catch (error) {
      console.error('Error creating user:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getMe(req, res) {
    const token = req.headers['x-token'];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }

    const userId = await redisClientInstance.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }

    const user = await dbClient.client
      .db()
      .collection('users')
      .findOne({ _id: userId });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized - User not found' });
    }

    return res.status(200).json({ id: user._id, email: user.email });
  },
};

export default UsersController;
