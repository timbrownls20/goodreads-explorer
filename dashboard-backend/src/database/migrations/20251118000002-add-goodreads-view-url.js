'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add goodreads_view_url column to books table
    await queryInterface.addColumn('books', 'goodreads_view_url', {
      type: Sequelize.STRING(500),
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove goodreads_view_url column
    await queryInterface.removeColumn('books', 'goodreads_view_url');
  },
};
