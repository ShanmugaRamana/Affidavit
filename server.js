const express = require('express');
const dotenv = require('dotenv');
const { spawn } = require('child_process');
const path = require('path');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const { Readable } = require('stream');
const { ObjectId } = require('mongodb');
const os = require('os'); // <-- ADD THIS
const { connectToDb } = require('./config/db.js');
const Analysis = require('./models/Analysis.js');

// --- Start FastAPI Backend ---
const backend = spawn('uvicorn', ['main:app', '--reload', '--port', '8000'], { cwd: './backend', shell: true, stdio: 'pipe' });
backend.stdout.on('data', (data) => console.log(`[FastAPI]: ${data.toString().trim()}`));
backend.stderr.on('data', (data) => console.error(`[FastAPI ERROR]: ${data.toString().trim()}`));

// --- Express App Setup ---
dotenv.config();
const app = express();
const frontendDir = path.join(__dirname, 'frontend');
app.set('views', path.join(frontendDir, 'views'));
app.set('view engine', 'ejs');
const upload = multer({ storage: multer.memoryStorage() });

// --- Function to get local network IP ---
function getLocalIpAddress() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            const { address, family, internal } = iface;
            if (family === 'IPv4' && !internal) {
                return address;
            }
        }
    }
    return 'localhost'; // Fallback
}

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
            const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
            const response = await axios.post(`${backendUrl}/summarize/`, form, { headers: form.getHeaders() });
            const summaryData = response.data;

            const newAnalysis = new Analysis({
                originalFilename: req.file.originalname,
                summaryText: summaryData.summary,
                gridFsId: fileId
            });
            await newAnalysis.save();
            
            // Pass the server's full address to the template
            const PORT = process.env.PORT || 3000;
            const serverAddress = `${req.protocol}://${getLocalIpAddress()}:${PORT}`;
            res.render('dashboard', {
                summary: newAnalysis.summaryText,
                fileId: newAnalysis.gridFsId,
                fileMimeType: req.file.mimetype,
                fileName: req.file.originalname,
                serverAddress: serverAddress,
            });
        } catch (error) {
            console.error('Error during analysis:', error.response ? error.response.data : error.message);
            res.status(500).send('Failed to analyze the document.');
        }
    });

    const PORT = process.env.PORT || 3000;
    // Bind to 0.0.0.0 to make the server accessible on the local network
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`[Node.js]: Frontend running on http://localhost:${PORT}`);
        console.log(`[Node.js]: Accessible on your network at http://${getLocalIpAddress()}:${PORT}`);
    });
}

startServer();