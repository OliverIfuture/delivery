// models/emoonAnalytics.js
const db = require('../config/config');

const EmoonAnalytics = {};

EmoonAnalytics.getSummary = async () => {
    // 1. Ingresos del mes actual
    const revenueSql = `
        SELECT COALESCE(SUM(amount), 0) as total_revenue
        FROM emoon.emoon_sales
        WHERE date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE);
    `;

    // 2. Clientes totales registrados
    const clientsSql = `
        SELECT COUNT(*)::int as total_clients
        FROM emoon.emoon_users
        WHERE role = 'client';
    `;

    // 3. Reservas activas programadas para hoy
    const reservationsTodaySql = `
        SELECT COUNT(*)::int as reservations_today
        FROM emoon.emoon_reservations
        WHERE DATE(reserved_at) = CURRENT_DATE AND status != 'cancelled';
    `;

    // 4. Porcentaje general de ocupación del mes
    const occupancyRateSql = `
        SELECT 
            COALESCE(
                ROUND(
                    (COUNT(r.id)::numeric / NULLIF(SUM(COALESCE(sc.override_capacity, ct.max_capacity, 10)), 0)) * 100, 1
                ), 0
            ) as avg_occupancy
        FROM emoon.emoon_scheduled_classes sc
        INNER JOIN emoon.emoon_class_types ct ON sc.class_type_id = ct.id
        LEFT JOIN emoon.emoon_reservations r ON r.scheduled_class_id = sc.id AND r.status != 'cancelled'
        WHERE date_trunc('month', sc.scheduled_datetime) = date_trunc('month', CURRENT_DATE)
          AND sc.status = 'scheduled';
    `;

    // 5. Desglose de reservas por tipo de clase para la gráfica de dona
    const occupancyChartSql = `
        SELECT 
            ct.name,
            ct.category_id,
            COUNT(r.id)::int as total_reservations
        FROM emoon.emoon_scheduled_classes sc
        INNER JOIN emoon.emoon_class_types ct ON sc.class_type_id = ct.id
        LEFT JOIN emoon.emoon_reservations r ON r.scheduled_class_id = sc.id AND r.status != 'cancelled'
        WHERE date_trunc('month', sc.scheduled_datetime) = date_trunc('month', CURRENT_DATE)
          AND sc.status = 'scheduled'
        GROUP BY ct.name, ct.category_id;
    `;

    const [revenueRes, clientsRes, reservationsRes, occupancyRateRes, occupancyChartRes] = await Promise.all([
        db.oneOrNone(revenueSql),
        db.oneOrNone(clientsSql),
        db.oneOrNone(reservationsTodaySql),
        db.oneOrNone(occupancyRateSql),
        db.manyOrNone(occupancyChartSql)
    ]);

    return {
        revenueThisMonth: parseFloat(revenueRes?.total_revenue || 0),
        totalClients: parseInt(clientsRes?.total_clients || 0),
        reservationsToday: parseInt(reservationsRes?.reservations_today || 0),
        avgOccupancy: parseFloat(occupancyRateRes?.avg_occupancy || 0),
        occupancyChart: occupancyChartRes || []
    };
};

module.exports = EmoonAnalytics;