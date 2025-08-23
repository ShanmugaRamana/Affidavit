const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema({
    originalFilename: {
        type: String,
        required: true
    },
    summaryText: {
        type: String,
        required: true
    },
    gridFsId: {
        type: mongoose.Schema.Types.ObjectId, 
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Analysis = mongoose.model('Analysis', analysisSchema);

module.exports = Analysis;