import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RequirePermissions } from '../auth/permissions.decorator.js';
import { PermissionsGuard } from '../auth/permissions.guard.js';

import { ApiMessage } from '../http/api-message.decorator.js';

import { RateLimit } from '../security/rate-limit/rate-limit.decorator.js';
import { RATE_LIMIT_POLICIES } from '../security/rate-limit/rate-limit.config.js';

import { ChangeUserStatusDto } from './dto/change-user-status.dto.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { ListUsersDto } from './dto/list-users.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

import { USER_PERMISSIONS } from './user-permissions.js';
import { UsersService } from './users.service.js';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // =========================================================
  // CREATE
  // =========================================================

  @Post()
  @RequirePermissions(USER_PERMISSIONS.CREATE)
  @ApiMessage('User created successfully')
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  // =========================================================
  // LIST
  // =========================================================

  @Get()
  @RequirePermissions(USER_PERMISSIONS.LIST)
  @ApiMessage('Users retrieved successfully')
  findAll(@Query() query: ListUsersDto) {
    return this.usersService.findAll(query);
  }

  // =========================================================
  // DETAIL
  // =========================================================

  @Get(':id')
  @RequirePermissions(USER_PERMISSIONS.VIEW)
  @ApiMessage('User retrieved successfully')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  // =========================================================
  // UPDATE
  // =========================================================

  @Patch(':id')
  @RequirePermissions(USER_PERMISSIONS.UPDATE)
  @ApiMessage('User updated successfully')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  // =========================================================
  // CHANGE STATUS
  // =========================================================

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(USER_PERMISSIONS.CHANGE_STATUS)
  @ApiMessage('User status updated successfully')
  changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeUserStatusDto,
  ) {
    return this.usersService.changeStatus(id, dto);
  }

  // =========================================================
  // RESEND ACTIVATION INVITATION
  // =========================================================

  @Post(':id/resend-invitation')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(USER_PERMISSIONS.UPDATE)
  @RateLimit(RATE_LIMIT_POLICIES.invitationResend)
  @ApiMessage('Activation invitation request processed')
  resendInvitation(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.resendInvitation(id);
  }
}
