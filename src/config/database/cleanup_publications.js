const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const mongoURI = process.env.MONGODB_URI || 'mongodb://researchconnectdb:researchconnectdb@ac-qpuswwn-shard-00-00.0x5pbm5.mongodb.net:27017,ac-qpuswwn-shard-00-01.0x5pbm5.mongodb.net:27017,ac-qpuswwn-shard-00-02.0x5pbm5.mongodb.net:27017/research_connect?ssl=true&replicaSet=atlas-t9ah7c-shard-0&authSource=admin';

async function run() {
  console.log('Connecting to MongoDB...', mongoURI);
  await mongoose.connect(mongoURI);
  console.log('MongoDB connected successfully.');

  const db = mongoose.connection.db;
  const collection = db.collection('publications');

  // 1. Unset empty string and null values for doi & googleScholarPublicationId
  console.log('Cleaning empty values for doi and googleScholarPublicationId...');
  const unsetResult = await collection.updateMany(
    {
      $or: [
        { doi: '' },
        { doi: null },
        { googleScholarPublicationId: '' },
        { googleScholarPublicationId: null }
      ]
    },
    [
      {
        $set: {
          doi: {
            $cond: {
              if: { $or: [{ $eq: ['$doi', ''] }, { $eq: ['$doi', null] }] },
              then: '$$REMOVE',
              else: '$doi'
            }
          },
          googleScholarPublicationId: {
            $cond: {
              if: { $or: [{ $eq: ['$googleScholarPublicationId', ''] }, { $eq: ['$googleScholarPublicationId', null] }] },
              then: '$$REMOVE',
              else: '$googleScholarPublicationId'
            }
          }
        }
      }
    ]
  );
  console.log(`Cleaned empty values in ${unsetResult.modifiedCount} publications.`);

  // 2. Remove duplicate publications based on slug or doi or googleScholarPublicationId (if they collide)
  console.log('Checking for duplicates...');
  const cursor = collection.aggregate([
    {
      $group: {
        _id: '$slug',
        count: { $sum: 1 },
        docs: { $push: '$$ROOT' }
      }
    },
    { $match: { count: { $gt: 1 } } }
  ]);

  for await (const group of cursor) {
    if (!group._id) continue;
    console.log(`Found ${group.count} duplicates for slug: "${group._id}"`);
    // Sort docs by updatedAt descending, keep the first one, delete the rest
    const sorted = group.docs.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    const toKeep = sorted[0];
    const toDelete = sorted.slice(1);
    
    for (const doc of toDelete) {
      await collection.deleteOne({ _id: doc._id });
      console.log(`Deleted duplicate publication ID: ${doc._id}`);
    }
  }

  // 3. Drop index doi_1 and googleScholarPublicationId_1 if they exist
  const indexes = await collection.indexes();
  console.log('Existing indexes:', indexes.map(i => i.name));

  const doiIndexExists = indexes.some(idx => idx.name === 'doi_1');
  if (doiIndexExists) {
    console.log('Dropping doi_1 index...');
    await collection.dropIndex('doi_1');
    console.log('doi_1 index dropped.');
  }

  const scholarIndexExists = indexes.some(idx => idx.name === 'googleScholarPublicationId_1');
  if (scholarIndexExists) {
    console.log('Dropping googleScholarPublicationId_1 index...');
    await collection.dropIndex('googleScholarPublicationId_1');
    console.log('googleScholarPublicationId_1 index dropped.');
  }

  console.log('Database cleanup completed successfully.');
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Error during database cleanup:', err);
  process.exit(1);
});
