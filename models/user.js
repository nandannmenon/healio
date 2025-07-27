'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.hasMany(models.Order, { foreignKey: 'userId' });
      User.hasMany(models.Otp, { foreignKey: 'userId' });
      User.hasMany(models.Address, { foreignKey: 'userId', as: 'addresses' });
      User.belongsTo(models.Admin, { foreignKey: 'createdBy', as: 'creator' });
    }
  }
  
  User.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: DataTypes.STRING,
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false // Remove unique constraint to avoid index issues
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: false, // Remove unique constraint to avoid index issues
      validate: {
        is: {
          args: /^\d{10}$/,
          msg: 'Phone number must be exactly 10 digits.'
        },
        notEmpty: {
          msg: 'Phone number is required'
        }
      }
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    age:DataTypes.INTEGER,
    dob: DataTypes.DATE,
    temp_token: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    token: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false, // Remove unique constraint to avoid index issues
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Admins',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
  });
  return User;
};

