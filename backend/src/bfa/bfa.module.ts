import { Global, Module } from '@nestjs/common';
import { BfaService } from './bfa.service';

@Global()
@Module({ providers: [BfaService], exports: [BfaService] })
export class BfaModule {}
