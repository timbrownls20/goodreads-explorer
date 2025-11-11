'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add original_json column to books table
    await queryInterface.addColumn('books', 'original_json', {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'Original JSON from source file (for auditing and re-processing)',
    });

    console.log('✅ Added original_json column to books table');
  },

  async down(queryInterface, Sequelize) {
    // Remove original_json column
    await queryInterface.removeColumn('books', 'original_json');
  },
};
