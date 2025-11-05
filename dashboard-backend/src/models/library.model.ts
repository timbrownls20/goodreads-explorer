import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  ForeignKey,
  BelongsTo,
  HasMany,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';
import { User } from './user.model';
import { Book } from './book.model';

@Table({ tableName: 'libraries', underscored: true })
export class Library extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  // Foreign key relationship to user
  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false })
  userId: string;

  @BelongsTo(() => User, { onDelete: 'CASCADE' })
  user: User;

  // Library metadata
  @Default('My Library')
  @Column({ type: DataType.STRING(100), allowNull: false })
  name: string;

  @Column({ type: DataType.STRING(500), allowNull: true })
  folderPath: string | null;

  @Column({ type: DataType.DATE, allowNull: true })
  lastUploadedAt: Date | null;

  // Relationship to books
  @HasMany(() => Book)
  books: Book[];

  // Timestamps
  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}
