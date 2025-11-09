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
import { Genre } from './genre.model';

@Table({ tableName: 'books_genres', underscored: true, timestamps: false })
export class BookGenre extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @ForeignKey(() => Book)
  @Column({ type: DataType.UUID, allowNull: false })
  bookId: string;

  @ForeignKey(() => Genre)
  @Column({ type: DataType.UUID, allowNull: false })
  genreId: string;
}
