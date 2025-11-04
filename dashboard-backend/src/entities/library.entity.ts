import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Book } from './book.entity';

@Entity('libraries')
export class Library {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Foreign key relationship to user
  @ManyToOne(() => User, (user) => user.libraries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  // Library metadata
  @Column({ type: 'varchar', length: 100, default: 'My Library' })
  name: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    name: 'folder_path',
  })
  folderPath: string | null; // Original upload folder path (for display)

  @Column({ type: 'timestamp', nullable: true, name: 'last_uploaded_at' })
  lastUploadedAt: Date | null;

  // Relationship to books
  @OneToMany(() => Book, (book) => book.library)
  books: Book[];

  // Timestamps
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
