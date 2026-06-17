import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";
import { VacancyService } from "./vacancy.service";
import { Body, Controller, Get, HttpException, HttpStatus, Inject, LoggerService, Param, ParseIntPipe, Post, Query } from "@nestjs/common";
import { QueryVacancy } from "./dto/vacancy.query.dto";
import { VacancyCreateDto } from "./dto/vacancy.create.dto";

@ApiTags('Vacancies')
@Controller('/vacancies')
export class VacancyController {
    constructor(
        private readonly vacancyService: VacancyService,
        @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
    ) {}

    @Get('/')
    @ApiOperation({ summary: 'Получить все вакансии' })
    @ApiResponse({ status: 200, description: 'Список вакансий успешно получен' })
    @ApiQuery({ name: 'page', type: 'number', description: 'Страница вакансий', example: 1, required: false })
    @ApiQuery({
        name: 'itemsPerPage',
        type: 'number',
        description: 'Количество вакансий на странице',
        example: 5,
        required: false
    })
    @ApiResponse({ status: 500, description: 'Ошибка при получении вакансий' })
    getAllVacancies(@Query() query: QueryVacancy) {
        try {
            return this.vacancyService.getAllVacancies(query.page, query.itemsPerPage);
        } catch (e) {
            this.logger.error('Error in vacancyController:', e);
            throw new HttpException('Ошибка при получении вакансий', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get('/:id')
    @ApiOperation({ summary: 'Получить вакансию по ID' })
    @ApiResponse({ status: 200, description: 'Вакансия успешно найдена' })
    @ApiResponse({ status: 404, description: 'Вакансия не найдена' })
    @ApiResponse({ status: 500, description: 'Ошибка при получении вакансии по ID' })
    getVacancyById(@Param('id', ParseIntPipe) id: number) {
        try {
            return this.vacancyService.getVacancyById(id);
        } catch (e) {
            this.logger.error('Error in vacancyController:', e);
            throw new HttpException('Ошибка при получении вакансии', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Post('/')
    @ApiOperation({ summary: 'Создать новую вакансию' })
    @ApiResponse({ status: 201, description: 'Вакансия успешно создана' })
    @ApiResponse({ status: 500, description: 'Ошибка при создании вакансии' })
    createVacancy(@Body() dto: VacancyCreateDto) {
        try {
            return this.vacancyService.createVacancy(dto);
        } catch (e) {
            this.logger.error('Error in vacancyController:', e);
            throw new HttpException('Ошибка при создании вакансии', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get('/company/:companyName')
    @ApiOperation({ summary: 'Получить все вакансии по названию компании' })
    @ApiResponse({ status: 200, description: 'Список вакансий успешно получен' })
    @ApiResponse({ status: 500, description: 'Ошибка при получении вакансий по названию компании' })
    getVacanciesByCompany(@Param('companyName') companyName: string) {
        try {
            return this.vacancyService.getAllVacanciesByCompany(companyName);
        } catch (e) {
            this.logger.error('Error in vacancyController:', e);
            throw new HttpException('Ошибка при получении вакансий по названию компании', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get('/salary')
    @ApiOperation({ summary: 'Получить все вакансии по диапазону зарплаты' })
    @ApiResponse({ status: 200, description: 'Список вакансий успешно получен' })
    @ApiQuery({ name: 'minSalary', type: 'number', description: 'Минимальная зарплата', example: 50000, required: true })
    @ApiQuery({ name: 'maxSalary', type: 'number', description: 'Максимальная зарплата', example: 150000, required: true })
    @ApiResponse({ status: 500, description: 'Ошибка при получении вакансий по диапазону зарплаты' })
    getVacanciesBySalaryRange(@Query('minSalary') minSalary: number, @Query('maxSalary') maxSalary: number) {
        try {
            return this.vacancyService.getVacanciesBySalaryRange(minSalary, maxSalary);
        } catch (e) {
            this.logger.error('Error in vacancyController:', e);
            throw new HttpException('Ошибка при получении вакансий по диапазону зарплаты', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    

}