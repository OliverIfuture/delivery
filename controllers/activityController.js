// controllers/activityController.js
//
// NUEVO — Feed de "Actividad" del panel del entrenador: qué pasó (posts,
// likes, comentarios, rutinas terminadas, pagos) en su comunidad, para
// mostrarlo día por día. Sigue el mismo patrón que User.getRecentActivity
// (la versión por-cliente, ya real): entrega los datos crudos de cada
// fuente por separado, sin combinar ni formatear texto — eso lo resuelve
// el frontend, que ya sabe agrupar/traducir cada tipo.
const Community = require('../models/community.js');
const User = require('../models/user.js');
const SubscriptionPlan = require('../models/subscriptionPlan.js');

module.exports = {

    async getFeed(req, res) {
        try {
            const id_company = req.user.mi_store;
            if (!id_company) {
                return res.status(400).json({ success: false, message: 'No tienes una compañía asignada.' });
            }
            const limit = Math.min(Number(req.query.limit) || 40, 100);

            const [posts, likes, comments, workouts, payments] = await Promise.all([
                Community.getRecentPosts(id_company, limit),
                Community.getRecentLikes(id_company, limit),
                Community.getRecentComments(id_company, limit),
                User.getCompanyWorkoutActivity(id_company, limit),
                SubscriptionPlan.getRecentPayments(id_company, limit)
            ]);

            return res.status(200).json({
                success: true,
                data: { posts, likes, comments, workouts, payments }
            });
        } catch (error) {
            console.log(`Error en activityController.getFeed: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al obtener la actividad',
                error: error.message
            });
        }
    }

};
