const APPLE_STORE_URL = 'https://apps.apple.com/mx/app/trainer-partners/id6786476840?l=en-GB';
const ANDROID_STORE_URL = 'https://play.google.com/store/apps/details?id=com.premiumdev.trainerapp';

// Único QR -> un solo link, detecta la plataforma por User-Agent para
// mandar a cada quien a su store real (Apple no permite un solo link
// universal que sirva para ambas tiendas).
exports.redirectToStore = (req, res) => {
    const ua = (req.headers['user-agent'] || '').toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    res.redirect(302, isIOS ? APPLE_STORE_URL : ANDROID_STORE_URL);
};
