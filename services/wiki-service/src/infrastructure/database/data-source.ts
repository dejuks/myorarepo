import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { env } from '@config/env';
import { Role } from '@domain/entities/role.entity';
import { UserRoleAssignment } from '@domain/entities/user-role-assignment.entity';
import { Article } from '@domain/entities/article.entity';
import { Revision } from '@domain/entities/revision.entity';
import { Category } from '@domain/entities/category.entity';
import { Tag } from '@domain/entities/tag.entity';
import { ArticleReview } from '@domain/entities/article-review.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: env.DB_HOST,
  port: env.DB_PORT,
  username: env.DB_USERNAME,
  password: env.DB_PASSWORD,
  database: env.DB_DATABASE,
  ssl: env.DB_SSL ? { rejectUnauthorized: false } : false,
  synchronize: false,
  logging: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  entities: [Role, UserRoleAssignment, Article, Revision, Category, Tag, ArticleReview],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  migrationsTableName: 'migrations_history',
});
