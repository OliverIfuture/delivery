const mongoose = require('mongoose');

const evaluationControlSchema = new mongoose.Schema({
    // CAMBIO IMPORTANTE:
    // Quitamos "mongoose.Schema.Types.ObjectId" y ponemos "String".
    // También quitamos "ref: 'User'" porque el usuario no vive en MongoDB, vive en tu SQL.
    userId: {
        type: String,
        required: true,
        index: true // Mantenemos el índice para búsquedas rápidas
    },
    trainerId: {
        type: String,
        required: false
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    },
    result: {
        type: String,
        default: null
    },
    lastEvaluationDate: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Índice compuesto para la validación de los 15 días
evaluationControlSchema.index({ userId: 1, lastEvaluationDate: -1 });

module.exports = mongoose.model('EvaluationControl', evaluationControlSchema);