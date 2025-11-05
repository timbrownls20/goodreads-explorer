import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectConnection } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private sequelize: Sequelize) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: {
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2025-11-02T12:00:00.000Z' },
        database: { type: 'string', example: 'connected' },
      },
    },
  })
  async check() {
    let databaseStatus = 'disconnected';

    try {
      // Check database connection
      await this.sequelize.query('SELECT 1');
      databaseStatus = 'connected';
    } catch (error) {
      databaseStatus = 'disconnected';
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: databaseStatus,
    };
  }
}
