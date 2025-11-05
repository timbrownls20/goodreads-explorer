import {
  Controller,
  Get,
  Query,
  Session,
  NotFoundException,
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
import { User } from '../models/user.model';
import { Library } from '../models/library.model';
import { logger } from '../utils/logger';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsEngineService: AnalyticsEngineService,
    @InjectModel(User)
    private userModel: typeof User,
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
    status: 404,
    description: 'Library not found for session',
  })
  async getSummary(
    @Query() filters: FilterRequestDto,
    @Session() session: Record<string, any>,
  ): Promise<AnalyticsSummaryDto> {
    const startTime = Date.now();
    const sessionId = session.id;

    logger.info('Summary request received', { sessionId, filters });

    // Get user's library
    const library = await this.getUserLibrary(sessionId);

    // Calculate summary statistics
    const summary = await this.analyticsEngineService.getSummary(
      library.id,
      filters,
    );

    const duration = Date.now() - startTime;
    logger.info('Summary response sent', { sessionId, duration });

    return summary;
  }

  /**
   * Get library for user's session
   */
  private async getUserLibrary(sessionId: string): Promise<Library> {
    // Find user by session
    const user = await this.userModel.findOne({ where: { sessionId } });

    if (!user) {
      throw new NotFoundException(
        'No library found. Please upload your library data first.',
      );
    }

    // Find user's library
    const library = await this.libraryModel.findOne({
      where: { userId: user.id, name: 'My Library' },
    });

    if (!library) {
      throw new NotFoundException(
        'No library found. Please upload your library data first.',
      );
    }

    return library;
  }
}
