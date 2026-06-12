import { Module } from '@nestjs/common';
import { SavedFiltersService } from './saved-filters.service';
import { SavedFiltersController } from './saved-filters.controller';

@Module({
  controllers: [SavedFiltersController],
  providers: [SavedFiltersService],
  exports: [SavedFiltersService],
})
export class SavedFiltersModule {}
