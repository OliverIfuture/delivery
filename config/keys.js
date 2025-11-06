module.exports = {
    secretOrKey: '+KbPeShVkYp3s6v9y$B&E)H@McQfTjWn',
    // Clave Secreta de tu cuenta de Admin de Stripe
    stripeAdminSecretKey: process.env.STRIPE_ADMIN_SECRET_KEY, 
    
    // **ESTA ES LA LÍNEA QUE FALTA O ES INCORRECTA:**
    // Lee la variable de Heroku y la exporta como 'stripeWebhookSecret'
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET
}
