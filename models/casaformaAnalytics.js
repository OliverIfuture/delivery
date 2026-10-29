// models/casaformaAnalytics.js
const db = require('../config/config');

const CasaformaAnalytics = {};

CasaformaAnalytics.getSummary = async () => {
    const sqlRevenue = `
        SELECT COALESCE(SUM(amount), 0) AS revenue_this_month
        FROM casaforma.casaforma_payments
        WHERE date_trunc('month', paid_at) = date_trunc('month', CURRENT_DATE)
    `;

    const sqlTotalClients = `
        SELECT COUNT(*) AS total_clients
        FROM casaforma.casaforma_users
        WHERE role = 'client' AND is_deleted = false
    `;

    const sqlReservationsToday = `
        SELECT COUNT(*) AS reservations_today
        FROM casaforma.casaforma_reservations r
        INNER JOIN casaforma.casaforma_scheduled_classes sc ON r.scheduled_class_id = sc.id
        WHERE sc.scheduled_datetime::date = CURRENT_DATE AND r.status != 'cancelled'
    `;

    const sqlOccupancy = `
        SELECT
            COALESCE(
                ROUND((COUNT(r.id)::numeric / NULLIF(SUM(COALESCE(sc.override_capacity, ct.max_capacity, 10)), 0)) * 100, 1),
                0
            ) AS avg_occupancy
        FROM casaforma.casaforma_scheduled_classes sc
        LEFT JOIN casaforma.casaforma_class_types ct ON sc.class_type_id = ct.id
        LEFT JOIN casaforma.casaforma_reservations r ON r.scheduled_class_id = sc.id AND r.status != 'cancelled'
        WHERE date_trunc('month', sc.scheduled_datetime) = date_trunc('month', CURRENT_DATE)
    `;

    const sqlOccupancyChart = `
        SELECT ct.name AS label, COUNT(r.id)::int AS reservations, COALESCE(sc.override_capacity, ct.max_capacity, 10) AS capacity
        FROM casaforma.casaforma_scheduled_classes sc
        LEFT JOIN casaforma.casaforma_class_types ct ON sc.class_type_id = ct.id
        LEFT JOIN casaforma.casaforma_reservations r ON r.scheduled_class_id = sc.id AND r.status != 'cancelled'
        WHERE sc.scheduled_datetime >= CURRENT_DATE AND sc.status != 'cancelled'
        GROUP BY sc.id, ct.name, sc.override_capacity, ct.max_capacity
        ORDER BY sc.scheduled_datetime ASC
        LIMIT 7
    `;

    const [revenueRes, clientsRes, todayRes, occupancyRes, chartRows] = await Promise.all([
        db.one(sqlRevenue),
        db.one(sqlTotalClients),
        db.one(sqlReservationsToday),
        db.one(sqlOccupancy),
        db.manyOrNone(sqlOccupancyChart)
    ]);

    return {
        revenueThisMonth: parseFloat(revenueRes.revenue_this_month || 0),
        totalClients: parseInt(clientsRes.total_clients || 0),
        reservationsToday: parseInt(todayRes.reservations_today || 0),
        avgOccupancy: parseFloat(occupancyRes.avg_occupancy || 0),
        occupancyChart: (chartRows || []).map((row) => ({
            label: row.label,
            value: row.capacity ? Math.round((row.reservations / row.capacity) * 100) : 0
        }))
    };
};

module.exports = CasaformaAnalytics;
