package postgres

import (
	"context"

	"debtcontrol/backend/internal/core/domain"
	"gorm.io/gorm"
)

type CatExpenseRepository struct {
	db *gorm.DB
}

func NewCatExpenseRepository(db *gorm.DB) *CatExpenseRepository {
	return &CatExpenseRepository{db: db}
}

func (r *CatExpenseRepository) Create(ctx context.Context, expense *domain.CatExpense) error {
	model := &CatExpenseModel{
		ID:             expense.ID,
		ItemName:       expense.ItemName,
		Platform:       expense.Platform,
		PaymentMethod:  expense.PaymentMethod,
		AmountUSD:      expense.AmountUSD,
		AmountVEF:      expense.AmountVEF,
		ExchangeRateID: expense.ExchangeRateID,
		RegisteredBy:   expense.RegisteredBy,
		ExpenseDate:    expense.ExpenseDate,
		CreatedAt:      expense.CreatedAt,
		UpdatedAt:      expense.UpdatedAt,
	}

	return r.db.WithContext(ctx).Create(model).Error
}

func (r *CatExpenseRepository) GetByID(ctx context.Context, id string) (*domain.CatExpense, error) {
	var model CatExpenseModel
	if err := r.db.WithContext(ctx).First(&model, "id = ?", id).Error; err != nil {
		return nil, err
	}

	return &domain.CatExpense{
		ID:             model.ID,
		ItemName:       model.ItemName,
		Platform:       model.Platform,
		PaymentMethod:  model.PaymentMethod,
		AmountUSD:      model.AmountUSD,
		AmountVEF:      model.AmountVEF,
		ExchangeRateID: model.ExchangeRateID,
		RegisteredBy:   model.RegisteredBy,
		ExpenseDate:    model.ExpenseDate,
		CreatedAt:      model.CreatedAt,
		UpdatedAt:      model.UpdatedAt,
	}, nil
}

func (r *CatExpenseRepository) List(ctx context.Context, limit, offset int) ([]*domain.CatExpense, error) {
	var models []CatExpenseModel
	query := r.db.WithContext(ctx).Order("expense_date DESC")
	
	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}

	if err := query.Find(&models).Error; err != nil {
		return nil, err
	}

	var results []*domain.CatExpense
	for _, m := range models {
		results = append(results, &domain.CatExpense{
			ID:             m.ID,
			ItemName:       m.ItemName,
			Platform:       m.Platform,
			PaymentMethod:  m.PaymentMethod,
			AmountUSD:      m.AmountUSD,
			AmountVEF:      m.AmountVEF,
			ExchangeRateID: m.ExchangeRateID,
			RegisteredBy:   m.RegisteredBy,
			ExpenseDate:    m.ExpenseDate,
			CreatedAt:      m.CreatedAt,
			UpdatedAt:      m.UpdatedAt,
		})
	}
	return results, nil
}

func (r *CatExpenseRepository) Update(ctx context.Context, expense *domain.CatExpense) error {
	model := &CatExpenseModel{
		ID:             expense.ID,
		ItemName:       expense.ItemName,
		Platform:       expense.Platform,
		PaymentMethod:  expense.PaymentMethod,
		AmountUSD:      expense.AmountUSD,
		AmountVEF:      expense.AmountVEF,
		ExchangeRateID: expense.ExchangeRateID,
		RegisteredBy:   expense.RegisteredBy,
		ExpenseDate:    expense.ExpenseDate,
		CreatedAt:      expense.CreatedAt,
		UpdatedAt:      expense.UpdatedAt,
	}

	return r.db.WithContext(ctx).Save(model).Error
}

func (r *CatExpenseRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&CatExpenseModel{}, "id = ?", id).Error
}
