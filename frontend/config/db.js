// /config/db.js
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const dotenv = require('dotenv');

dotenv.config();
const url = process.env.MONGO_URL;

let bucket;

async function connectToDb() {
    if (mongoose.connection.readyState >= 1) {
        return { bucket };
    }
    try {
        await mongoose.connect(url);
        const db = mongoose.connection.db;
        bucket = new GridFSBucket(db, { bucketName: 'uploads' });
        console.log('[Node.js]: Connected to MongoDB using Mongoose.');
        return { bucket };
    } catch (e) {
        console.error('Failed to connect to MongoDB', e);
        process.exit(1);
    }
}

module.exports = { connectToDb };