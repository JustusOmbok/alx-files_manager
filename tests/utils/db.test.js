import { expect } from 'chai';
import dbClient from '../utils/db';

describe('Database Client', () => {
  it('should connect to the database successfully', async () => {
    const isConnected = await dbClient.connect();
    expect(isConnected).to.be.true;
  });

  it('should insert and retrieve a document from the database', async () => {
    const document = { name: 'testDocument' };
    await dbClient.insertOne('testCollection', document);
    const retrievedDocument = await dbClient.findOne('testCollection', { name: 'testDocument' });
    expect(retrievedDocument).to.deep.equal(document);
  });

  it('should delete a document from the database', async () => {
    await dbClient.deleteOne('testCollection', { name: 'testDocument' });
    const retrievedDocument = await dbClient.findOne('testCollection', { name: 'testDocument' });
    expect(retrievedDocument).to.be.null;
  });
});
