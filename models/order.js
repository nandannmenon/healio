'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Order extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Order.hasMany(models.OrderItem, { foreignKey: 'orderId' });
      Order.belongsTo(models.User, { foreignKey: 'userId' });
      Order.belongsTo(models.Address, { foreignKey: 'addressId', as: 'address' });
      Order.hasOne(models.Payment, { foreignKey: 'order_id', as: 'Payment' });
    }
  }
  Order.init({
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    addressId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'addresses',
        key: 'id'
      }
    },
    status: DataTypes.STRING,
    totalAmount: DataTypes.FLOAT
  }, {
    sequelize,
    modelName: 'Order',
    tableName: 'orders',
    freezeTableName: true
  });
  return Order;
};