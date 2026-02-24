import { Controller, Get, Post, Body, Param } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { AppService } from './app.service'

@ApiTags('supplier')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('info/:state')
  @ApiOperation({ summary: 'Get provider info by state' })
  @ApiResponse({ status: 200, description: 'Returns provider address' })
  async getProviderInfo(@Param('state') state: string) {
    return this.appService.getProviderInfo(state)
  }

  @Post('order')
  @ApiOperation({ summary: 'Place order with supplier' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  async placeOrder(@Body() items: Array<{ id: number; amount: number }>) {
    return this.appService.placeOrder(items)
  }
}
