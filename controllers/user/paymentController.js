const { Payment, Order, sequelize: db } = require('../../models');
const { paginate } = require('../../helper/pagination');
const validate = require('../../helper/Validator');

// POST /user/payments - Process payment for user's order
const process = async (req, res) => {
    const t = await db.transaction();
    
    try {
        const u = req.token;
        const { orderId, amount, method, transactionId } = req.body;
        const userId = u.userId;
        
        // Validation
        const rules = {
            orderId: 'required|integer|min:1',
            amount: 'required|numeric|min:0',
            method: 'required|string|in:card,cash,upi',
            transactionId: 'required|string|min:1'
        };
        await validate({ orderId, amount, method, transactionId }, rules);

        // Find order
        const order = await Order.findOne({
            where: { id: orderId, userId },
            transaction: t
        });

        if (!order) {
            await t.rollback();
            return res.status(404).json({ error: 'Order not found' });
        }

        if (order.status === 'paid') {
            await t.rollback();
            return res.status(400).json({ error: 'Order already paid' });
        }

        // Create payment
        const payment = await Payment.create({
            orderId,
            userId,
            amount,
            method,
            transactionId,
            status: 'completed'
        }, { transaction: t });

        // Update order status
        await order.update({ status: 'paid' }, { transaction: t });

        await t.commit();

        res.status(201).json({
            message: 'Payment processed successfully',
            payment: {
                id: payment.id,
                amount: payment.amount,
                method: payment.method,
                status: payment.status
            }
        });
    } catch (error) {
        await t.rollback();
        console.error('Process payment error:', error);
        res.status(500).json({ error: 'Failed to process payment' });
    }
};

// GET /user/payments - Get paginated list of payments for authenticated user
const list = async (req, res) => {
    const t = await db.transaction();
    
    try {
        const u = req.token;
        console.log('Payments list API called for user:', u.userId);
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const payments = await Payment.findAll({
            include: [{
                model: Order,
                where: { userId: u.userId },
                attributes: ['id', 'totalAmount', 'status']
            }],
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['createdAt', 'DESC']],
            transaction: t
        });
        
        const count = await Payment.count({
            include: [{
                model: Order,
                where: { userId: u.userId }
            }],
            transaction: t
        });

        const pagination = paginate(count, page, limit);

        await t.commit();
        res.status(200).json({
            payments,
            pagination
        });
    } catch (error) {
        await t.rollback();
        console.error('List payments error:', error);
        if (error && error.stack) console.error(error.stack);
        res.status(500).json({ error: 'Failed to list payments', details: error.message });
    }
};

// GET /user/payments/:id - Get specific payment details for authenticated user
const get = async (req, res) => {
    const t = await db.transaction();
    
    try {
        const u = req.token;
        const payment = await Payment.findOne({
            where: { id: req.params.id, userId: u.userId },
            include: [{ model: Order }],
            transaction: t
        });

        if (!payment) {
            await t.rollback();
            return res.status(404).json({ error: 'Payment not found' });
        }

        await t.commit();
        res.status(200).json({ payment });
    } catch (error) {
        await t.rollback();
        console.error('Get payment error:', error);
        res.status(500).json({ error: 'Failed to get payment' });
    }
};

module.exports = {
    process,
    list,
    get
}; 