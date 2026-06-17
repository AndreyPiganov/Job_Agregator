import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsNotEmpty, IsString, IsUrl } from "class-validator";

export class VacancyCreateDto {
    @ApiProperty({
        description: 'Название вакансии',
        example: 'Frontend Developer'
    })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({
        description: 'Описание вакансии',
        example: 'We are looking for a skilled frontend developer to join our team.'
    })
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiProperty({
        description: 'Зарплата по вакансии',
        example: 50000,
        minimum: 0
    })
    @IsInt()
    @IsNotEmpty()
    salary: number;

    @ApiProperty({
        description: 'Компания, предлагающая вакансию',
        example: 'Tech Company Inc.'
    })
    @IsString()
    @IsNotEmpty()
    company: string;

    @ApiProperty({
        description: 'Город, где расположена вакансия',
        example: 'Moscow'
    })
    @IsString()
    @IsNotEmpty()
    city: string;

    @ApiProperty({
        description: 'Ссылка на вакансию',
        example: 'https://example.com/vacancy/123'
    })
    @IsUrl()
    @IsNotEmpty()
    link: string;
}