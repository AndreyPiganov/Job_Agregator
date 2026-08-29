package domain

// Company belongs to the vacancy aggregate until independent company use cases appear.
type Company struct {
	ID   int64
	Name string
}
