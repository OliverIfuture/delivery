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

// { allowed, clientCount, clientLimit, planName } — allowed=false quiere
// decir que ya está en (o sobre) el límite de clientes de su plan actual.
// Sin plan asignado o plan sin límite definido -> allowed=true (no se
// bloquea a un entrenador que no tiene plan configurado; eso lo cubre ya
// el bloqueo por membresía vencida, un caso distinto).
async function checkClientLimit(id_company) {
    const company = await User.getCompanyMembershipInfo(id_company);
    const plan = company?.membership_plan ? await MembershipPlan.findById(company.membership_plan) : null;
    const clientLimit = plan ? Number(plan.client_limit) : null;
    if (clientLimit == null) {
        return { allowed: true, clientCount: null, clientLimit: null, planName: plan?.name || null };
    }
    const clients = await User.getClientsByCompany(id_company);
    const clientCount = clients.length;
    return { allowed: clientCount < clientLimit, clientCount, clientLimit, planName: plan.name };
}

const FLEX_ADDON_ID = 'flex_ilimitado';

// true si la empresa tiene activo el complemento de pago de Flex.
async function hasFlexAddon(id_company) {
    const row = await MembershipAddon.findCompanyAddon(id_company, FLEX_ADDON_ID);
    return !!row && row.status === 'active';
}

module.exports = { checkClientLimit, hasFlexAddon, FLEX_ADDON_ID };
