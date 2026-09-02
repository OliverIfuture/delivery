// models/emoonAnalytics.js
const db = require('../config/config');

const EmoonAnalytics = {};

EmoonAnalytics.getSummary = async () => {
    // 1. Ingresos totales del mes actual (usando paid_at)
    const sqlRevenue = `
        SELECT COALESCE(SUM(amount), 0) AS revenue_this_month
        FROM emoon.emoon_payments
        WHERE date_trunc('month', paid_at) = date_trunc('month', CURRENT_DATE)
    `;

    // 2. Total de alumnos clientes registrados
    const sqlTotalClients = `
        SELECT COUNT(*) AS total_clients
        FROM emoon.emoon_users
        WHERE role = 'client'
    `;

    // 3. Reservaciones programadas para el día de HOY
    const sqlReservationsToday = `
        SELECT COUNT(*) AS reservations_today
        FROM emoon.emoon_reservations r
        INNER JOIN emoon.emoon_scheduled_classes sc ON r.scheduled_class_id = sc.id
        WHERE sc.scheduled_datetime::date = CURRENT_DATE 
          AND r.status != 'cancelled'
    `;

    // 4. Porcentaje promedio de ocupación del mes
    const sqlOccupancy = `
        SELECT 
            COALESCE(
                ROUND(
                    (COUNT(r.id)::numeric / NULLIF(SUM(COALESCE(sc.override_capacity, ct.max_capacity, 10)), 0)) * 100, 
                    1
                ), 
                0
            ) AS avg_occupancy
        FROM emoon.emoon_scheduled_classes sc
        LEFT JOIN emoon.emoon_class_types ct ON sc.class_type_id = ct.id
        LEFT JOIN emoon.emoon_reservations r ON r.scheduled_class_id = sc.id AND r.status != 'cancelled'
        WHERE date_trunc('month', sc.scheduled_datetime) = date_trunc('month', CURRENT_DATE)
    `;

    // 5. Gráfico de ocupación por tipo de clase
    const sqlOccupancyChart = `
        SELECT 
            COALESCE(ct.name, 'Clase Reformer') AS name,
            ct.id AS category_id,
            COUNT(r.id)::int AS total_reservations
        FROM emoon.emoon_reservations r
        INNER JOIN emoon.emoon_scheduled_classes sc ON r.scheduled_class_id = sc.id
        LEFT JOIN emoon.emoon_class_types ct ON sc.class_type_id = ct.id
        WHERE date_trunc('month', sc.scheduled_datetime) = date_trunc('month', CURRENT_DATE) 
          AND r.status != 'cancelled'
        GROUP BY ct.name, ct.id
    `;

    const [revenueRes, clientsRes, todayRes, occupancyRes, chartRes] = await Promise.all([
        db.one(sqlRevenue),
        db.one(sqlTotalClients),
        db.one(sqlReservationsToday),
        db.one(sqlOccupancy),
        db.manyOrNone(sqlOccupancyChart)
    ]);

    // Retorna las llaves en camelCase esperadas por Vue
    return {
        revenueThisMonth: parseFloat(revenueRes.revenue_this_month || 0),
        totalClients: parseInt(clientsRes.total_clients || 0),
        reservationsToday: parseInt(todayRes.reservations_today || 0),
        avgOccupancy: parseFloat(occupancyRes.avg_occupancy || 0),
        occupancyChart: chartRes || []
    };
};

module.exports = EmoonAnalytics;