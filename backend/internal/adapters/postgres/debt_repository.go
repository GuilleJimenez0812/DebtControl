package postgres

import (
	"context"
	"errors"

	"debtcontrol/backend/internal/core/domain"

	"gorm.io/gorm"
)

type DebtRepository struct {
	databaseConnection *gorm.DB
}

func NewDebtRepository(databaseConnection *gorm.DB) *DebtRepository {
	return &DebtRepository{
		databaseConnection: databaseConnection,
	}
}

func (repository *DebtRepository) FindAllPersons(ctx context.Context) ([]*domain.Person, error) {
	var models []PersonModel
	err := repository.databaseConnection.WithContext(ctx).Order("name ASC").Find(&models).Error
	if err != nil {
		return nil, err
	}

	persons := make([]*domain.Person, len(models))
	for index, model := range models {
		persons[index] = &domain.Person{
			ID:        model.ID,
			Name:      model.Name,
			TotalOwed: model.TotalOwed,
			TotalPaid: model.TotalPaid,
			Balance:   model.Balance,
			Status:    domain.PersonStatus(model.Status),
			CreatedAt: model.CreatedAt,
			UpdatedAt: model.UpdatedAt,
		}
	}
	return persons, nil
}

func (repository *DebtRepository) FindPersonByID(ctx context.Context, id string) (*domain.Person, error) {
	var model PersonModel
	err := repository.databaseConnection.WithContext(ctx).Where("id = ?", id).First(&model).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}

	return &domain.Person{
		ID:        model.ID,
		Name:      model.Name,
		TotalOwed: model.TotalOwed,
		TotalPaid: model.TotalPaid,
		Balance:   model.Balance,
		Status:    domain.PersonStatus(model.Status),
		CreatedAt: model.CreatedAt,
		UpdatedAt: model.UpdatedAt,
	}, nil
}

func (repository *DebtRepository) SavePerson(ctx context.Context, person *domain.Person) error {
	model := PersonModel{
		ID:        person.ID,
		Name:      person.Name,
		TotalOwed: person.TotalOwed,
		TotalPaid: person.TotalPaid,
		Balance:   person.Balance,
		Status:    string(person.Status),
		CreatedAt: person.CreatedAt,
		UpdatedAt: person.UpdatedAt,
	}
	return repository.databaseConnection.WithContext(ctx).Save(&model).Error
}

func (repository *DebtRepository) FindAllPurchases(ctx context.Context) ([]*domain.PurchaseItem, error) {
	var models []PurchaseItemModel
	err := repository.databaseConnection.WithContext(ctx).Order("created_at DESC").Find(&models).Error
	if err != nil {
		return nil, err
	}

	purchases := make([]*domain.PurchaseItem, len(models))
	for index, model := range models {
		purchases[index] = &domain.PurchaseItem{
			ID:           model.ID,
			PersonID:     model.PersonID,
			PersonName:   model.PersonName,
			OrderNumber:  model.OrderNumber,
			Description:  model.Description,
			ItemAmount:   model.ItemAmount,
			TaxAmount:    model.TaxAmount,
			ShippingCost: model.ShippingCost,
			TotalCost:    model.TotalCost,
			DetailPeriod: model.DetailPeriod,
			InvoiceURL:   model.InvoiceURL,
			CreatedAt:    model.CreatedAt,
			UpdatedAt:    model.UpdatedAt,
		}
	}
	return purchases, nil
}

func (repository *DebtRepository) FindPurchaseByID(ctx context.Context, id string) (*domain.PurchaseItem, error) {
	var model PurchaseItemModel
	err := repository.databaseConnection.WithContext(ctx).Where("id = ?", id).First(&model).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}

	return &domain.PurchaseItem{
		ID:           model.ID,
		PersonID:     model.PersonID,
		PersonName:   model.PersonName,
		OrderNumber:  model.OrderNumber,
		Description:  model.Description,
		ItemAmount:   model.ItemAmount,
		TaxAmount:    model.TaxAmount,
		ShippingCost: model.ShippingCost,
		TotalCost:    model.TotalCost,
		DetailPeriod: model.DetailPeriod,
		InvoiceURL:   model.InvoiceURL,
		CreatedAt:    model.CreatedAt,
		UpdatedAt:    model.UpdatedAt,
	}, nil
}

func (repository *DebtRepository) FindPurchaseItemByOrderNumber(ctx context.Context, orderNumber string) (*domain.PurchaseItem, error) {
	if orderNumber == "" {
		return nil, nil
	}
	var model PurchaseItemModel
	err := repository.databaseConnection.WithContext(ctx).Where("order_number = ?", orderNumber).First(&model).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}

	return &domain.PurchaseItem{
		ID:           model.ID,
		PersonID:     model.PersonID,
		PersonName:   model.PersonName,
		OrderNumber:  model.OrderNumber,
		Description:  model.Description,
		ItemAmount:   model.ItemAmount,
		TaxAmount:    model.TaxAmount,
		ShippingCost: model.ShippingCost,
		TotalCost:    model.TotalCost,
		DetailPeriod: model.DetailPeriod,
		InvoiceURL:   model.InvoiceURL,
		CreatedAt:    model.CreatedAt,
		UpdatedAt:    model.UpdatedAt,
	}, nil
}

