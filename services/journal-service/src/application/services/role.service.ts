import { IRoleRepository } from '@domain/repositories/role.repository.interface';
import { Role } from '@domain/entities/role.entity';
import { CreateRoleDto } from '@application/dto/create-role.dto';
import { ConflictError, NotFoundError, ValidationError } from '@common/errors/app-error';

/** Manages this module's role catalog. Role ASSIGNMENT to members lives in MemberRoleService; this is the catalog itself (admin-managed). */
export class RoleService {
  constructor(private readonly roleRepo: IRoleRepository) {}

  async listRoles(): Promise<Role[]> {
    return this.roleRepo.listAll();
  }

  async createRole(dto: CreateRoleDto): Promise<Role> {
    const existing = await this.roleRepo.findByName(dto.name);
    if (existing) throw new ConflictError(`Role "${dto.name}" already exists`);

    return this.roleRepo.create({ name: dto.name, description: dto.description ?? null, isSystem: false });
  }

  async deleteRole(id: string): Promise<void> {
    const role = await this.roleRepo.findById(id);
    if (!role) throw new NotFoundError('Role not found');
    if (role.isSystem) throw new ValidationError('System roles cannot be deleted');

    await this.roleRepo.delete(id);
  }
}
