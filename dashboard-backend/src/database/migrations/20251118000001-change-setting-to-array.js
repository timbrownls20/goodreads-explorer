'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Change setting column from VARCHAR to TEXT ARRAY
    await queryInterface.sequelize.query(`
      ALTER TABLE books
      ALTER COLUMN setting
      TYPE TEXT[]
      USING CASE
        WHEN setting IS NULL THEN NULL
        WHEN setting = '' THEN NULL
        ELSE ARRAY[setting]::TEXT[]
      END;
    `);
  },

  async down(queryInterface, Sequelize) {
    // Revert array back to single string (taking first element)
    await queryInterface.sequelize.query(`
      ALTER TABLE books
      ALTER COLUMN setting
      TYPE VARCHAR(500)
      USING CASE
        WHEN setting IS NULL OR array_length(setting, 1) IS NULL THEN NULL
        ELSE setting[1]
      END;
    `);
  },
};
