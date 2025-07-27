'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Make sure userId column exists and is the correct type
    await queryInterface.addColumn('addresses', 'userId', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });

    // 2. Add the foreign key constraint
    await queryInterface.addConstraint('addresses', {
      fields: ['userId'],
      type: 'foreign key',
      name: 'addresses_userId_fkey',
      references: {
        table: 'users',
        field: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeConstraint('addresses', 'addresses_userId_fkey');
    await queryInterface.removeColumn('addresses', 'userId');
  }
}; 