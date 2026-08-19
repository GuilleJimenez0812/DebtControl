package services

import (
	"context"
	"errors"
	"time"

	"debtcontrol/backend/internal/core/domain"
	"debtcontrol/backend/internal/core/ports"
	"github.com/google/uuid"
)

type CatExpenseService struct {
	repo ports.CatExpenseRepository
}

func NewCatExpenseService(repo ports.CatExpenseRepository) *CatExpenseService {
	return &CatExpenseService{repo: repo}
}

func (s *CatExpenseService) CreateExpense(ctx context.Context, userID string, expense *domain.CatExpense) error {
	if expense.ItemName == "" || expense.Platform == "" || expense.PaymentMethod == "" {
		return errors.New("item_name, platform, and payment_method are required")
	}
	if expense.AmountUSD <= 0 {
		return errors.New("amount_usd must be greater than 0")
	}

	expense.ID = uuid.New().String()
	expense.RegisteredBy = userID
	
	if expense.ExpenseDate.IsZero() {
		expense.ExpenseDate = time.Now()
	}
	expense.CreatedAt = time.Now()
	expense.UpdatedAt = time.Now()

	return s.repo.Create(ctx, expense)
}

func (s *CatExpenseService) GetExpense(ctx context.Context, id string) (*domain.CatExpense, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *CatExpenseService) ListExpenses(ctx context.Context, limit, offset int) ([]*domain.CatExpense, error) {
	return s.repo.List(ctx, limit, offset)
}

func (s *CatExpenseService) UpdateExpense(ctx context.Context, expense *domain.CatExpense) error {
	existing, err := s.repo.GetByID(ctx, expense.ID)
	if err != nil {
		return err
	}

	if expense.ItemName == "" || expense.Platform == "" || expense.PaymentMethod == "" {
		return errors.New("item_name, platform, and payment_method are required")
	}
	if expense.AmountUSD <= 0 {
		return errors.New("amount_usd must be greater than 0")
	}

	existing.ItemName = expense.ItemName
	existing.Platform = expense.Platform
	existing.PaymentMethod = expense.PaymentMethod
	existing.AmountUSD = expense.AmountUSD
	existing.AmountVEF = expense.AmountVEF
	existing.ExchangeRateID = expense.ExchangeRateID
	
	if !expense.ExpenseDate.IsZero() {
		existing.ExpenseDate = expense.ExpenseDate
	}
	existing.UpdatedAt = time.Now()

	return s.repo.Update(ctx, existing)
}

func (s *CatExpenseService) DeleteExpense(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}
