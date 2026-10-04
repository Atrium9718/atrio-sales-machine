import { Controller, Get, Post, Put, Body, Param, Req, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { B2BService } from './b2b.service';

@Controller('api/b2b')
@UseGuards(FirebaseAuthGuard)
export class B2BController {
  constructor(private readonly b2bService: B2BService) {}

  @Get('me')
  getMyProfile(@Req() req: any) {
    return this.b2bService.getProfile(req.dbUser);
  }

  @Post('request')
  submitRequest(@Req() req: any, @Body() body: any) {
    return this.b2bService.submitRequest(req.dbUser, body);
  }
}

@Controller('api/admin/b2b')
@UseGuards(AdminGuard)
export class AdminB2BController {
  constructor(private readonly b2bService: B2BService) {}

  @Get('accounts')
  listAccounts() {
    return this.b2bService.listAccounts();
  }

  @Put('accounts/:id')
  review(@Param('id') id: string, @Req() req: any, @Body() body: { action: 'approve' | 'reject' | 'revoke'; tier?: string }) {
    return this.b2bService.review(Number(id), body.action, req.dbUser?.email || 'admin', body.tier);
  }
}
