import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  ForeignKey,
  BelongsTo,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';
import { Book } from './book.model';

@Table({
  tableName: 'book_reads',
  underscored: true,
})
export class BookRead extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  // Foreign key relationship to book
  @ForeignKey(() => Book)
  @Column({ type: DataType.UUID, allowNull: false })
  bookId: string;

  @BelongsTo(() => Book, { onDelete: 'CASCADE' })
  book: Book;

  // Reading dates - both can be null
  @Column({ type: DataType.DATEONLY, allowNull: true })
  dateStarted: Date | null;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  dateFinished: Date | null;

  // Timestamps
  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}
