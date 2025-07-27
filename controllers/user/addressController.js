const { Address, User, sequelize: db } = require('../../models');
const validate = require('../../helper/Validator');
const { paginate } = require('../../helper/pagination');

// POST /user/addresses - Create a new address for authenticated user
const add = async (req, res) => {
    const t = await db.transaction();
    try {
        // Validation
        const u = req.token
        const {area, division, city, district, state, pincode, country} = req.body;
        
        const rules = {
            area: 'required|string|min:2',
            division: 'required|string|min:2',
            city: 'required|string|min:2',
            district: 'required|string|min:2',
            state: 'required|string|min:2',
            pincode: 'required|string|min:6|max:6',
            country: 'string|min:2'
        };
        await validate({area, division, city, district, state, pincode, country}, rules);
        // Create address
        const createParams = {area, division, city, district, state, pincode, country}
        const address = await Address.create({...createParams, userId: u.userId}, { transaction: t });
        await t.commit();
        res.status(201).json({message: 'Address added successfully',address});
    } catch (error) {
        await t.rollback();
        console.error('Add address error:', error);
        res.status(500).json({ error: 'Failed to add address' });
    }
};

// GET /user/addresses - Get paginated list of addresses for authenticated user
const list = async (req, res) => {
    const t = await db.transaction();
    
    try {
        const u = req.token;
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const offset = (page - 1) * limit;

        const count = await Address.count({ where: { userId: u.userId }, transaction: t });
        const addresses = await Address.findAll({
            where: { userId: u.userId },
            limit,
            offset,
            order: [['createdAt', 'DESC']],
            transaction: t
        });

        const pagination = paginate(count, page, limit);

        await t.commit();

        res.status(200).json({message: 'Addresses retrieved successfully', addresses, pagination});
    } catch (error) {
        await t.rollback();
        console.error('List addresses error:', error);
        res.status(500).json({ error: 'Failed to list addresses' });
    }
};

// GET /user/addresses/:id - Get specific address details for authenticated user
const get = async (req, res) => {
    const t = await db.transaction();
    
    try {
        const u = req.token;
        const r = req.params;
        const address = await Address.findOne({
            where: { id: r.id, userId: u.userId },
            transaction: t
        });

        if (!address) {
            await t.rollback(); 
            return res.status(404).json({ error: 'Address not found' });
        }

        await t.commit();
        res.status(200).json({message: 'Addresses retreieved ',address });
    } catch (error) {
        await t.rollback();
        console.error('Get address error:', error);
        res.status(500).json({ error: 'Failed to get address' });
    }
};

// PUT /user/addresses/:id - Update existing address details for authenticated user
const update = async (req, res) => {
    const t = await db.transaction();
    
    try {
        // Validation
        const u = req.token;
        const r = req.params;
        const { area, division, city, district, state, pincode, country } = req.body;
        const rules = {
            area: 'string|min:2',
            division: 'string|min:2',
            city: 'string|min:2',
            district: 'string|min:2',
            state: 'string|min:2',
            pincode: 'string|min:6|max:6',
            country: 'string|min:2'
        };
        await validate({ area, division, city, district, state, pincode, country }, rules);

        // Find address
        const address = await Address.findOne({
            where: { id: r.id, userId: u.userId },
            transaction: t
        });

        if (!address) {
            await t.rollback();
            return res.status(404).json({ error: 'Address not found' });
        }

        // Update address
        await address.update({ area, division, city, district, state, pincode, country }, { transaction: t });

        await t.commit();
        res.status(200).json({message: 'Address updated successfully',address});
    } catch (error) {
        await t.rollback();
        console.error('Update address error:', error);
        res.status(500).json({ error: 'Failed to update address' });
    }
};

// DELETE /user/addresses/:id - Delete address for authenticated user
const remove = async (req, res) => {
    const t = await db.transaction();
    
    try {
        const u = req.token;
        const r = req.params;
        const address = await Address.findOne({
            where: { id: r.id, userId: u.userId },
            transaction: t
        });

        if (!address) {
            await t.rollback();
            return res.status(404).json({ error: 'Address not found' });
        }

        await address.destroy({ transaction: t });

        await t.commit();
        res.status(200).json({ message: 'Address removed successfully' });
    } catch (error) {
        await t.rollback();
        console.error('Remove address error:', error);
        res.status(500).json({ error: 'Failed to remove address' });
    }
};

module.exports = {
    add,
    list,
    get,
    update,
    remove
}; 