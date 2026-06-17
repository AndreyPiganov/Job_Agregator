import { Inject, Injectable, LoggerService, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { VacancyCreateDto } from './dto/vacancy.create.dto';
import { Vacancy } from '@prisma/client';

@Injectable()
export class VacancyService {
    constructor(
        private readonly prisma: DatabaseService,
        @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
    ) {}

    async getAllVacancies(page = 1, limit = 10): Promise<Vacancy[]> {
        try {
            const skip = (page - 1) * limit;
            const vacancies = await this.prisma.vacancy.findMany({
                skip,
                take: limit,
            });
            this.logger.log(`Successfully fetched vacancies page ${page} limit ${limit}`);
            return vacancies;
        } catch (error) {
            this.logger.error('Error fetching vacancies:', error);
            throw new Error('Could not fetch vacancies');
        }
    }

    async getVacancyById(id: number): Promise<Vacancy> {
        try {
            const vacancy = await this.prisma.vacancy.findUnique({ where: { id } });
            if (!vacancy) {
                this.logger.warn(`Vacancy with id ${id} not found`);
                throw new NotFoundException('Vacancy not found');
            }
            this.logger.log(`Successfully fetched vacancy with id ${id}`);
            return vacancy;
        } catch (error) {
            this.logger.error(`Error fetching vacancy with id ${id}:`, error);
            throw new Error('Could not fetch vacancy');
        }
    }

    async createVacancy(dto: VacancyCreateDto): Promise<Vacancy> {
        try {
            const newVacancy = await this.prisma.vacancy.create(
                { 
                data : {
                    title: dto.title,
                    description: dto.description,
                    salary: dto.salary,
                    city: dto.city,
                    link: dto.link,
                    company: {
                        connectOrCreate: {
                            where: { name: dto.company },
                            create: { name: `Company ${dto.company}` }
                        }
                    }
                }});
            this.logger.log(`Successfully created vacancy with id ${newVacancy.id}`);
            return newVacancy;
        } catch (error) {
            this.logger.error('Error creating vacancy:', error);
            throw new Error('Could not create vacancy');
        }
    }

    async getAllVacanciesByCompany(companyName: string): Promise<Vacancy[]> {
        try {
            const vacancies = await this.prisma.vacancy.findMany({
                where: {
                    company: {
                        name: companyName
                    },
                    include: {
                        company: true
                    }
                }
            });
            this.logger.log(`Successfully fetched vacancies for company ${companyName}`);
            return vacancies;
        } catch (error) {
            this.logger.error(`Error fetching vacancies for company ${companyName}:`, error);
            throw new Error('Could not fetch vacancies for the specified company');
        }
    }

    async getVacanciesBySalaryRange(minSalary: number, maxSalary: number): Promise<Vacancy[]> {
        try {
            const vacancies = await this.prisma.vacancy.findMany({
                where: {
                    salary: {
                        gte: minSalary,
                        lte: maxSalary
                    },
                    include: {
                        company: true
                    }
                }
            });
            this.logger.log(`Successfully fetched vacancies with salary between ${minSalary} and ${maxSalary}`);
            return vacancies;
        } catch (error) {
            this.logger.error(`Error fetching vacancies with salary between ${minSalary} and ${maxSalary}:`, error);
            throw new Error('Could not fetch vacancies for the specified salary range');
        }
    }

}
