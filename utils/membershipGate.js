// utils/membershipGate.js
//
// NUEVO — hace cumplir DE VERDAD los límites de membresía. Antes
// isOverClientLimit/activeAddons solo existían como información en
// membershipController.getMyMembershipStatus — nada los hacía cumplir
// (ver el propio comentario de ClientLimitBanner.vue: "esto NO bloquea
// la app"). Mismo criterio exacto que ya usa getMyMembershipStatus para
// isOverClientLimit (clientLimit != null && clientCount >= clientLimit),
// sin duplicarlo mal — solo se reutiliza aquí para poder bloquear de
// verdad en los puntos reales donde se agrega un cliente o se usa la IA.
const User = require('../models/user.js');
const MembershipPlan = require('../models/membershipPlan.js');
const MembershipAddon = require('../models/membershipAddon.js');

// Empresas exentas del límite de clientes y del bloqueo por membresía
// vencida (ver getMyMembershipStatus en membershipController.js, que usa
// este mismo set) — cuentas internas/de cortesía, no algo que dependa del
// plan que tengan asignado en la tabla compartida membership_plans (eso
// afectaría a TODAS las demás empresas con ese mismo plan).
const UNRESTRICTED_COMPANY_IDS = new Set([1]);

// Mismo trato, pero por CORREO en vez de id de company — para una cuenta
// de pruebas real que anda cambiando a mano a qué company apunta su
// mi_store (ver conversación: "estaré hardcodeando el id de las company").
// Como el id cambia, la exención tiene que ir atada a quién es la persona,
// no a qué company esté usando en ese momento.
const UNRESTRICTED_EMAILS = new Set(['oliverjdm22@gmail.com']);

function isUnrestricted(id_company, email) {
    if (UNRESTRICTED_COMPANY_IDS.has(Number(id_company))) return true;
    if (email && UNRESTRICTED_EMAILS.has(String(email).trim().toLowerCase())) return true;
    return false;
}

// { allowed, clientCount, clientLimit, planName } — allowed=false quiere
// decir que ya está en (o sobre) el límite de clientes de su plan actual.
// Sin plan asignado o plan sin límite definido -> allowed=true (no se
// bloquea a un entrenador que no tiene plan configurado; eso lo cubre ya
// el bloqueo por membresía vencida, un caso distinto).
async function checkClientLimit(id_company, email) {
    if (isUnrestricted(id_company, email)) {
        return { allowed: true, clientCount: null, clientLimit: null, planName: null };
    }
    const company = await User.getCompanyMembershipInfo(id_company);
    const plan = company?.membership_plan ? await MembershipPlan.findById(company.membership_plan) : null;
    const clientLimit = plan ? Number(plan.client_limit) : null;
    if (clientLimit == null) {
        return { allowed: true, clientCount: null, clientLimit: null, planName: plan?.name || null };
    }
    // Mismo criterio que getMyMembershipStatus: solo cuenta quien tiene
    // una membresía vigente AHORA mismo (activa o vencida/past_due) —
    // cancelada o sin ninguna suscripción (status_plan null) no cuenta,
    // esos son Prospectos (ver clientsWithMembership/prospects en
    // useRealClients.js del frontend), no clientes reales contra el límite.
    const clients = await User.getClientsByCompany(id_company);
    const clientCount = clients.filter((c) => c.status_plan === 'active' || c.status_plan === 'past_due').length;
    return { allowed: clientCount < clientLimit, clientCount, clientLimit, planName: plan.name };
}

const FLEX_ADDON_ID = 'flex_ilimitado';

// true si la empresa tiene activo el complemento de pago de Flex.
async function hasFlexAddon(id_company, email) {
    if (isUnrestricted(id_company, email)) return true;
    const row = await MembershipAddon.findCompanyAddon(id_company, FLEX_ADDON_ID);
    return !!row && row.status === 'active';
}

module.exports = { checkClientLimit, hasFlexAddon, FLEX_ADDON_ID, UNRESTRICTED_COMPANY_IDS, UNRESTRICTED_EMAILS, isUnrestricted };
