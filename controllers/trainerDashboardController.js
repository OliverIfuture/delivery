const Exercise = require('../models/exercise.js');
const SubscriptionPlan = require('../models/subscriptionPlan.js');
const User = require('../models/user.js');

module.exports = {

    /**
     * Obtiene las estadísticas de onboarding (checklist)
     */
    async getOnboardingStats(req, res, next) {
        try {
            const id_company = req.user.mi_store; // ID del entrenador
            
            // 1. Ejecutar todos los conteos en paralelo
            const results = await Promise.all([
                Exercise.countByCompany(id_company),
                SubscriptionPlan.countByCompany(id_company),
                User.countInvitationsByCompany(id_company)
            ]);

            // 2. Parsear los resultados (vienen como { count: '1' })
            const exerciseCount = parseInt(results[0].count, 10);
            const planCount = parseInt(results[1].count, 10);
            const invitationCount = parseInt(results[2].count, 10);
            
            // 3. Obtener el estado de Stripe (esto ya está en req.user.company)
            // (Asumiendo que tu 'passport.js' carga la compañía en req.user)
            // Si no, tendríamos que llamarlo: const company = await User.findCompanyById(id_company);
            // const hasConnectedStripe = req.user.company.chargesEnabled;
            
            // Por ahora, lo dejamos pendiente y lo cargamos en el frontend

            // 4. Devolver los booleanos
            return res.status(200).json({
                success: true,
                data: {
                    hasCreatedFirstExercise: exerciseCount > 0,
                    hasCreatedFirstPlan: planCount > 0,
                    hasInvitedFirstClient: invitationCount > 0
                }
            });
            
        } catch (error) {
            console.log(`Error en trainerDashboardController.getOnboardingStats: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al obtener las estadísticas del dashboard',
                error: error.message
            });
        }
    },

};
