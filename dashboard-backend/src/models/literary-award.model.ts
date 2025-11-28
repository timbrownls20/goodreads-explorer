import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  BelongsToMany,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';
import { Book } from './book.model';
import { BookLiteraryAward } from './book-literary-award.model';

@Table({
  tableName: 'literary_awards',
  underscored: true,
})
export class LiteraryAward extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @Column({
    type: DataType.STRING(200),
    allowNull: false,
    unique: true,
  })
  name: string;

  @Column({
    type: DataType.STRING(200),
    allowNull: false,
    unique: true,
  })
  slug: string;

  @BelongsToMany(() => Book, () => BookLiteraryAward)
  books: Book[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}
