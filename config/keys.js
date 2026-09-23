module.exports = {
    secretOrKey: '+KbPeShVkYp3s6v9y$B&E)H@McQfTjWn',
    // Clave Secreta de tu cuenta de Admin de Stripe
    stripeAdminSecretKey: process.env.STRIPE_ADMIN_SECRET_KEY, 
    
    // **ESTA ES LA LÍNEA QUE FALTA O ES INCORRECTA:**
    // Lee la variable de Heroku y la exporta como 'stripeWebhookSecret'
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,

    // NUEVO — asistente "Flex" (ver controllers/flexAssistantController.js).
    // Clave real de console.anthropic.com, se lee de Heroku Config Vars,
    // igual que el resto de llaves de este archivo.
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    // Configurable por si Anthropic libera un modelo nuevo — no hay que
    // tocar código para cambiarlo, solo la variable en Heroku.
    anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929',

    // NUEVO — "Continuar con Google" real (ver controllers/googleAuthController.js).
    // El Client ID de OAuth es público (no es secreto, va también en el
    // frontend) — se necesita aquí solo para validar que el token que
    // Google firmó de verdad fue emitido para nuestra app (el "audience").
    googleClientId: process.env.GOOGLE_CLIENT_ID
}
