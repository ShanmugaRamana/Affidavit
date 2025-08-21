const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const { Readable } = require('stream');
const { ObjectId } = require('mongodb');
const { connectToDb } = require('./config/db.js');
const Analysis = require('./models/Analysis.js');

// --- Express App Setup ---
dotenv.config();
const app = express();
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
    const { bucket } = await connectToDb();

    // --- Routes ---
    app.get('/', (req, res) => res.render('index'));

    app.get('/file/:id', async (req, res) => {
        try {
            const fileId = new ObjectId(req.params.id);
            const downloadStream = bucket.openDownloadStream(fileId);
            downloadStream.on('file', (file) => {
                res.setHeader('Content-Type', file.contentType);
                res.setHeader('Content-Disposition', `inline; filename="${file.filename}"`);
            });
            downloadStream.on('error', (err) => {
                res.status(404).send('File not found or stream error.');
            });
            downloadStream.pipe(res);
        } catch (error) {
            res.status(500).send('Server error while trying to retrieve file.');
        }
    });

    app.post('/upload', upload.single('document'), async (req, res) => {
        if (!req.file) {
            return res.status(400).send('No file uploaded.');
        }
        try {
            const readableStream = Readable.from(req.file.buffer);
            const uploadStream = bucket.openUploadStream(req.file.originalname, {
                contentType: req.file.mimetype,
            });
            readableStream.pipe(uploadStream);
            const fileId = uploadStream.id;
            
            const form = new FormData();
            form.append('file', req.file.buffer, { filename: req.file.originalname });
            // The frontend still communicates with the backend at localhost:8000
            const response = await axios.post('http://localhost:8000/summarize/', form, { headers: form.getHeaders() });
            const summaryData = response.data;

            const newAnalysis = new Analysis({
                originalFilename: req.file.originalname,
                summaryText: summaryData.summary,
                gridFsId: fileId
            });
            await newAnalysis.save();
            
            res.render('dashboard', {
                summary: newAnalysis.summaryText,
                fileId: newAnalysis.gridFsId,
                fileMimeType: req.file.mimetype,
                fileName: req.file.originalname
            });
        } catch (error) {
            console.error('Error during analysis:', error.response ? error.response.data : error.message);
            res.status(500).send('Failed to analyze the document.');
        }
    });

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`[Node.js]: Frontend running on http://localhost:${PORT}`);
    });
}

startServer();