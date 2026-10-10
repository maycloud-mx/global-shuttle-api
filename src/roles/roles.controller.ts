import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RequirePermissions } from '../auth/permissions.decorator.js';
import { PermissionsGuard } from '../auth/permissions.guard.js';
import { ApiMessage } from '../http/api-message.decorator.js';
import { ChangeRoleStatusDto } from './dto/change-role-status.dto.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { ListRolesDto } from './dto/list-roles.dto.js';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
import { ROLE_PERMISSIONS } from './role-permissions.js';
import { RolesService } from './roles.service.js';

@Controller('admin/roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @RequirePermissions(ROLE_PERMISSIONS.CREATE)
  @ApiMessage('Role created successfully')
  create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  @Get()
  @RequirePermissions(ROLE_PERMISSIONS.LIST)
  @ApiMessage('Roles retrieved successfully')
  findAll(@Query() query: ListRolesDto) {
    return this.rolesService.findAll(query);
  }

  @Get('permission-catalog')
  @RequirePermissions(ROLE_PERMISSIONS.MANAGE_PERMISSIONS)
  @ApiMessage('Permission catalog retrieved successfully')
  getPermissionCatalog() {
    return this.rolesService.getPermissionCatalog();
  }

  @Get(':id')
  @RequirePermissions(ROLE_PERMISSIONS.VIEW)
  @ApiMessage('Role retrieved successfully')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(ROLE_PERMISSIONS.UPDATE)
  @ApiMessage('Role updated successfully')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(id, dto);
  }

  @Patch(':id/status')
  @RequirePermissions(ROLE_PERMISSIONS.CHANGE_STATUS)
  @ApiMessage('Role status updated successfully')
  changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeRoleStatusDto,
  ) {
    return this.rolesService.changeStatus(id, dto);
  }

  @Put(':id/permissions')
  @RequirePermissions(ROLE_PERMISSIONS.MANAGE_PERMISSIONS)
  @ApiMessage('Role permissions updated successfully')
  updatePermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRolePermissionsDto,
  ) {
    return this.rolesService.updatePermissions(id, dto);
  }
}
