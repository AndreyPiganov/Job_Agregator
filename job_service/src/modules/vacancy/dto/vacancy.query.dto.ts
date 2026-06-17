import { ApiProperty } from "@nestjs/swagger";

export class QueryVacancy {
    @ApiProperty({
        description: 'Страница вакансий',
        example: 1,
        required: false
    })
    page?: number;

    @ApiProperty({
        description: 'Количество вакансий на странице',
        example: 10,
        required: false
    })
    itemsPerPage?: number;
}