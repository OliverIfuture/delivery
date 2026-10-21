// controllers/clipController.js
// Pagos reales con Clip (Checkout Redireccionado) — hoy solo para Premium
// Supplements (id_order_company = 4). El cliente nunca entra su tarjeta en
// nuestro servidor: se le redirige a la página hospedada de Clip, y el
// backend confirma el resultado SIEMPRE con una llamada autenticada propia
// a Clip (GET /v2/checkout/:id) — el webhook de Clip no trae estado ni
// firma, así que nunca se usa como fuente de verdad por sí solo, solo como
// aviso de "ve a revisar".
const Order = require('../models/order');
const ClipPayment = require('../models/clipPayment');
const clip = require('../utils/clipClient');

module.exports = {

    // POST /api/clip/checkout/:orderId — crea el link de pago de Clip para
    // una orden ya existente (creada como PENDIENTE DE PAGO).
    async createCheckout(req, res) {
        try {
            const orderId = req.params.orderId;
            const { returnBaseUrl } = req.body;

            if (!returnBaseUrl) {
                return res.status(400).json({ success: false, message: 'Falta returnBaseUrl.' });
            }

            const order = await Order.findById(orderId);
            if (!order) {
                return res.status(404).json({ success: false, message: 'Orden no encontrada.' });
            }
            if (String(order.id_client) !== String(req.user.id)) {
                return res.status(403).json({ success: false, message: 'Esta orden no te pertenece.' });
            }
            if (order.status !== 'PENDIENTE DE PAGO') {
                return res.status(409).json({ success: false, message: `La orden ya está en estado ${order.status}.` });
            }

            const existing = await ClipPayment.findByOrderId(orderId);
            if (existing && existing.status === 'CHECKOUT_PENDING') {
                // Ya hay un link activo — se reutiliza en vez de crear otro.
                return res.status(200).json({ success: true, data: { payment_request_url: existing.payment_request_url } });
            }

            const checkout = await clip.createCheckout({
                amount: Number(order.total),
                purchaseDescription: `Pedido Premium Supplements #${order.id}`.slice(0, 250),
                redirectionUrl: {
                    success: `${returnBaseUrl}/checkout/success/${order.id}`,
                    error: `${returnBaseUrl}/checkout?clipError=1`,
                    default: `${returnBaseUrl}/checkout?clipError=1`
                },
                webhookUrl: 'https://deliveryserver.herokuapp.com/api/clip/webhook',
                externalReference: order.id
            });

            await ClipPayment.create({
                id_order: order.id,
                payment_request_id: checkout.payment_request_id,
                payment_request_url: checkout.payment_request_url,
                status: checkout.status,
                amount: order.total
            });

            return res.status(201).json({
                success: true,
                data: { payment_request_url: checkout.payment_request_url, payment_request_id: checkout.payment_request_id }
            });
        } catch (error) {
            console.log(`Error en clipController.createCheckout: ${error.response?.data ? JSON.stringify(error.response.data) : error.message}`);
            return res.status(500).json({
                success: false,
                message: 'No se pudo crear el link de pago con Clip.',
                error: error.response?.data || error.message
            });
        }
    },

    // POST /api/clip/webhook — Clip llama aquí cuando algo cambia. El body
    // SOLO trae {id, origin, event_type}, sin estado ni monto, así que la
    // única acción confiable es ir a preguntarle a Clip directamente.
    async webhook(req, res) {
        try {
            const { id } = req.body;
            if (!id) return res.status(200).json({ success: true });

            const payment = await ClipPayment.findByPaymentRequestId(id);
            if (!payment) return res.status(200).json({ success: true });

            const realStatus = await clip.getCheckoutStatus(id);
            await ClipPayment.updateStatus(id, realStatus.status, realStatus.receipt_no);

            if (realStatus.status === 'CHECKOUT_COMPLETED') {
                await Order.updateStatus(payment.id_order, 'PAGADO');
            }

            return res.status(200).json({ success: true });
        } catch (error) {
            console.log(`Error en clipController.webhook: ${error.message}`);
            // Siempre 200 — un 500 aquí solo provocaría reintentos de Clip
            // sobre un error que ya quedó registrado en el log.
            return res.status(200).json({ success: false });
        }
    },

    // GET /api/clip/status/:orderId — para que el frontend confirme el
    // resultado al regresar de Clip, sin esperar a que llegue el webhook.
    async getStatus(req, res) {
        try {
            const orderId = req.params.orderId;
            const order = await Order.findById(orderId);
            if (!order || String(order.id_client) !== String(req.user.id)) {
                return res.status(404).json({ success: false, message: 'Orden no encontrada.' });
            }

            const payment = await ClipPayment.findByOrderId(orderId);
            if (!payment) {
                return res.status(200).json({ success: true, data: { order_status: order.status, clip_status: null } });
            }

            // Si localmente todavía no está en un estado final, se refresca
            // en vivo contra Clip (puede que el webhook no haya llegado aún).
            const terminal = ['CHECKOUT_COMPLETED', 'CHECKOUT_CANCELLED', 'CHECKOUT_EXPIRED'];
            let clipStatus = payment.status;
            if (!terminal.includes(payment.status)) {
                const fresh = await clip.getCheckoutStatus(payment.payment_request_id);
                await ClipPayment.updateStatus(payment.payment_request_id, fresh.status, fresh.receipt_no);
                clipStatus = fresh.status;
                if (fresh.status === 'CHECKOUT_COMPLETED' && order.status !== 'PAGADO') {
                    await Order.updateStatus(orderId, 'PAGADO');
                }
            }

            const freshOrder = await Order.findById(orderId);
            return res.status(200).json({ success: true, data: { order_status: freshOrder.status, clip_status: clipStatus } });
        } catch (error) {
            console.log(`Error en clipController.getStatus: ${error.message}`);
            return res.status(500).json({ success: false, message: 'No se pudo consultar el estado del pago.' });
        }
    },

    // POST /api/clip/refund/:orderId — reembolso total (por ahora), para
    // que el cliente/admin pueda cancelar un pedido ya pagado con Clip.
    async refund(req, res) {
        try {
            const orderId = req.params.orderId;
            const { reason } = req.body;

            const order = await Order.findById(orderId);
            if (!order || String(order.id_client) !== String(req.user.id)) {
                return res.status(404).json({ success: false, message: 'Orden no encontrada.' });
            }

            const payment = await ClipPayment.findByOrderId(orderId);
            if (!payment || !payment.receipt_no) {
                return res.status(409).json({ success: false, message: 'Esta orden no tiene un pago con Clip confirmado para reembolsar.' });
            }
            if (payment.refund_status === 'REFUNDED') {
                return res.status(409).json({ success: false, message: 'Esta orden ya fue reembolsada.' });
            }

            await clip.createRefund({
                receiptNo: payment.receipt_no,
                amount: Number(payment.amount),
                reason: reason || 'Cancelación solicitada por el cliente'
            });

            await ClipPayment.updateRefund(payment.payment_request_id, 'REFUNDED', payment.amount, reason || 'Cancelación solicitada por el cliente');
            await Order.updateStatus(orderId, 'CANCELADO');

            return res.status(200).json({ success: true, message: 'Reembolso realizado correctamente.' });
        } catch (error) {
            console.log(`Error en clipController.refund: ${error.response?.data ? JSON.stringify(error.response.data) : error.message}`);
            return res.status(500).json({
                success: false,
                message: 'No se pudo procesar el reembolso.',
                error: error.response?.data || error.message
            });
        }
    }

};
