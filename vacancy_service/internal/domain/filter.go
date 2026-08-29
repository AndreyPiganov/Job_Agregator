package domain

import "time"

type VacancySearchField string

const (
	VacancySearchTitle       VacancySearchField = "title"
	VacancySearchDescription VacancySearchField = "description"
	VacancySearchCompanyName VacancySearchField = "company_name"
)

type VacancySort string

const (
	VacancySortDateDesc   VacancySort = "date_desc"
	VacancySortDateAsc    VacancySort = "date_asc"
	VacancySortSalaryDesc VacancySort = "salary_desc"
	VacancySortSalaryAsc  VacancySort = "salary_asc"
)

type VacancyPeriod string

const (
	VacancyPeriodDay       VacancyPeriod = "day"
	VacancyPeriodThreeDays VacancyPeriod = "3_days"
	VacancyPeriodWeek      VacancyPeriod = "week"
)

func (period VacancyPeriod) Duration() (time.Duration, bool) {
	switch period {
	case VacancyPeriodDay:
		return 24 * time.Hour, true
	case VacancyPeriodThreeDays:
		return 3 * 24 * time.Hour, true
	case VacancyPeriodWeek:
		return 7 * 24 * time.Hour, true
	default:
		return 0, false
	}
}
