import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  ForeignKey,
  BelongsTo,
  BelongsToMany,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';
import { Library } from './library.model';
import { Genre } from './genre.model';
import { BookGenre } from './book-genre.model';
import { Shelf } from './shelf.model';
import { BookShelf } from './book-shelf.model';
import { LiteraryAward } from './literary-award.model';
import { BookLiteraryAward } from './book-literary-award.model';

@Table({
  tableName: 'books',
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['library_id', 'source_file'],
      name: 'books_library_source_unique',
    },
  ],
})
export class Book extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  // Foreign key relationship
  @ForeignKey(() => Library)
  @Column({ type: DataType.UUID, allowNull: false })
  libraryId: string;

  @BelongsTo(() => Library, { onDelete: 'CASCADE' })
  library: Library;

  // Required fields
  @Column({ type: DataType.STRING(500), allowNull: false })
  title: string;

  @Column({ type: DataType.STRING(200), allowNull: false })
  author: string;

  @Default('to-read')
  @Column({
    type: DataType.ENUM('read', 'currently-reading', 'to-read'),
    allowNull: false,
  })
  status: 'read' | 'currently-reading' | 'to-read';

  // Optional core metadata
  @Column({ type: DataType.INTEGER, allowNull: true })
  rating: number | null;

  @Column({ type: DataType.STRING(20), allowNull: true })
  isbn: string | null;

  @Column({ type: DataType.INTEGER, allowNull: true })
  publicationYear: number | null;

  @Column({ type: DataType.INTEGER, allowNull: true })
  pages: number | null;

  @Column({ type: DataType.STRING(200), allowNull: true })
  publisher: string | null;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  publicationDate: Date | null;

  @Column({ type: DataType.STRING(500), allowNull: true })
  setting: string | null;

  // Literary Awards: many-to-many relationship (normalized)
  @BelongsToMany(() => LiteraryAward, () => BookLiteraryAward)
  literaryAwards: LiteraryAward[];

  @Column({ type: DataType.STRING(500), allowNull: true })
  coverImageUrl: string | null;

  @Column({ type: DataType.STRING(500), allowNull: true })
  goodreadsUrl: string | null;

  // Categories & Organization
  // Genres: many-to-many relationship (normalized)
  @BelongsToMany(() => Genre, () => BookGenre)
  genres: Genre[];

  // Shelves: many-to-many relationship (normalized)
  @BelongsToMany(() => Shelf, () => BookShelf)
  shelves: Shelf[];

  // Dates
  @Column({ type: DataType.DATEONLY, allowNull: true })
  dateAdded: Date | null;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  dateStarted: Date | null;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  dateFinished: Date | null;

  // User content
  @Column({ type: DataType.TEXT, allowNull: true })
  review: string | null;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  reviewDate: Date | null;

  // Source tracking (for debugging and auditing)
  @Column({ type: DataType.STRING(255), allowNull: true })
  sourceFile: string | null;

  // Original JSON from source file (for re-processing and debugging)
  @Column({ type: DataType.JSONB, allowNull: true })
  originalJson: any | null;

  // Timestamps
  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}
