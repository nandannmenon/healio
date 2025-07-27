'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { User, Address } = require('../models');
    const db = require('../models');

    try {
      console.log('Starting address restructuring...');

      // Step 1: Create addresses table
      console.log('Creating addresses table...');
      await db.sequelize.sync({ force: false, alter: true });
      console.log('Addresses table created successfully');

      // Step 2: Check if address column still exists in users table
      console.log('Checking if address column exists in users table...');
      try {
        const [results] = await db.sequelize.query(
          "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'address' AND TABLE_SCHEMA = DATABASE()"
        );
        
        if (results.length > 0) {
          console.log('Address column found, checking for existing address data...');
          
          // Check for existing address data
          const usersWithAddresses = await User.findAll({
            where: {
              address: {
                [db.Sequelize.Op.ne]: null
              }
            }
          });

          if (usersWithAddresses.length > 0) {
            console.log(`Found ${usersWithAddresses.length} users with addresses to migrate`);
            
            for (const user of usersWithAddresses) {
              if (user.address && user.address.trim()) {
                // Parse the address string and create a new address record
                // This is a basic migration - you might need to adjust based on your address format
                await Address.create({
                  userId: user.id,
                  area: user.address,
                  division: 'Unknown',
                  city: 'Unknown',
                  district: 'Unknown',
                  pincode: '000000',
                  state: 'Unknown',
                  country: 'India',
                  isDefault: true
                });
                console.log(`Migrated address for user ${user.id}`);
              }
            }
          } else {
            console.log('No existing address data found to migrate');
          }

          // Step 3: Remove address column from users table
          console.log('Removing address column from users table...');
          await db.sequelize.query('ALTER TABLE users DROP COLUMN IF EXISTS address');
          console.log('Address column removed from users table');
        } else {
          console.log('Address column already removed from users table');
        }
      } catch (error) {
        console.log('Address column already removed or does not exist');
      }

      console.log('Address restructuring completed successfully!');
    } catch (error) {
      console.error('Error during address restructuring:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    // This is a destructive migration, so the down method will be minimal
    // We can't easily restore the original address column with data
    console.log('This migration cannot be easily reversed as it restructures data');
  }
}; 