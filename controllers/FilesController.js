/* eslint-disable import/no-named-as-default */
import { ObjectId } from 'mongodb';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import mime from 'mime-types';
import path from 'path';
import dbClient from '../utils/db';
import fileControllerHelper from '../utils/FileControllerHelper';

class FilesController {
  static async postUpload(req, res) {
    // Retrieve the user based on the token
    const user = await fileControllerHelper.getUserFromToken(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // Define accepted file types
    const acceptedTypes = ['folder', 'file', 'image'];
    const {
      name,
      type,
      parentId,
      isPublic,
      data,
    } = req.body;

    // Check for missing fields
    if (!name) return res.status(400).json({ error: 'Missing name' });
    if ((!type || !acceptedTypes.includes(type))) return res.status(400).json({ error: 'Missing or invalid type' });
    if (!data && type !== 'folder') return res.status(400).json({ error: 'Missing data' });

    // Check parent folder if parentId is provided
    if (parentId) {
      const filesCollection = dbClient.db.collection('files');
      const parent = await filesCollection.findOne({ _id: ObjectId(parentId) });
      if (!parent) return res.status(400).json({ error: 'Parent not found' });
      if (parent.type !== 'folder') return res.status(400).json({ error: 'Parent is not a folder' });
    }

    // Prepare file data
    const fileData = {
      name,
      type,
      parentId: parentId || 0,
      isPublic: isPublic || false,
      userId: user._id.toString(),
    };

    // Create folder or save file data
    if (type === 'folder') {
      const filesCollection = dbClient.db.collection('files');
      const result = await filesCollection.insertOne(fileData);
      fileData.id = result.insertedId;
      delete fileData._id;
      res.setHeader('Content-Type', 'application/json');
      return res.status(201).json(fileData);
    }

    // Save file to disk
    const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
    const fileName = uuidv4();
    const filePath = path.join(folderPath, fileName);
    fileData.localPath = filePath;
    const decodedData = Buffer.from(data, 'base64');
    const pathExists = await fileControllerHelper.pathExists(folderPath);
    if (!pathExists) {
      await fs.promises.mkdir(folderPath, { recursive: true });
    }
    return fileControllerHelper.writeToFile(res, filePath, decodedData, fileData);
  }

  // Other methods...
}

export default FilesController;
