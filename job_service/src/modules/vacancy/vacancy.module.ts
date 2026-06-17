import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { VacancyController } from "./vacancy.controller";
import { VacancyService } from "./vacancy.service";

@Module({
    imports: [DatabaseModule],
    controllers: [VacancyController],
    providers: [VacancyService]
})
export class VacancyModule {}