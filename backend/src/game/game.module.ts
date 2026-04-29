import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { GameRepository } from './game.repository';
import { GameService } from './game.service';
import { GameController } from './game.controller';

@Module({ imports: [PrismaModule, AuthModule], providers: [GameRepository, GameService], controllers: [GameController] })
export class GameModule {}
