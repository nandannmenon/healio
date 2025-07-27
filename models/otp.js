'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Otp extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // OTP belongs to User (can be null during registration)
      Otp.belongsTo(models.User, { 
        foreignKey: 'user_id',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });
    }
  }
  Otp.init({
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true // Can be null during registration
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true // Can be null for password reset OTPs
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true // Can be null for password reset OTPs
    },
    otp: {
      type: DataTypes.STRING,
      allowNull: false
    },
    otp_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    otp_expiry: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Otp',
    tableName: 'otps',
    timestamps: true,
    underscored: true,
    freezeTableName: true
  });
  return Otp;
}; 