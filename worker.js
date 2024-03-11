/* eslint-disable import/no-named-as-default */
import Bull from 'bull';
import { generateThumbnail } from 'image-thumbnail'; // Assuming you have this module installed
import path from 'path';
import fs from 'fs';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const fileQueue = new Bull('fileQueue');

fileQueue.process(async (job) => {
  const { userId, fileId } = job.data;

  // Check if userId and fileId are present
  if (!userId || !fileId) {
    throw new Error('Missing userId or fileId');
  }

  // Check if file exists in DB
  const file = await dbClient.client
    .db()
    .collection('files')
    .findOne({ _id: fileId, userId: userId });

  if (!file) {
    throw new Error('File not found');
  }

  // Generate thumbnails
  const sizes = [500, 250, 100];
  await Promise.all(sizes.map(async (size) => {
    const thumbnailPath = path.join(process.env.FOLDER_PATH || '/tmp/files_manager', `${fileId}_${size}`);
    await generateThumbnail(file.localPath, { width: size, height: size, responseType: 'base64' })
      .then(thumbnail => fs.writeFileSync(thumbnailPath, thumbnail))
      .catch(error => console.error('Error generating thumbnail:', error));
  }));

  return 'Thumbnails generated successfully';
});
