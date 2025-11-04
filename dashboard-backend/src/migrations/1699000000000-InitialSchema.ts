import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1699000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create users table
    await queryRunner.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id VARCHAR(255) NOT NULL UNIQUE,
        username VARCHAR(100),
        email VARCHAR(200),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Create libraries table
    await queryRunner.query(`
      CREATE TABLE libraries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL DEFAULT 'My Library',
        folder_path VARCHAR(500),
        last_uploaded_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, name)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_libraries_user_id ON libraries(user_id)`,
    );

    // Create books table
    await queryRunner.query(`
      CREATE TABLE books (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        library_id UUID NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
        title VARCHAR(500) NOT NULL,
        author VARCHAR(200) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'to-read' CHECK (status IN ('read', 'currently-reading', 'to-read')),
        rating INT CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
        isbn VARCHAR(20),
        publication_year INT CHECK (publication_year IS NULL OR (publication_year >= 1000 AND publication_year <= 9999)),
        pages INT CHECK (pages IS NULL OR pages > 0),
        genres JSONB DEFAULT '[]',
        shelves JSONB DEFAULT '[]',
        date_added DATE,
        date_started DATE,
        date_finished DATE,
        review TEXT,
        review_date DATE,
        source_file VARCHAR(255),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Create indexes for efficient querying
    await queryRunner.query(
      `CREATE INDEX idx_books_library_id ON books(library_id)`,
    );
    await queryRunner.query(`CREATE INDEX idx_books_status ON books(status)`);
    await queryRunner.query(`CREATE INDEX idx_books_rating ON books(rating)`);
    await queryRunner.query(
      `CREATE INDEX idx_books_date_finished ON books(date_finished)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_books_genres ON books USING GIN(genres)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_books_shelves ON books USING GIN(shelves)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE books CASCADE`);
    await queryRunner.query(`DROP TABLE libraries CASCADE`);
    await queryRunner.query(`DROP TABLE users CASCADE`);
  }
}
