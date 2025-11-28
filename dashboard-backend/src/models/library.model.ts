import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  HasMany,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';
import { Book } from './book.model';

@Table({ tableName: 'libraries', underscored: true })
export class Library extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  // Library metadata - name is unique identifier (folder name)
  @Column({ type: DataType.STRING(200), allowNull: false, unique: true })
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
