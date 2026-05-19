import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { BfaModule } from '../bfa/bfa.module';
import { WordModule } from '../word/word.module';
import { GameRepository } from './game.repository';
import { GameService } from './game.service';
import { GameController } from './game.controller';
import { GameJobsService } from './game.jobs.service';

@Module({
	imports: [PrismaModule, AuthModule, BfaModule, WordModule],
	providers: [GameRepository, GameService, GameJobsService],
	controllers: [GameController],
})
export class GameModule {}
