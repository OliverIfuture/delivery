// Correos siempre en minúsculas y sin espacios, para que el mismo correo no
// cree dos cuentas ni falle un login por mayúsculas.
function normalizeEmail(email) {
    return typeof email === 'string' ? email.trim().toLowerCase() : email;
}

module.exports = normalizeEmail;
