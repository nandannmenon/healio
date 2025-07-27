'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('addresses', 'isDefault');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('addresses', 'isDefault', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
  }
}; 