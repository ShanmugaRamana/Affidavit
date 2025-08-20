const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const KEYFILEPATH = path.join(__dirname, '..', 'google-credentials.json');
const SCOPES = ['https://www.googleapis.com/auth/drive'];

const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILEPATH,
    scopes: SCOPES,
});

const drive = google.drive({ version: 'v3', auth });

// Use SHARED_DRIVE_ID instead of regular folder ID
const SHARED_DRIVE_ID = process.env.GOOGLE_SHARED_DRIVE_ID || '1dECl2_R968FcFXRsnEjQRIUnVBFJzpEk'; // Default ID for testing

if (!SHARED_DRIVE_ID) {
    throw new Error('GOOGLE_SHARED_DRIVE_ID environment variable is required');
}

async function uploadFileToDrive(fileObject) {
    try {
        const { path: filePath, originalname, mimetype } = fileObject;

        const response = await drive.files.create({
            requestBody: {
                name: originalname,
                parents: [SHARED_DRIVE_ID], // This should be a shared drive ID
                mimeType: mimetype,
            },
            media: {
                mimeType: mimetype,
                body: fs.createReadStream(filePath),
            },
            fields: 'id, webViewLink',
            supportsAllDrives: true, // Required for shared drives
        });

        const fileId = response.data.id;
        if (fileId) {
            await drive.permissions.create({
                fileId: fileId,
                requestBody: {
                    role: 'reader',
                    type: 'anyone',
                },
                supportsAllDrives: true, // Required for shared drives
            });

            return `https://drive.google.com/file/d/${fileId}/preview`;
        }
        return null;
    } catch (error) {
        console.error('Error uploading to Google Drive:', error);
        throw new Error('Failed to upload file to Google Drive.');
    }
}

// Helper function to create a shared drive (run once)
async function createSharedDrive(name) {
    try {
        const response = await drive.drives.create({
            requestId: `create-${Date.now()}`, // Unique request ID
            requestBody: {
                name: name,
            },
        });
        
        console.log('Shared Drive created:', response.data);
        return response.data.id;
    } catch (error) {
        console.error('Error creating shared drive:', error);
        throw error;
    }
}

// Helper function to list shared drives
async function listSharedDrives() {
    try {
        const response = await drive.drives.list();
        console.log('Available Shared Drives:', response.data.drives);
        return response.data.drives;
    } catch (error) {
        console.error('Error listing shared drives:', error);
        throw error;
    }
}

module.exports = { 
    uploadFileToDrive, 
    createSharedDrive, 
    listSharedDrives 
};