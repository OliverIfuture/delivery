// controllers/trainerNotificationsController.js
//
// NUEVO — endpoints reales para la campana de notificaciones del panel
// web (ver models/trainerNotification.js). Las notificaciones mismas se
// CREAN desde otros controladores (chatController.sendMessage,
// clientSubscriptionsController.stripeWebhook, inviteController.acceptInvite)
// llamando directo a TrainerNotification.create — aquí solo viven los
// endpoints de lectura/marcado que consume el panel.
const TrainerNotification = require('../models/trainerNotification.js');

module.exports = {
    async list(req, res) {
        try {
            const rows = await TrainerNotification.findByUser(req.user.id);
            return res.status(200).json({
                success: true,
                data: rows.map((n) => ({
                    id: n.id,
                    type: n.type,
                    title: n.title,
                    body: n.body,
                    link: n.link,
                    read: n.is_read,
                    time: n.created_at
                }))
            });
        } catch (error) {
            console.log(`Error en trainerNotificationsController.list: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al obtener tus notificaciones', error: error.message });
        }
    },

    async unreadCount(req, res) {
        try {
            const count = await TrainerNotification.countUnread(req.user.id);
            return res.status(200).json({ success: true, data: { count } });
        } catch (error) {
            console.log(`Error en trainerNotificationsController.unreadCount: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al contar tus notificaciones', error: error.message });
        }
    },

    async markRead(req, res) {
        try {
            const { id } = req.params;
            await TrainerNotification.markRead(id, req.user.id);
            return res.status(200).json({ success: true });
        } catch (error) {
            console.log(`Error en trainerNotificationsController.markRead: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al marcar la notificación', error: error.message });
        }
    },

    async markAllRead(req, res) {
        try {
            await TrainerNotification.markAllRead(req.user.id);
            return res.status(200).json({ success: true });
        } catch (error) {
            console.log(`Error en trainerNotificationsController.markAllRead: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al marcar tus notificaciones', error: error.message });
        }
    }
};
