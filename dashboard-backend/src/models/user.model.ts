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
import { Library } from './library.model';

@Table({ tableName: 'users', underscored: true })
export class User extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  // Session identifier (MVP: no authentication, just session tracking)
  @Column({ type: DataType.STRING(255), unique: true, allowNull: false })
  sessionId: string;

  // User metadata (for future authentication feature)
  @Column({ type: DataType.STRING(100), allowNull: true })
  username: string | null;

  @Column({ type: DataType.STRING(200), allowNull: true })
  email: string | null;

  // Relationship to libraries
  @HasMany(() => Library)
  libraries: Library[];

  // Timestamps (automatically managed by Sequelize)
  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}
