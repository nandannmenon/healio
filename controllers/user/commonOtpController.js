const { Otp, User, sequelize: db } = require('../../models');
const { Op } = require('sequelize');
const validate = require('../../helper/Validator');
const { parsePaginationParams, createPaginatedResponse } = require('../../helper/pagination');
const { generateOTP, sendOTP, createAndStoreOTP } = require('../../helper/otp');
const moment = require('moment');

// POST /otp/send - Send OTP to user's email for password reset
const send = async (req, res) => {
    const t = await db.transaction();

    try {
        const { phone, email } = req.body;

        // Validation
        const rules = {
            phone: 'required|regex:/^\\d{10}$/',
            email: 'required|email'
        };
        await validate({ phone, email }, rules);

        // Find user by either phone or email
        const user = await User.findOne({
            where: {
                [Op.or]: [
                    { phone: phone },
                    { email: email }
                ]
            },
            transaction: t
        });

        if (!user) {
            await t.rollback();
            return res.status(404).json({ success: false, error: 'User not found with this phone number or email' });
        }

        // Verify that the provided phone and email match the user's records
        if (user.phone !== phone || user.email !== email) {
            await t.rollback();
            return res.status(400).json({ success: false, error: 'Phone number and email do not match our records' });
        }

        // Generate and store OTP using centralized helper
        const otp = await createAndStoreOTP({
            phone,
            user_id: user.id,
            email: user.email,
            transaction: t
        });
        // Send OTP via email
        await sendOTP(otp, user.email, 'forgot_password', null, null);

        await t.commit();
        res.status(200).json({
            success: true,
            message: `OTP sent successfully to your email. OTP: ${otp}`,
            phone,
            email: user.email,
            otp
        });
    } catch (error) {
        await t.rollback();
        console.error('Send OTP error:', error);
        res.status(500).json({ error: 'Failed to send OTP' });
    }
};

// POST /otp/verify - Verify OTP for password reset
const verify = async (req, res) => {
    const t = await db.transaction();

    try {
        const { phone, otp } = req.body;

        // Validation
        const rules = {
            phone: 'required|regex:/^\\d{10}$/',
            otp: 'required|string|min:6|max:6'
        };
        await validate({ phone, otp }, rules);

        // Find and verify OTP (do NOT require user to exist)
        const otpRecord = await Otp.findOne({
            where: {
                phone: phone,
                otp,
                otp_verified: false,
                otp_expiry: { [Op.gt]: new Date() }
            },
            order: [['created_at', 'DESC']],
            transaction: t
        });

        if (!otpRecord) {
            await t.rollback();
            return res.status(400).json({ success: false, error: 'Invalid or expired OTP' });
        }

        // Mark OTP as verified
        otpRecord.otp_verified = true;
        await otpRecord.save({ transaction: t });

        await t.commit();
        res.status(200).json({
            success: true,
            message: 'OTP verified successfully'
        });
    } catch (error) {
        await t.rollback();
        console.error('Verify OTP error:', error);
        res.status(500).json({ error: 'Failed to verify OTP' });
    }
};

// POST /otp/reset-password - Reset user password using verified OTP
const resetPassword = async (req, res) => {
    const t = await db.transaction();

    try {
        const { phone, newPassword } = req.body;

        // Validation
        const rules = {
            phone: 'required|regex:/^\\d{10}$/',
            newPassword: 'required|string|min:6'
        };
        await validate({ phone, newPassword }, rules);

        // Find user
        const user = await User.findOne({ where: { phone }, transaction: t });
        if (!user) {
            await t.rollback();
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Find the most recent verified OTP for this user
        const otpRecord = await Otp.findOne({
            where: {
                user_id: user.id,
                phone: phone,
                otp_verified: true,
                otp_expiry: { [Op.gt]: new Date() }
            },
            order: [['created_at', 'DESC']],
            transaction: t
        });

        if (!otpRecord) {
            await t.rollback();
            return res.status(400).json({ success: false, error: 'No verified OTP found. Please verify your OTP first.' });
        }

        // Hash new password and update user
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        user.password = hashedPassword;
        await user.save({ transaction: t });

        await t.commit();
        res.status(200).json({
            success: true,
            message: 'Password reset successfully'
        });
    } catch (error) {
        await t.rollback();
        console.error('Reset password error:', error);
        res.status(500).json({ success: false, error: 'Failed to reset password' });
    }
};

// GET /otp/status/:userId - Check OTP verification status for a user
const getStatus = async (req, res) => {
    const t = await db.transaction();

    try {
        const { userId } = req.params;

        // Find user
        const user = await User.findOne({ where: { id: userId }, transaction: t });
        if (!user) {
            await t.rollback();
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Get latest OTP for this user
        const latestOtp = await Otp.findOne({
            where: { user_id: userId },
            order: [['created_at', 'DESC']],
            transaction: t
        });

        await t.commit();
        res.status(200).json({
            success: true,
            status: {
                userId: user.id,
                phone: user.phone,
                phoneVerified: user.phoneVerified,
                hasLatestOtp: !!latestOtp,
                otpVerified: latestOtp ? latestOtp.otp_verified : false,
                otpExpired: latestOtp ? new Date() > latestOtp.otp_expiry : true
            }
        });
    } catch (error) {
        await t.rollback();
        console.error('Get OTP status error:', error);
        res.status(500).json({ success: false, error: 'Failed to get OTP status' });
    }
};

// GET /otp/history/:userId - Retrieve OTP history for a user
const getHistory = async (req, res) => {
    const t = await db.transaction();

    try {
        const { userId } = req.params;
        const paginationParams = parsePaginationParams(req, { defaultLimit: 10, maxLimit: 50 });

        // Find user
        const user = await User.findOne({ where: { id: userId }, transaction: t });
        if (!user) {
            await t.rollback();
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const count = await Otp.count({ where: { user_id: userId }, transaction: t });
        const otps = await Otp.findAll({
            where: { user_id: userId },
            order: [['created_at', 'DESC']],
            limit: paginationParams.limit,
            offset: paginationParams.offset,
            transaction: t
        });

        const response = createPaginatedResponse(
            otps,
            count,
            paginationParams,
            { message: 'OTP history retrieved successfully' }
        );

        await t.commit();
        res.status(200).json(response);
    } catch (error) {
        await t.rollback();
        console.error('Get OTP history error:', error);
        res.status(500).json({ success: false, error: 'Failed to get OTP history' });
    }
};

// DELETE /otp/clear/:userId - Clear all OTPs for a user
const clear = async (req, res) => {
    const t = await db.transaction();

    try {
        const { userId } = req.params;

        // Find user
        const user = await User.findOne({ where: { id: userId }, transaction: t });
        if (!user) {
            await t.rollback();
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Delete all OTPs for this user
        const deletedCount = await Otp.destroy({
            where: { user_id: userId },
            transaction: t
        });

        await t.commit();
        res.status(200).json({
            success: true,
            message: `Cleared ${deletedCount} OTP records for user`,
            deletedCount
        });
    } catch (error) {
        await t.rollback();
        console.error('Clear OTPs error:', error);
        res.status(500).json({ success: false, error: 'Failed to clear OTPs' });
    }
};

module.exports = {
    send,
    verify,
    resetPassword,
    getStatus,
    getHistory,
    clear
}; 