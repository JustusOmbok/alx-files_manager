import { ObjectId } from 'mongodb';
import fs from 'fs';
import Queue from 'bull';
import redisClient from './redis';
import dbClient from './db';

// Create a queue for processing files
const fileQueue = new Queue('fileQueue', {
  redis: {
    host: '127.0.0.1',
    port: 6379,
  },
});

class FileControllerHelper {
  // Retrieve user from authentication token
  static async getUserFromToken(req) {
    const authToken = req.header('X-Token') || null;
    if (!authToken) return null;

    // Check Redis for user associated with the token
    const key = `auth_${authToken}`;
    const user = await redisClient.get(key);
    if (!user) return null;

    // Find user in the database using the user ID from Redis
    const userCollection = dbClient.db.collection('users');
    const dbUser = await userCollection.findOne({ _id: ObjectId(user) });
    if (!dbUser) return null;
    return dbUser;
  }

  // Check if a file or folder exists at the specified path
  static pathExists(path) {
    return new Promise((resolve) => {
      fs.access(path, fs.constants.F_OK, (error) => {
        resolve(!error);
      });
    });
  }

  // Write file data to disk and save metadata to the database
  static async writeToFile(res, filePath, data, fileData) {
    // Write data to file
    await fs.promises.writeFile(filePath, data, 'utf-8');

    // Insert file metadata into the database
    const filesCollection = dbClient.db.collection('files');
    const result = await filesCollection.insertOne(fileData);

    // Prepare response data
    const response = {
      ...fileData,
      id: result.insertedId,
    };

    // Remove unnecessary fields from the response
    delete response._id;
    delete response.localPath;

    // Add image processing job to the queue if the file type is 'image'
    if (response.type === 'image') {
      fileQueue.add({ userId: response.userId, fileId: response.id });
    }

    // Set response headers and return the response
    res.setHeader('Content-Type', 'application/json');
    return res.status(201).json(response);
  }
}

export default FileControllerHelper;
