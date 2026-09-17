import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { env } from '@config/env';
import { User } from '@domain/entities/user.entity';
import { Role } from '@domain/entities/role.entity';
import { UserRoleAssignment } from '@domain/entities/user-role-assignment.entity';
import { Permission } from '@domain/entities/permission.entity';
import { RolePermission } from '@domain/entities/role-permission.entity';

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
  entities: [User, Role, UserRoleAssignment, Permission, RolePermission],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  migrationsTableName: 'migrations_history',
});
