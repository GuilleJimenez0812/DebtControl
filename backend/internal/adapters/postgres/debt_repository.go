package postgres

import (
	"context"
	"errors"
	"regexp"
	"strings"

	"debtcontrol/backend/internal/core/domain"
	"debtcontrol/backend/internal/core/ports"

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

type transactionContextKey struct{}

func (repository *DebtRepository) RunInTransaction(ctx context.Context, fn func(ctx context.Context) error) error {
	return repository.databaseConnection.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		txCtx := context.WithValue(ctx, transactionContextKey{}, tx)
		return fn(txCtx)
	})
}

func (repository *DebtRepository) db(ctx context.Context) *gorm.DB {
	if tx, ok := ctx.Value(transactionContextKey{}).(*gorm.DB); ok {
		return tx.WithContext(ctx)
	}
	return repository.databaseConnection.WithContext(ctx)
}

func (repository *DebtRepository) FindAllPersons(ctx context.Context) ([]*domain.Person, error) {
	var models []PersonModel
	err := repository.db(ctx).Order("name ASC").Find(&models).Error
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
	err := repository.db(ctx).Where("id = ?", id).First(&model).Error
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
	return repository.db(ctx).Save(&model).Error
}

func (repository *DebtRepository) FindAllPurchases(ctx context.Context) ([]*domain.PurchaseItem, error) {
	var models []PurchaseItemModel
	err := repository.db(ctx).Order("created_at DESC").Find(&models).Error
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
	err := repository.db(ctx).Where("id = ?", id).First(&model).Error
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
	trimmed := strings.TrimSpace(orderNumber)
	if trimmed == "" {
		return nil, nil
	}

	cleanNumber := extractCoreOrderNumber(trimmed)

	// 1. Try exact match
	var model PurchaseItemModel
	err := repository.db(ctx).Where("order_number = ?", trimmed).First(&model).Error
	if err == nil {
		return repository.toDomainPurchaseItem(&model), nil
	}

	// 2. Try LIKE match with clean digits/hyphen number
	if cleanNumber != "" {
		err = repository.db(ctx).Where("order_number LIKE ?", "%"+cleanNumber+"%").First(&model).Error
		if err == nil {
			return repository.toDomainPurchaseItem(&model), nil
		}
	}

	// 3. Fallback: Search all purchases and check if clean number matches
	var allModels []PurchaseItemModel
	err = repository.db(ctx).Find(&allModels).Error
	if err == nil {
		for _, m := range allModels {
			mClean := extractCoreOrderNumber(m.OrderNumber)
			if mClean != "" && cleanNumber != "" {
				if strings.Contains(mClean, cleanNumber) || strings.Contains(cleanNumber, mClean) {
					return repository.toDomainPurchaseItem(&m), nil
				}
			}
		}
	}

	return nil, nil
}

func (repository *DebtRepository) SearchOrders(ctx context.Context, query string, personIDs []string, limit int) ([]*ports.SearchResult, error) {
	if limit <= 0 {
		limit = 10
	}

	searchQuery := "%" + query + "%"
	
	db := repository.db(ctx)

	// Build the query joining purchase_items and shipping_packages
	// We use DISTINCT ON (purchase_items.id) to avoid duplicates if multiple tracking numbers match
	sqlQuery := `
		SELECT DISTINCT ON (pi.id)
			pi.id AS purchase_id,
			pi.person_name,
			pi.order_number,
			pi.description,
			pi.total_cost,
			sp.tracking_number
		FROM purchase_items pi
		LEFT JOIN shipping_packages sp ON pi.order_number = sp.order_number AND sp.deleted_at IS NULL
		WHERE pi.deleted_at IS NULL AND (pi.order_number ILIKE ? OR sp.tracking_number ILIKE ?)
	`
	args := []interface{}{searchQuery, searchQuery}

	if len(personIDs) > 0 {
		sqlQuery += " AND pi.person_id IN ?"
		args = append(args, personIDs)
	}

	sqlQuery += " ORDER BY pi.id, pi.created_at DESC LIMIT ?"
	args = append(args, limit)

	rows, err := db.Raw(sqlQuery, args...).Rows()
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []*ports.SearchResult
	for rows.Next() {
		var res ports.SearchResult
		var trackingNumber *string
		if err := rows.Scan(&res.PurchaseID, &res.PersonName, &res.OrderNumber, &res.Description, &res.TotalCost, &trackingNumber); err != nil {
			return nil, err
		}
		if trackingNumber != nil {
			res.TrackingNumber = *trackingNumber
		}
		results = append(results, &res)
	}

	return results, nil
}

