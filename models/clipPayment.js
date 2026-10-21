// models/clipPayment.js
const db = require('../config/config');

const ClipPayment = {};

ClipPayment.create = (payment) => {
    const sql = `
        INSERT INTO clip_payments(
            id_order, payment_request_id, payment_request_url, status, amount, created_at, updated_at
        )
        VALUES($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING *
    `;
    return db.one(sql, [
        payment.id_order,
        payment.payment_request_id,
        payment.payment_request_url,
        payment.status,
        payment.amount
    ]);
};

ClipPayment.findByPaymentRequestId = (paymentRequestId) => {
    const sql = `SELECT * FROM clip_payments WHERE payment_request_id = $1`;
    return db.oneOrNone(sql, [paymentRequestId]);
};

ClipPayment.findByOrderId = (idOrder) => {
    const sql = `SELECT * FROM clip_payments WHERE id_order = $1 ORDER BY id DESC LIMIT 1`;
    return db.oneOrNone(sql, [idOrder]);
};

ClipPayment.updateStatus = (paymentRequestId, status, receiptNo) => {
    const sql = `
        UPDATE clip_payments
        SET status = $2, receipt_no = COALESCE($3, receipt_no), updated_at = NOW()
        WHERE payment_request_id = $1
        RETURNING *
    `;
    return db.oneOrNone(sql, [paymentRequestId, status, receiptNo || null]);
};

ClipPayment.updateRefund = (paymentRequestId, refundStatus, refundAmount, refundReason) => {
    const sql = `
        UPDATE clip_payments
        SET refund_status = $2, refund_amount = $3, refund_reason = $4, updated_at = NOW()
        WHERE payment_request_id = $1
        RETURNING *
    `;
    return db.oneOrNone(sql, [paymentRequestId, refundStatus, refundAmount, refundReason]);
};

module.exports = ClipPayment;
