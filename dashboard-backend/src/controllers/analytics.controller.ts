import {
  Controller,
  Get,
  Query,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { InjectModel } from '@nestjs/sequelize';
import { AnalyticsEngineService } from '../services/analytics-engine.service';
import {
  AnalyticsSummaryDto,
  FilterRequestDto,
} from '../dto/analytics.dto';
import { Library } from '../models/library.model';
import { logger } from '../utils/logger';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsEngineService: AnalyticsEngineService,
    @InjectModel(Library)
    private libraryModel: typeof Library,
  ) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Get summary statistics for library',
    description:
      'Returns aggregate statistics including total counts, ratings, reading pace, and year-over-year comparison. Supports optional filters.',
  })
  @ApiQuery({
    name: 'libraryName',
    required: true,
    type: String,
    description: 'Library name (e.g., "tim-brown_library")',
  })
  @ApiQuery({
    name: 'dateStart',
    required: false,
    type: String,
    description: 'Filter start date (ISO 8601)',
  })
  @ApiQuery({
    name: 'dateEnd',
    required: false,
    type: String,
    description: 'Filter end date (ISO 8601)',
  })
  @ApiQuery({
    name: 'ratingMin',
    required: false,
    type: Number,
    description: 'Minimum rating (1-5)',
  })
  @ApiQuery({
    name: 'ratingMax',
    required: false,
    type: Number,
    description: 'Maximum rating (1-5)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['read', 'currently-reading', 'to-read'],
    description: 'Reading status filter',
  })
  @ApiQuery({
    name: 'shelves',
    required: false,
    type: [String],
    description: 'Filter by shelves (multi-select)',
  })
  @ApiQuery({
    name: 'genres',
    required: false,
    type: [String],
    description: 'Filter by genres (multi-select)',
  })
  @ApiResponse({
    status: 200,
    description: 'Summary statistics retrieved successfully',
    type: AnalyticsSummaryDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Library name is required',
  })
  @ApiResponse({
    status: 404,
    description: 'Library not found',
  })
  async getSummary(
    @Query('libraryName') libraryName: string,
    @Query() filters: FilterRequestDto,
  ): Promise<AnalyticsSummaryDto> {
    const startTime = Date.now();

    if (!libraryName) {
      throw new BadRequestException('Library name is required');
    }

    logger.info('Summary request received', { libraryName, filters });

    // Get library by name
    const library = await this.getLibraryByName(libraryName);

    // Calculate summary statistics
    const summary = await this.analyticsEngineService.getSummary(
      library.id,
      filters,
    );

    const duration = Date.now() - startTime;
    logger.info('Summary response sent', { libraryName, duration });

    return summary;
  }

  /**
   * Get library by name
   */
  private async getLibraryByName(name: string): Promise<Library> {
    const library = await this.libraryModel.findOne({
      where: { name },
    });

    if (!library) {
      throw new NotFoundException(
        `Library "${name}" not found. Please upload your library data first.`,
      );
    }

    return library;
  }
}
