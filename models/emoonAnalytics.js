const db = require('../config/config');

const EmoonAnalytics = {};

EmoonAnalytics.getSummary = async () => {
    // 1. Ingresos totales del mes actual (desde emoon_payments)
    const sqlRevenue = `
        SELECT COALESCE(SUM(amount), 0) AS total_revenue
        FROM emoon.emoon_payments
        WHERE date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE)
    `;

    // 2. Clases programadas/realizadas en el mes actual (desde emoon_scheduled_classes)
    const sqlClasses = `
        SELECT COUNT(*) AS total_classes
        FROM emoon.emoon_scheduled_classes
        WHERE date_trunc('month', scheduled_datetime) = date_trunc('month', CURRENT_DATE)
    `;

    // 3. Clientes únicos con reservación en el mes actual (desde emoon_reservations)
    const sqlActiveClients = `
        SELECT COUNT(DISTINCT user_id) AS active_clients
        FROM emoon.emoon_reservations
        WHERE date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE)
    `;

    const [revenueRes, classesRes, clientsRes] = await Promise.all([
        db.one(sqlRevenue),
        db.one(sqlClasses),
        db.one(sqlActiveClients)
    ]);

    return {
        total_revenue: parseFloat(revenueRes.total_revenue || 0),
        total_classes: parseInt(classesRes.total_classes || 0),
        active_clients: parseInt(clientsRes.active_clients || 0)
    };
};

module.exports = EmoonAnalytics;