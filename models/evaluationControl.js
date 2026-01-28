const mongoose = require('mongoose');

const evaluationControlSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // El cliente/alumno
        required: true
    },
    trainerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // El entrenador (si aplica)
        required: false
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    },
    result: {
        type: String, // Aquí guardaremos la respuesta de Gemini cuando termine
        default: null
    },
    lastEvaluationDate: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true // Esto crea automáticamente createdAt y updatedAt
});

// Índice compuesto para búsquedas rápidas
evaluationControlSchema.index({ userId: 1, lastEvaluationDate: -1 });

module.exports = mongoose.model('EvaluationControl', evaluationControlSchema);