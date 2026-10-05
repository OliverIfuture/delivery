// Código de referido del entrenador: 'TP' + su id de empresa en base36.
// Es determinista (no se guarda en BD) y siempre se valida contra la tabla
// company antes de atribuir nada, así que no se puede inventar un código válido.
const PREFIX = 'TP';

function encodeReferralCode(companyId) {
    return `${PREFIX}${Number(companyId).toString(36).toUpperCase()}`;
}

function decodeReferralCode(code) {
    const clean = String(code || '').trim().toUpperCase();
    if (!clean.startsWith(PREFIX)) return null;
    const body = clean.slice(PREFIX.length);
    if (!/^[0-9A-Z]+$/.test(body)) return null;
    const id = parseInt(body, 36);
    return Number.isFinite(id) && id > 0 ? id : null;
}

module.exports = { encodeReferralCode, decodeReferralCode };
