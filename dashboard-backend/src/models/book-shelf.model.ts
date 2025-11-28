import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  PrimaryKey,
  Default,
} from 'sequelize-typescript';
import { Book } from './book.model';
import { Shelf } from './shelf.model';

@Table({ tableName: 'books_shelves', underscored: true, timestamps: false })
export class BookShelf extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @ForeignKey(() => Book)
  @Column({ type: DataType.UUID, allowNull: false })
  bookId: string;

  @ForeignKey(() => Shelf)
  @Column({ type: DataType.UUID, allowNull: false })
  shelfId: string;
}
