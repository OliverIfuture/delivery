// models/selfClient.js
//
// NUEVO — "el entrenador como su propio cliente". Pedido explícito: el
// entrenador quiere poder programarse rutinas/planes de nutrición a sí
// mismo, y TODA esa maquinaria (routines, nutrition_plans, client_diets_v2,
// body_metrics, etc.) ya cuelga de un id_client real hacia `users` — no
// hay atajo sin una fila real ahí. Esta fila:
//   - Vive en `users` con id_entrenador = su propia empresa (igual que
//     cualquier cliente real, así que ClientDetailView.vue/rutinas/
//     nutrición funcionan sin ningún cambio).
//   - Se marca con is_self_client = true (columna nueva, aditiva) para
//     distinguirla: se fija primero en la lista, no se puede eliminar,
//     y se resta del conteo contra el límite de clientes del plan (ver
//     getMyMembershipStatus en membershipController.js).
//   - Aparece también en TODO lo demás que ya use
//     User.getClientsByCompany (pre-existente, sin tocar) — ej. el
//     asistente Flex — decisión explícita del entrenador: tiene sentido
//     poder usarse a sí mismo ahí también.
const db = require('../config/config.js');
const crypto = require('crypto');

const SelfClient = {};

SelfClient.ensure = async (id_company) => {
    const existing = await db.oneOrNone(
        'SELECT id, email, name, lastname, phone, image, is_self_client FROM users WHERE id_entrenador = $1 AND is_self_client = true',
        [id_company]
    );
    if (existing) return existing;

    const company = await db.oneOrNone('SELECT name, logo FROM company WHERE id = $1', [id_company]);
    const email = `self-client-${id_company}@internal.trainerapp`;
    // Nunca debe poder iniciar sesión — password random, nadie lo conoce.
    const randomPassword = crypto.createHash('md5').update(crypto.randomUUID()).digest('hex');

    return db.one(
        `INSERT INTO users (email, name, lastname, image, id_entrenador, is_self_client, password, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, true, $6, now(), now())
         RETURNING id, email, name, lastname, phone, image, is_self_client`,
        [email, company?.name || 'Mi cuenta', 'Tú', company?.logo || null, id_company, randomPassword]
    );
};

module.exports = SelfClient;
