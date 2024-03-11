/* eslint-disable import/no-named-as-default */
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import mimeTypes from 'mime-types';
import { ObjectId } from 'mongodb';
import Bull from 'bull';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';
const fileQueue = new Bull('fileQueue');

const FilesController = {
  async postUpload(req, res) {
    const { 'x-token': token } = req.headers;
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      name, type, data, parentId = 0, isPublic = false,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }

    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }

    if (type !== 'folder' && !data) {
      return res.status(400).json({ error: 'Missing data' });
    }

    if (parentId !== 0) {
      const parentFile = await dbClient.client
        .db()
        .collection('files')
        .findOne({ _id: ObjectId(parentId) });

      if (!parentFile) {
        return res.status(400).json({ error: 'Parent not found' });
      }

      if (parentFile.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    let localPath = '';
    if (type !== 'folder') {
      if (!fs.existsSync(FOLDER_PATH)) {
        fs.mkdirSync(FOLDER_PATH, { recursive: true });
      }

      const fileUUID = uuidv4();
      localPath = path.join(FOLDER_PATH, fileUUID);

      const fileContent = Buffer.from(data, 'base64');
      fs.writeFileSync(localPath, fileContent);

      // Add a job to the queue for generating thumbnails
      if (type === 'image') {
        fileQueue.add({ userId, fileId: fileUUID });
      }
    }

    const newFile = {
      userId,
      name,
      type,
      isPublic,
      parentId,
      localPath: type !== 'folder' ? localPath : null,
    };

    const { insertedId } = await dbClient.client
      .db()
      .collection('files')
      .insertOne(newFile);

    return res.status(201).json({
      id: insertedId,
      userId,
      name,
      type,
      isPublic,
      parentId,
    });
  },

  async getShow(req, res) {
    const { 'x-token': token } = req.headers;
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = req.params.id;

    try {
      const file = await dbClient.client
        .db()
        .collection('files')
        .findOne({ _id: ObjectId(fileId), userId });

      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }

      return res.json(file);
    } catch (error) {
      console.error('Error retrieving file:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  async getIndex(req, res) {
    const { 'x-token': token } = req.headers;
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { parentId = 0, page = 0 } = req.query;
    const limit = 20;
    const skip = parseInt(page, 10) * limit;

    try {
      const files = await dbClient.client
        .db()
        .collection('files')
        .find({ parentId, userId })
        .skip(skip)
        .limit(limit)
        .toArray();

      return res.json(files);
    } catch (error) {
      console.error('Error retrieving files:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  async putPublish(req, res) {
    const { 'x-token': token } = req.headers;
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = req.params.id;

    try {
      const file = await dbClient.client
        .db()
        .collection('files')
        .findOneAndUpdate(
          { _id: ObjectId(fileId), userId },
          { $set: { isPublic: true } },
          { returnDocument: 'after' },
        );

      if (!file.value) {
        return res.status(404).json({ error: 'Not found' });
      }

      return res.json(file.value);
    } catch (error) {
      console.error('Error updating file:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  async putUnpublish(req, res) {
    const { 'x-token': token } = req.headers;
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = req.params.id;

    try {
      const file = await dbClient.client
        .db()
        .collection('files')
        .findOneAndUpdate(
          { _id: ObjectId(fileId), userId },
          { $set: { isPublic: false } },
          { returnDocument: 'after' },
        );

      if (!file.value) {
        return res.status(404).json({ error: 'Not found' });
      }

      return res.json(file.value);
    } catch (error) {
      console.error('Error updating file:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  async getFile(req, res) {
    const { 'x-token': token } = req.headers;
    const fileId = req.params.id;

    try {
      // Retrieve user based on token
      const userId = await redisClient.get(`auth_${token}`);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Check if file exists
      const file = await dbClient.client
        .db()
        .collection('files')
        .findOne({ _id: fileId });

      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }

      // Check file permissions
      if (!file.isPublic && file.userId !== userId) {
        return res.status(404).json({ error: 'Not found' });
      }

      // Check if file is a folder
      if (file.type === 'folder') {
        return res.status(400).json({ error: "A folder doesn't have content" });
      }

      // Check if file exists locally
      const filePath = path.join(process.env.FOLDER_PATH || '/tmp/files_manager', file.id);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Not found' });
      }

      // Read file content
      const fileContent = fs.readFileSync(filePath, 'utf-8');

      // Get MIME type based on file name
      const mimeType = mimeTypes.lookup(file.name);

      // Set headers and send file content
      res.setHeader('Content-Type', mimeType);
      return res.send(fileContent);
    } catch (error) {
      console.error('Error getting file:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },
};

export default FilesController;
