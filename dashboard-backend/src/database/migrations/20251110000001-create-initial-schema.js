'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Enable UUID extension
    await queryInterface.sequelize.query(
      'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'
    );

    // 1. Create libraries table
    await queryInterface.createTable('libraries', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(200),
        allowNull: false,
        unique: true,
      },
      folder_path: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      last_uploaded_at: {
        type: Sequelize.DATE,
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

    // 2. Create genres table
    await queryInterface.createTable('genres', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },
      slug: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
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

    // 3. Create shelves table
    await queryInterface.createTable('shelves', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },
      slug: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
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

    // 4. Create literary_awards table
    await queryInterface.createTable('literary_awards', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(200),
        allowNull: false,
        unique: true,
      },
      slug: {
        type: Sequelize.STRING(200),
        allowNull: false,
        unique: true,
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

    // 5. Create books table
    await queryInterface.createTable('books', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        primaryKey: true,
      },
      library_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'libraries',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      title: {
        type: Sequelize.STRING(500),
        allowNull: false,
      },
      author: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('read', 'currently-reading', 'to-read'),
        allowNull: false,
        defaultValue: 'to-read',
      },
      rating: {
        type: Sequelize.INTEGER,
        allowNull: true,
        validate: {
          min: 1,
          max: 5,
        },
      },
      isbn: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      publication_year: {
        type: Sequelize.INTEGER,
        allowNull: true,
        validate: {
          min: 1000,
          max: 9999,
        },
      },
      publication_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      pages: {
        type: Sequelize.INTEGER,
        allowNull: true,
        validate: {
          min: 1,
        },
      },
      publisher: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      setting: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      cover_image_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      goodreads_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      date_added: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      date_started: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      date_finished: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      review: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      review_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      source_file: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      original_json: {
        type: Sequelize.JSONB,
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

    // 6. Create book_genres junction table
    await queryInterface.createTable('book_genres', {
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
      genre_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'genres',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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

    // 7. Create book_shelves junction table
    await queryInterface.createTable('book_shelves', {
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
      shelf_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'shelves',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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

    // 8. Create book_literary_awards junction table
    await queryInterface.createTable('book_literary_awards', {
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
      literary_award_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'literary_awards',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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

    // Create indexes
    await queryInterface.addIndex('libraries', ['name']);
    await queryInterface.addIndex('books', ['library_id']);
    await queryInterface.addIndex('books', ['status']);
    await queryInterface.addIndex('books', ['rating']);
    await queryInterface.addIndex('books', ['date_finished']);
    await queryInterface.addIndex('books', ['library_id', 'source_file'], {
      unique: true,
      name: 'books_library_source_unique',
    });
    await queryInterface.addIndex('book_genres', ['book_id']);
    await queryInterface.addIndex('book_genres', ['genre_id']);
    await queryInterface.addIndex('book_shelves', ['book_id']);
    await queryInterface.addIndex('book_shelves', ['shelf_id']);
    await queryInterface.addIndex('book_literary_awards', ['book_id']);
    await queryInterface.addIndex('book_literary_awards', ['literary_award_id']);
  },

  async down(queryInterface, Sequelize) {
    // Drop tables in reverse order (respecting foreign key constraints)
    await queryInterface.dropTable('book_literary_awards');
    await queryInterface.dropTable('book_shelves');
    await queryInterface.dropTable('book_genres');
    await queryInterface.dropTable('books');
    await queryInterface.dropTable('literary_awards');
    await queryInterface.dropTable('shelves');
    await queryInterface.dropTable('genres');
    await queryInterface.dropTable('libraries');

    // Drop ENUM type
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_books_status";');
  },
};
