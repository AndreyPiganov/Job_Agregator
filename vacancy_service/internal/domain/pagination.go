package domain

type Pagination struct {
	Page         int
	ItemsPerPage int
}

func (p *Pagination) Normalize() {
	if p.Page < 1 {
		p.Page = 1
	}
	if p.ItemsPerPage < 1 {
		p.ItemsPerPage = 10
	}
	if p.ItemsPerPage > 100 {
		p.ItemsPerPage = 100
	}
}
