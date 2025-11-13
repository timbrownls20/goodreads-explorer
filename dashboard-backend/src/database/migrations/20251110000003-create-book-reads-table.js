'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Create book_reads table
    await queryInterface.createTable('book_reads', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        primaryKey: true,
      },
      book_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'books',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      date_started: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      date_finished: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // 2. Add indexes for book_reads
    await queryInterface.addIndex('book_reads', ['book_id']);
    await queryInterface.addIndex('book_reads', ['date_finished']);

    // 3. Migrate existing date_started and date_finished data from books to book_reads
    // Only create book_read records where at least one date exists
    await queryInterface.sequelize.query(`
      INSERT INTO book_reads (id, book_id, date_started, date_finished, created_at, updated_at)
      SELECT
        uuid_generate_v4(),
        id,
        date_started,
        date_finished,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      FROM books
      WHERE date_started IS NOT NULL OR date_finished IS NOT NULL;
    `);

    // 4. Remove date_started and date_finished columns from books table
    await queryInterface.removeColumn('books', 'date_started');
    await queryInterface.removeColumn('books', 'date_finished');

    console.log('✅ Created book_reads table and migrated reading date data');
  },

  async down(queryInterface, Sequelize) {
    // 1. Re-add date_started and date_finished columns to books
    await queryInterface.addColumn('books', 'date_started', {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });

    await queryInterface.addColumn('books', 'date_finished', {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });

    // 2. Migrate the most recent read dates back to books table
    // Take the most recent date_finished (or date_started if no finish date)
    await queryInterface.sequelize.query(`
      UPDATE books b
      SET
        date_started = br.date_started,
        date_finished = br.date_finished
      FROM (
        SELECT DISTINCT ON (book_id)
          book_id,
          date_started,
          date_finished
        FROM book_reads
        ORDER BY book_id, date_finished DESC NULLS LAST, date_started DESC NULLS LAST
      ) br
      WHERE b.id = br.book_id;
    `);

    // 3. Drop book_reads table
    await queryInterface.dropTable('book_reads');

    console.log('✅ Rolled back: Removed book_reads table and restored date columns to books');
  },
};
