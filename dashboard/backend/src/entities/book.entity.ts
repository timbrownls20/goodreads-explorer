import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Library } from './library.entity';

@Entity('books')
export class Book {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Foreign key relationship
  @ManyToOne(() => Library, (library) => library.books, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'library_id' })
  library: Library;

  @Column({ name: 'library_id', type: 'uuid' })
  libraryId: string;

  // Required fields
  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({ type: 'varchar', length: 200 })
  author: string;

  @Column({
    type: 'enum',
    enum: ['read', 'currently-reading', 'to-read'],
    default: 'to-read',
  })
  status: 'read' | 'currently-reading' | 'to-read';

  // Optional core metadata
  @Column({ type: 'int', nullable: true })
  rating: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  isbn: string | null;

  @Column({ type: 'int', nullable: true, name: 'publication_year' })
  publicationYear: number | null;

  @Column({ type: 'int', nullable: true })
  pages: number | null;

  // Categories & Organization (JSON columns for arrays)
  @Column({ type: 'jsonb', default: [] })
  genres: string[];

  @Column({ type: 'jsonb', default: [] })
  shelves: string[];

  // Dates
  @Column({ type: 'date', nullable: true, name: 'date_added' })
  dateAdded: Date | null;

  @Column({ type: 'date', nullable: true, name: 'date_started' })
  dateStarted: Date | null;

  @Column({ type: 'date', nullable: true, name: 'date_finished' })
  dateFinished: Date | null;

  // User content
  @Column({ type: 'text', nullable: true })
  review: string | null;

  @Column({ type: 'date', nullable: true, name: 'review_date' })
  reviewDate: Date | null;

  // Source tracking (for debugging)
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'source_file' })
  sourceFile: string | null;

  // Timestamps
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