func (repository *DebtRepository) toDomainPurchaseItem(model *PurchaseItemModel) *domain.PurchaseItem {
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
	}
}

func (repository *DebtRepository) toDomainShippingPackage(model *ShippingPackageModel) *domain.ShippingPackage {
	return &domain.ShippingPackage{
		ID:                 model.ID,
		PurchaseItemID:     model.PurchaseItemID,
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

func extractCoreOrderNumber(input string) string {
	re := regexp.MustCompile(`\b\d{3}-\d{7}-\d{7}\b`)
	if match := re.FindString(input); match != "" {
		return match
	}
	reDigits := regexp.MustCompile(`[0-9-]+`)
	matches := reDigits.FindAllString(input, -1)
	var longest string
	for _, m := range matches {
		if len(m) > len(longest) && len(m) >= 5 {
			longest = m
		}
	}
	return longest
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
	return repository.db(ctx).Save(&model).Error
}

func (repository *DebtRepository) DeletePurchase(ctx context.Context, id string) error {
	return repository.db(ctx).Where("id = ?", id).Delete(&PurchaseItemModel{}).Error
}

func (repository *DebtRepository) FindPaymentsByPersonID(ctx context.Context, personID string) ([]*domain.PaymentTransaction, error) {
	var models []PaymentTransactionModel
	err := repository.db(ctx).Where("person_id = ?", personID).Order("payment_date DESC").Find(&models).Error
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
	return repository.db(ctx).Save(&model).Error
}

func (repository *DebtRepository) FindAllPackages(ctx context.Context) ([]*domain.ShippingPackage, error) {
	var models []ShippingPackageModel
	err := repository.db(ctx).Order("created_at ASC").Find(&models).Error
	if err != nil {
		return nil, err
	}

	packages := make([]*domain.ShippingPackage, len(models))
	for index, model := range models {
		packages[index] = repository.toDomainShippingPackage(&model)
	}
	return packages, nil
}

func (repository *DebtRepository) FindPackagesByPurchaseID(ctx context.Context, purchaseID string) ([]*domain.ShippingPackage, error) {
	var models []ShippingPackageModel
	err := repository.db(ctx).Where("purchase_item_id = ?", purchaseID).Find(&models).Error
	if err != nil {
		return nil, err
	}

	packages := make([]*domain.ShippingPackage, 0, len(models))
	for _, model := range models {
		packages = append(packages, repository.toDomainShippingPackage(&model))
	}
	return packages, nil
}

func (repository *DebtRepository) FindPackagesByOrderNumber(ctx context.Context, orderNumber string) ([]*domain.ShippingPackage, error) {
	var models []ShippingPackageModel
	err := repository.db(ctx).Where("order_number = ?", orderNumber).Find(&models).Error
	if err != nil {
		return nil, err
	}

	packages := make([]*domain.ShippingPackage, 0, len(models))
	for _, model := range models {
		packages = append(packages, repository.toDomainShippingPackage(&model))
	}
	return packages, nil
}

func (repository *DebtRepository) FindPackageByID(ctx context.Context, id string) (*domain.ShippingPackage, error) {
	var model ShippingPackageModel
	err := repository.db(ctx).Where("id = ?", id).First(&model).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}

	return repository.toDomainShippingPackage(&model), nil
}

func (repository *DebtRepository) SavePackage(ctx context.Context, pkg *domain.ShippingPackage) error {
	model := ShippingPackageModel{
		ID:                 pkg.ID,
		PurchaseItemID:     pkg.PurchaseItemID,
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
	return repository.db(ctx).Save(&model).Error
}

func (repository *DebtRepository) DeletePackagesByPurchaseID(ctx context.Context, purchaseID string) error {
	return repository.db(ctx).Where("purchase_item_id = ?", purchaseID).Delete(&ShippingPackageModel{}).Error
}

func (repository *DebtRepository) RecalculateAllBalances(ctx context.Context) error {
	persons, err := repository.FindAllPersons(ctx)
	if err != nil {
		return err
	}

	for _, person := range persons {
		var purchases []PurchaseItemModel
		_ = repository.db(ctx).Where("person_id = ?", person.ID).Find(&purchases).Error
		var totalOwed float64
		for _, purchase := range purchases {
			totalOwed += purchase.TotalCost
		}

		var payments []PaymentTransactionModel
		_ = repository.db(ctx).Where("person_id = ?", person.ID).Find(&payments).Error
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

func (repository *DebtRepository) ResetAllData(ctx context.Context) error {
	_ = repository.db(ctx).Exec("DELETE FROM payment_transactions;").Error
	_ = repository.db(ctx).Exec("DELETE FROM purchase_items;").Error
	_ = repository.db(ctx).Exec("DELETE FROM shipping_packages;").Error
	_ = repository.db(ctx).Exec("DELETE FROM persons;").Error
	return nil
}

// EnsurePurchaseItemForeignKey backfills the Order<->Package link and creates the physical
// FK constraint. AutoMigrate adds the columns and indexes declared on the models, but the
// backfill and the constraint itself are applied here (mirroring migrations/000003).
func (repository *DebtRepository) EnsurePurchaseItemForeignKey(ctx context.Context) error {
	backfillSQL := `
		UPDATE shipping_packages
		SET purchase_item_id = best.purchase_item_id
		FROM (
			SELECT candidate.package_id,
			       candidate.purchase_item_id,
			       ROW_NUMBER() OVER (
			           PARTITION BY candidate.package_id
			           ORDER BY candidate.same_period DESC, candidate.purchase_item_id
			       ) AS preference_rank,
			       COUNT(*) FILTER (WHERE candidate.same_period) OVER (PARTITION BY candidate.package_id) AS same_period_count,
			       COUNT(*) OVER (PARTITION BY candidate.package_id) AS total_count
			FROM (
				SELECT shipping_packages.id AS package_id,
				       purchase_items.id AS purchase_item_id,
				       (purchase_items.detail_period = shipping_packages.batch_month) AS same_period
				FROM shipping_packages
				JOIN purchase_items
				  ON purchase_items.order_number = shipping_packages.order_number
				 AND purchase_items.deleted_at IS NULL
			) candidate
		) best
		WHERE shipping_packages.id = best.package_id
		  AND best.preference_rank = 1
		  AND (
		      (best.same_period_count = 1 AND best.total_count >= 1)
		      OR (best.same_period_count = 0 AND best.total_count = 1)
		  )`
	if err := repository.databaseConnection.WithContext(ctx).Exec(backfillSQL).Error; err != nil {
		return err
	}

	fkSQL := `
		DO $$
		BEGIN
			IF NOT EXISTS (
				SELECT 1 FROM pg_constraint WHERE conname = 'fk_shipping_packages_purchase_item'
			) THEN
				ALTER TABLE shipping_packages
					ADD CONSTRAINT fk_shipping_packages_purchase_item
					FOREIGN KEY (purchase_item_id)
					REFERENCES purchase_items(id)
					ON DELETE CASCADE;
			END IF;
		END $$;`
	return repository.databaseConnection.WithContext(ctx).Exec(fkSQL).Error
}