func (repository *DebtRepository) SavePurchase(ctx context.Context, purchase *domain.PurchaseItem) error {
	model := PurchaseItemModel{
		ID:           purchase.ID,
		PersonID:     purchase.PersonID,
		PersonName:   purchase.PersonName,
		OrderNumber:  purchase.OrderNumber,
		Description:  purchase.Description,
		ItemAmount:   purchase.ItemAmount,
		TaxAmount:    purchase.TaxAmount,
		ShippingCost: purchase.ShippingCost,
		TotalCost:    purchase.TotalCost,
		DetailPeriod: purchase.DetailPeriod,
		InvoiceURL:   purchase.InvoiceURL,
		CreatedAt:    purchase.CreatedAt,
		UpdatedAt:    purchase.UpdatedAt,
	}
	return repository.databaseConnection.WithContext(ctx).Save(&model).Error
}

func (repository *DebtRepository) DeletePurchase(ctx context.Context, id string) error {
	return repository.databaseConnection.WithContext(ctx).Where("id = ?", id).Delete(&PurchaseItemModel{}).Error
}

func (repository *DebtRepository) FindPaymentsByPersonID(ctx context.Context, personID string) ([]*domain.PaymentTransaction, error) {
	var models []PaymentTransactionModel
	err := repository.databaseConnection.WithContext(ctx).Where("person_id = ?", personID).Order("payment_date DESC").Find(&models).Error
	if err != nil {
		return nil, err
	}

	payments := make([]*domain.PaymentTransaction, len(models))
	for index, model := range models {
		payments[index] = &domain.PaymentTransaction{
			ID:          model.ID,
			PersonID:    model.PersonID,
			AmountPaid:  model.AmountPaid,
			Notes:       model.Notes,
			PaymentDate: model.PaymentDate,
		}
	}
	return payments, nil
}

func (repository *DebtRepository) SavePayment(ctx context.Context, payment *domain.PaymentTransaction) error {
	model := PaymentTransactionModel{
		ID:          payment.ID,
		PersonID:    payment.PersonID,
		AmountPaid:  payment.AmountPaid,
		Notes:       payment.Notes,
		PaymentDate: payment.PaymentDate,
	}
	return repository.databaseConnection.WithContext(ctx).Save(&model).Error
}

func (repository *DebtRepository) FindAllPackages(ctx context.Context) ([]*domain.ShippingPackage, error) {
	var models []ShippingPackageModel
	err := repository.databaseConnection.WithContext(ctx).Order("created_at ASC").Find(&models).Error
	if err != nil {
		return nil, err
	}

	packages := make([]*domain.ShippingPackage, len(models))
	for index, model := range models {
		packages[index] = &domain.ShippingPackage{
			ID:                 model.ID,
			OrderNumber:        model.OrderNumber,
			TrackingNumber:     model.TrackingNumber,
			ShippingCost:       model.ShippingCost,
			ItemDescription:    model.ItemDescription,
			WarehouseReceived:  model.WarehouseReceived,
			PersonallyReceived: model.PersonallyReceived,
			DispatchDate:       model.DispatchDate,
			BatchMonth:         model.BatchMonth,
			CreatedAt:          model.CreatedAt,
			UpdatedAt:          model.UpdatedAt,
		}
	}
	return packages, nil
}

func (repository *DebtRepository) FindPackageByID(ctx context.Context, id string) (*domain.ShippingPackage, error) {
	var model ShippingPackageModel
	err := repository.databaseConnection.WithContext(ctx).Where("id = ?", id).First(&model).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}

	return &domain.ShippingPackage{
		ID:                 model.ID,
		OrderNumber:        model.OrderNumber,
		TrackingNumber:     model.TrackingNumber,
		ShippingCost:       model.ShippingCost,
		ItemDescription:    model.ItemDescription,
		WarehouseReceived:  model.WarehouseReceived,
		PersonallyReceived: model.PersonallyReceived,
		DispatchDate:       model.DispatchDate,
		BatchMonth:         model.BatchMonth,
		CreatedAt:          model.CreatedAt,
		UpdatedAt:          model.UpdatedAt,
	}, nil
}

func (repository *DebtRepository) SavePackage(ctx context.Context, pkg *domain.ShippingPackage) error {
	model := ShippingPackageModel{
		ID:                 pkg.ID,
		OrderNumber:        pkg.OrderNumber,
		TrackingNumber:     pkg.TrackingNumber,
		ShippingCost:       pkg.ShippingCost,
		ItemDescription:    pkg.ItemDescription,
		WarehouseReceived:  pkg.WarehouseReceived,
		PersonallyReceived: pkg.PersonallyReceived,
		DispatchDate:       pkg.DispatchDate,
		BatchMonth:         pkg.BatchMonth,
		CreatedAt:          pkg.CreatedAt,
		UpdatedAt:          pkg.UpdatedAt,
	}
	return repository.databaseConnection.WithContext(ctx).Save(&model).Error
}

func (repository *DebtRepository) RecalculateAllBalances(ctx context.Context) error {
	persons, err := repository.FindAllPersons(ctx)
	if err != nil {
		return err
	}

	for _, person := range persons {
		var purchases []PurchaseItemModel
		_ = repository.databaseConnection.WithContext(ctx).Where("person_id = ?", person.ID).Find(&purchases).Error
		var totalOwed float64
		for _, purchase := range purchases {
			totalOwed += purchase.TotalCost
		}

		var payments []PaymentTransactionModel
		_ = repository.databaseConnection.WithContext(ctx).Where("person_id = ?", person.ID).Find(&payments).Error
		var totalPaid float64
		for _, payment := range payments {
			totalPaid += payment.AmountPaid
		}

		person.TotalOwed = totalOwed
		person.TotalPaid = totalPaid
		person.RecalculateBalance()
		_ = repository.SavePerson(ctx, person)
	}

	return nil
}
