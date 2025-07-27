'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Orders', 'addressId', {
      type: Sequelize.INTEGER,
      allowNull: true, // Allow null initially for existing orders
      references: {
        model: 'addresses',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Orders', 'addressId');
  }
}; 