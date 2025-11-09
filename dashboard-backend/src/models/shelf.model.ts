import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  CreatedAt,
  UpdatedAt,
  BelongsToMany,
} from 'sequelize-typescript';
import { Book } from './book.model';
import { BookShelf } from './book-shelf.model';

@Table({ tableName: 'shelves', underscored: true })
export class Shelf extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    unique: true,
  })
  name: string;

  // Normalized lowercase version for searching/matching
  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    unique: true,
  })
  slug: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  // Many-to-many relationship with books
  @BelongsToMany(() => Book, () => BookShelf)
  books: Book[];
}
