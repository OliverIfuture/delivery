// controllers/coachCommunityController.js
//
// NUEVO — "Coach Community": una comunidad exclusiva entre entrenadores
// (no sus clientes), separada de la comunidad normal de cada gym. Reutiliza
// TAL CUAL las tablas/funciones ya reales de models/community.js y
// models/product.js (post/likes_publish/coments_post/poll_votes) — la única
// diferencia es que aquí el "id_company" que agrupa el feed NO es
// req.user.mi_store (la empresa propia del entrenador que llama) sino un id
// FIJO: la cuenta "Coach Community" (ver users.id=26371 / company.id=1389,
// creada como un entrenador real más vía createWithImageUserAndCompany).
//
// Como cualquier entrenador real puede publicar aquí sin importar su propia
// empresa, esto solo necesita wrappers para getFeed/createPost/deletePost
// (las únicas funciones de comunidad que sí dependen de id_company). Dar
// like, comentar, votar, reportar y fijar/desfijar NO dependen de
// id_company en absoluto (operan por id_post) — el frontend llama esos
// mismos endpoints ya existentes de /api/community directamente, sin
// duplicar nada aquí.
const Community = require('../models/community.js');
const Product = require('../models/product.js');
const User = require('../models/user.js');
const storage = require('../utils/cloud_storage.js');

const COACH_COMMUNITY_ID = '1389';

module.exports = {

    async getFeed(req, res) {
        try {
            const id_user = req.user.id;
            const data = await Community.getFeed(id_user, COACH_COMMUNITY_ID);
            return res.status(200).json({ success: true, data });
        } catch (error) {
            console.log(`Error en coachCommunityController.getFeed: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al obtener Coach Community', error: error.message });
        }
    },

    async createPost(req, res) {
        try {
            const { description, post_type, achievement_title, achievement_subtitle, poll_options } = req.body;

            const files = req.files;
            let image_post = null;
            if (files && files.length > 0) {
                const uploadedUrls = [];
                for (let i = 0; i < files.length; i++) {
                    const url = await storage(files[i], `coach_community_${Date.now()}_${i}`);
                    if (url) uploadedUrls.push(url);
                }
                if (uploadedUrls.length > 0) image_post = JSON.stringify(uploadedUrls);
            }

            const created = await Community.createPost({
                id_user: req.user.id,
                description,
                image_post,
                id_company: COACH_COMMUNITY_ID,
                poll_options: poll_options || null,
                is_trainer: true,
                post_type: post_type || 'general',
                achievement_title: achievement_title || null,
                achievement_subtitle: achievement_subtitle || null
            });

            return res.status(201).json({ success: true, data: { id: created.id } });
        } catch (error) {
            console.log(`Error en coachCommunityController.createPost: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al publicar en Coach Community', error: error.message });
        }
    },

    // Solo el propio autor puede borrar su post aquí — a diferencia de la
    // comunidad normal, ningún entrenador individual "es dueño" de Coach
    // Community, así que no aplica el permiso extra de "entrenador de la
    // comunidad" que sí tiene communityController.deletePost.
    async deletePost(req, res) {
        try {
            const id_post = req.params.id_post;
            const post = await Community.getPostById(id_post);
            if (!post) {
                return res.status(404).json({ success: false, message: 'Publicación no encontrada.' });
            }
            if (String(post.id_user) !== String(req.user.id)) {
                return res.status(403).json({ success: false, message: 'No puedes eliminar esta publicación.' });
            }
            await Product.deletePost(id_post);
            return res.status(200).json({ success: true, message: 'Publicación eliminada.' });
        } catch (error) {
            console.log(`Error en coachCommunityController.deletePost: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al eliminar la publicación', error: error.message });
        }
    },

    // NUEVO — ranking de entrenadores por número de clientes (no por
    // puntos de actividad, ese es otro leaderboard ya existente para la
    // comunidad de cada gym). period: '7d' | '30d' | 'alltime'.
    async getLeaderboard(req, res) {
        try {
            const period = ['7d', '30d', 'alltime'].includes(req.params.period) ? req.params.period : 'alltime';
            const data = await User.getCoachClientLeaderboard(period, 5);
            return res.status(200).json({ success: true, data });
        } catch (error) {
            console.log(`Error en coachCommunityController.getLeaderboard: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al obtener el leaderboard', error: error.message });
        }
    }

};
