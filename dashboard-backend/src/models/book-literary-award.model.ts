import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  ForeignKey,
} from 'sequelize-typescript';
import { Book } from './book.model';
import { LiteraryAward } from './literary-award.model';

@Table({
  tableName: 'books_literary_awards',
  underscored: true,
  timestamps: false,
})
export class BookLiteraryAward extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @ForeignKey(() => Book)
  @Column({ type: DataType.UUID, allowNull: false })
  bookId: string;

  @ForeignKey(() => LiteraryAward)
  @Column({ type: DataType.UUID, allowNull: false })
  literaryAwardId: string;
}
