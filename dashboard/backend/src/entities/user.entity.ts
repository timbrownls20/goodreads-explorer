import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Library } from './library.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Session identifier (MVP: no authentication, just session tracking)
  @Column({ type: 'varchar', length: 255, unique: true, name: 'session_id' })
  sessionId: string;

  // User metadata (for future authentication feature)
  @Column({ type: 'varchar', length: 100, nullable: true })
  username: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  email: string | null;

  // Relationship to libraries
  @OneToMany(() => Library, (library) => library.user)
  libraries: Library[];

  // Timestamps
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
