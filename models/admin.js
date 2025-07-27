'use strict';
const {
  Model
} = require('sequelize');

const USER_STATUS = {
  ACTIVE: 1,
  INACTIVE: 0
};

module.exports = (sequelize, DataTypes) => {
  class Admin extends Model {
    static associate(models) {
      // Define associations if needed
    }
  }
  Admin.init({
    name: DataTypes.STRING,
    email: DataTypes.STRING,
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    phone: DataTypes.STRING,
    type: {
      type: DataTypes.ENUM('ADMIN', 'SUPER_ADMIN'),
      allowNull: false,
      defaultValue: 'ADMIN'
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: USER_STATUS.ACTIVE
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Admin',
    tableName: 'admins',
  });
  return Admin;
}; 