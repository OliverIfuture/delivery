// controllers/communityController.js
//
// NUEVO — Comunidad real para el panel Vue del entrenador. Los "verbos"
// que ya existían (dar like, comentar, votar, fijar, reportar, bloquear)
// se reutilizan tal cual desde Product (models/product.js) — no se
// duplica nada de eso. Lo nuevo aquí es: resolver bien la comunidad del
// entrenador (id_entrenador || mi_store, ver nota en models/community.js),
// crear el post con tipo/logro, y un toggle de like que decide solo si
// tiene que dar o quitar el like (evita que el frontend tenga que llevar
// ese estado y se desincronice).
const Community = require('../models/community.js');
const Product = require('../models/product.js');
const storage = require('../utils/cloud_storage.js');

function resolveCommunityId(req) {
    const id = req.user.id_entrenador || req.user.mi_store;
    return id ? String(id) : null;
}

module.exports = {

    async getFeed(req, res) {
        try {
            const id_user = req.user.id;
            const id_company = resolveCommunityId(req);
            if (!id_company) {
                return res.status(400).json({ success: false, message: 'El usuario no tiene una comunidad asignada.' });
            }
            const data = await Community.getFeed(id_user, id_company);
            return res.status(200).json({ success: true, data });
        } catch (error) {
            console.log(`Error en communityController.getFeed: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al obtener la comunidad', error: error.message });
        }
    },

    async createPost(req, res) {
        try {
            const id_company = resolveCommunityId(req);
            if (!id_company) {
                return res.status(400).json({ success: false, message: 'El usuario no tiene una comunidad asignada.' });
            }
            const { description, post_type, achievement_title, achievement_subtitle, poll_options } = req.body;

            const files = req.files;
            let image_post = null;
            if (files && files.length > 0) {
                const uploadedUrls = [];
                for (let i = 0; i < files.length; i++) {
                    const url = await storage(files[i], `community_${Date.now()}_${i}`);
                    if (url) uploadedUrls.push(url);
                }
                if (uploadedUrls.length > 0) image_post = JSON.stringify(uploadedUrls);
            }

            const created = await Community.createPost({
                id_user: req.user.id,
                description,
                image_post,
                id_company,
                poll_options: poll_options || null,
                is_trainer: true,
                post_type: post_type || 'general',
                achievement_title: achievement_title || null,
                achievement_subtitle: achievement_subtitle || null
            });

            return res.status(201).json({ success: true, data: { id: created.id } });
        } catch (error) {
            console.log(`Error en communityController.createPost: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al publicar', error: error.message });
        }
    },

    async deletePost(req, res) {
        try {
            const id_post = req.params.id_post;
            const post = await Community.getPostById(id_post);
            if (!post) {
                return res.status(404).json({ success: false, message: 'Publicación no encontrada.' });
            }
            const id_company = resolveCommunityId(req);
            const isAuthor = String(post.id_user) === String(req.user.id);
            const isCommunityTrainer = id_company && String(post.id_company) === id_company && req.user.mi_store;
            if (!isAuthor && !isCommunityTrainer) {
                return res.status(403).json({ success: false, message: 'No puedes eliminar esta publicación.' });
            }
            await Product.deletePost(id_post);
            return res.status(200).json({ success: true, message: 'Publicación eliminada.' });
        } catch (error) {
            console.log(`Error en communityController.deletePost: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al eliminar la publicación', error: error.message });
        }
    },

    async togglePin(req, res) {
        try {
            const id_post = req.params.id_post;
            const data = await Product.togglePinPost(id_post);
            return res.status(200).json({ success: true, data });
        } catch (error) {
            console.log(`Error en communityController.togglePin: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al fijar/desfijar', error: error.message });
        }
    },

    async toggleLike(req, res) {
        try {
            const id_post = req.params.id_post;
            const id_user = req.user.id;
            const existing = await Community.findUserLikeOnPost(id_post, id_user);
            if (existing) {
                await Product.deleteLikePost(existing.id);
                return res.status(200).json({ success: true, liked: false });
            }
            await Product.createLikePost(id_post, req.user.name || '', req.user.email || '', id_user);
            return res.status(200).json({ success: true, liked: true });
        } catch (error) {
            console.log(`Error en communityController.toggleLike: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al dar like', error: error.message });
        }
    },

    async getComments(req, res) {
        try {
            const id_post = req.params.id_post;
            const data = await Product.findPostComent(id_post);
            return res.status(200).json({ success: true, data });
        } catch (error) {
            console.log(`Error en communityController.getComments: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al obtener comentarios', error: error.message });
        }
    },

    async addComment(req, res) {
        try {
            const { id_post, comment } = req.body;
            if (!id_post || !comment || !comment.trim()) {
                return res.status(400).json({ success: false, message: 'Falta id_post o comment.' });
            }
            await Product.createComent({ id_plate: id_post, id_user: req.user.id, review: comment.trim() });
            return res.status(201).json({ success: true, message: 'Comentario publicado.' });
        } catch (error) {
            console.log(`Error en communityController.addComment: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al comentar', error: error.message });
        }
    },

    async castVote(req, res) {
        try {
            const { id_post, option_id } = req.body;
            await Product.castVote(id_post, req.user.id, option_id);
            return res.status(200).json({ success: true, message: 'Voto registrado.' });
        } catch (error) {
            console.log(`Error en communityController.castVote: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al votar', error: error.message });
        }
    },

    async reportPost(req, res) {
        try {
            const { post_id } = req.body;
            await Product.reportPost(post_id, req.user.id);
            return res.status(200).json({ success: true, message: 'Publicación reportada.' });
        } catch (error) {
            console.log(`Error en communityController.reportPost: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al reportar', error: error.message });
        }
    }

};
