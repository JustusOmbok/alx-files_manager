/* eslint-disable import/no-named-as-default */
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

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

    const { name, type, data, parentId = 0, isPublic = false } = req.body;

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
        .findOne({ _id: parentId });

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
};

export default FilesController;
