'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Cart extends Model {
    static associate(models) {
      // associations can be defined here
      Cart.belongsTo(models.User, { foreignKey: 'user_id' });
      Cart.belongsTo(models.Product, { foreignKey: 'product_id', as: 'Product' });
      Cart.belongsTo(models.Address, { foreignKey: 'addressId', as: 'address' });
    }
  }
  Cart.init({
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Products',
        key: 'id'
      }
    },
    quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false
    },
    addressId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'addresses',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'Cart',
    tableName: 'Carts',
    freezeTableName: true,
    underscored: true
  });
  return Cart;
}; 