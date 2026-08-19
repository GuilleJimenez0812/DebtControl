package postgres

import (
	"context"

	"debtcontrol/backend/internal/core/domain"
	"gorm.io/gorm"
)

type ExchangeRateRepository struct {
	databaseConnection *gorm.DB
}

func NewExchangeRateRepository(db *gorm.DB) *ExchangeRateRepository {
	return &ExchangeRateRepository{databaseConnection: db}
}

func (r *ExchangeRateRepository) Save(ctx context.Context, rate *domain.ExchangeRate) error {
	model := &ExchangeRateModel{
		ID:        rate.ID,
		Currency:  rate.Currency,
		Rate:      rate.Rate,
		Source:    rate.Source,
		CreatedAt: rate.CreatedAt,
	}

	return r.databaseConnection.WithContext(ctx).Create(model).Error
}

func (r *ExchangeRateRepository) GetLatest(ctx context.Context, currency string) (*domain.ExchangeRate, error) {
	var model ExchangeRateModel
	err := r.databaseConnection.WithContext(ctx).
		Where("currency = ?", currency).
		Order("created_at desc").
		First(&model).Error

	if err != nil {
		return nil, err
	}

	return &domain.ExchangeRate{
		ID:        model.ID,
		Currency:  model.Currency,
		Rate:      model.Rate,
		Source:    model.Source,
		CreatedAt: model.CreatedAt,
	}, nil
}
