package services

import (
	"context"
	"fmt"
	"math"
	"time"

	"debtcontrol/backend/internal/core/domain"
	"debtcontrol/backend/internal/core/ports"
	"debtcontrol/backend/pkg/pdf"

	"github.com/google/uuid"
)

type DebtService struct {
	debtRepo   ports.DebtRepository
	auditRepo  ports.AuditRepository
	userRepo   ports.UserRepository
	searcher   ports.OrderSearcher
}

func NewDebtService(debtRepo ports.DebtRepository, auditRepo ports.AuditRepository, userRepo ports.UserRepository, searcher ports.OrderSearcher) *DebtService {
	return &DebtService{
		debtRepo:  debtRepo,
		auditRepo: auditRepo,
		userRepo:  userRepo,
		searcher:  searcher,
	}
}

// RebalanceAllBalances recomputes every Person's derived balance from its
// Orders and Payments. Public seam used by the restore CLI.
func (service *DebtService) RebalanceAllBalances(ctx context.Context) error {
	return service.rebuildBalances(ctx)
}

// rebuildBalances is the single seam that derives a Person's balance. Each
// Order and Payment is read through the repository and the balance is
// recomputed here, never written ad-hoc by individual use cases.
func (service *DebtService) rebuildBalances(ctx context.Context) error {
	persons, err := service.debtRepo.FindAllPersons(ctx)
	if err != nil {
		return err
	}

	allPurchases, err := service.debtRepo.FindAllPurchases(ctx)
	if err != nil {
		return err
	}

	for _, person := range persons {
		var totalOwed float64
		for _, purchase := range allPurchases {
			if purchase.PersonID == person.ID {
				totalOwed += purchase.TotalCost
			}
		}

		payments, err := service.debtRepo.FindPaymentsByPersonID(ctx, person.ID)
		if err != nil {
			return err
		}
		var totalPaid float64
		for _, payment := range payments {
			totalPaid += payment.AmountPaid
		}

		// Legacy data may carry a paid amount only as the denormalized
		// persons.total_paid column with no matching Payment rows. A full rebuild
		// would silently wipe it, so backfill a Payment for the orphaned balance
		// first. Idempotent: once the row exists the sum and the stored value agree.
		if person.TotalPaid > totalPaid {
			diff := person.TotalPaid - totalPaid
			if err := service.debtRepo.SavePayment(ctx, &domain.PaymentTransaction{
				ID:          uuid.New().String(),
				PersonID:    person.ID,
				AmountPaid:  diff,
				Notes:       "Backfilled from historical paid balance",
				PaymentDate: time.Now(),
			}); err != nil {
				return err
			}
			totalPaid = person.TotalPaid
		}

		person.TotalOwed = totalOwed
		person.TotalPaid = totalPaid
		person.RecalculateBalance()
		if err := service.debtRepo.SavePerson(ctx, person); err != nil {
			return err
		}
	}
	return nil
}

func (service *DebtService) ListPersonsForUser(ctx context.Context, user *domain.User) ([]*domain.Person, error) {
	allPersons, err := service.debtRepo.FindAllPersons(ctx)
	if err != nil {
		return nil, err
	}

	if user.Role == domain.RoleAdmin {
		return allPersons, nil
	}

	assignedIDs, err := service.userRepo.GetAssignedPersonIDs(ctx, user.ID)
	if err != nil {
		return nil, err
	}

	assignedMap := make(map[string]bool)
	for _, id := range assignedIDs {
		assignedMap[id] = true
	}

	filtered := make([]*domain.Person, 0)
	for _, person := range allPersons {
		if assignedMap[person.ID] {
			filtered = append(filtered, person)
		}
	}
	return filtered, nil
}

func (service *DebtService) GetDashboardSummaryForUser(ctx context.Context, user *domain.User) (*ports.DashboardSummary, error) {
	allPersons, err := service.debtRepo.FindAllPersons(ctx)
	if err != nil {
		return nil, err
	}

	allPurchases, err := service.debtRepo.FindAllPurchases(ctx)
	if err != nil {
		return nil, err
	}

	allPackages, err := service.debtRepo.FindAllPackages(ctx)
	if err != nil {
		return nil, err
	}

	var allowedPersons []*domain.Person
	var allowedPurchases []*domain.PurchaseItem

	if user.Role == domain.RoleAdmin {
		allowedPersons = allPersons
		allowedPurchases = allPurchases
	} else {
		assignedIDs, err := service.userRepo.GetAssignedPersonIDs(ctx, user.ID)
		if err != nil {
			return nil, err
		}
		assignedMap := make(map[string]bool)
		for _, id := range assignedIDs {
			assignedMap[id] = true
		}

		allowedPersons = make([]*domain.Person, 0)
		for _, person := range allPersons {
			if assignedMap[person.ID] {
				allowedPersons = append(allowedPersons, person)
			}
		}

		allowedPurchases = make([]*domain.PurchaseItem, 0)
		for _, purchase := range allPurchases {
			if assignedMap[purchase.PersonID] {
				allowedPurchases = append(allowedPurchases, purchase)
			}
		}
	}

	var totalOutstanding float64
	for _, person := range allowedPersons {
		totalOutstanding += person.Balance
	}

	var totalJuly26 float64
	var totalAugust26 float64

	for _, purchase := range allowedPurchases {
		if purchase.DetailPeriod == "Julio-26" {
			totalJuly26 += purchase.TotalCost
		} else if purchase.DetailPeriod == "Agosto-26" {
			totalAugust26 += purchase.TotalCost
		}
	}

	return &ports.DashboardSummary{
		TotalOutstanding: math.Round(totalOutstanding*100) / 100,
		TotalJuly26:      math.Round(totalJuly26*100) / 100,
		TotalAugust26:    math.Round(totalAugust26*100) / 100,
		Persons:          allowedPersons,
		RecentPurchases:  allowedPurchases,
		ShippingPackages: allPackages,
	}, nil
}

func (service *DebtService) CreatePurchaseItem(ctx context.Context, personName string, orderNumber string, description string, amount float64, tax float64, shipping float64, invoiceURL string, detailPeriod string) (*domain.PurchaseItem, error) {
	persons, err := service.debtRepo.FindAllPersons(ctx)
	if err != nil {
		return nil, err
	}

	var targetPerson *domain.Person
	for _, person := range persons {
		if person.Name == personName {
			targetPerson = person
			break
		}
	}

	if targetPerson == nil {
		targetPerson = domain.NewPerson(uuid.New().String(), personName)
		err = service.debtRepo.SavePerson(ctx, targetPerson)
		if err != nil {
			return nil, err
		}
	}

	purchaseID := uuid.New().String()
	newItem, err := domain.NewPurchaseItem(purchaseID, targetPerson.ID, targetPerson.Name, orderNumber, description, amount, tax, shipping, invoiceURL, detailPeriod)
	if err != nil {
		return nil, err
	}

	err = service.debtRepo.SavePurchase(ctx, newItem)
	if err != nil {
		return nil, err
	}

	if err := service.rebuildBalances(ctx); err != nil {
		return nil, err
	}

	return newItem, nil
}

func (service *DebtService) UpdatePurchaseItem(ctx context.Context, id string, description string, itemAmount float64, taxAmount float64, shippingCost float64, invoiceURL string, detailPeriod string) (*domain.PurchaseItem, error) {
	item, err := service.debtRepo.FindPurchaseByID(ctx, id)
	if err != nil || item == nil {
		return nil, domain.ErrPurchaseItemNotFound
	}

	if description != "" {
		item.Description = description
	}
	item.ItemAmount = itemAmount
	item.TaxAmount = taxAmount
	item.ShippingCost = shippingCost
	item.DetailPeriod = detailPeriod
	if invoiceURL != "" {
		item.InvoiceURL = invoiceURL
	}
	item.RecalculateTotalCost()

	err = service.debtRepo.SavePurchase(ctx, item)
	if err != nil {
		return nil, err
	}

	service.logAudit(ctx, "UPDATE", "PurchaseItem", item.ID, "Updated purchase order "+item.OrderNumber)

	_ = service.rebuildBalances(ctx)
	return item, nil
}

func (service *DebtService) syncPurchaseShippingCost(ctx context.Context, purchaseID string) error {
	purchase, err := service.debtRepo.FindPurchaseByID(ctx, purchaseID)
	if err != nil || purchase == nil {
		return nil // No purchase linked, nothing to sync
	}

	packages, err := service.debtRepo.FindPackagesByPurchaseID(ctx, purchaseID)
	if err != nil {
		return err
	}

	var totalShipping float64
	for _, pkg := range packages {
		totalShipping += pkg.ShippingCost
	}

	purchase.ShippingCost = totalShipping
	purchase.RecalculateTotalCost()

	if err := service.debtRepo.SavePurchase(ctx, purchase); err != nil {
		return err
	}
	_ = service.rebuildBalances(ctx)
	return nil
}

func (service *DebtService) UpdateShippingPackage(ctx context.Context, id string, shippingCost float64, warehouseReceived bool, personallyReceived bool, dispatchDate string) (*domain.ShippingPackage, error) {
	pkg, err := service.debtRepo.FindPackageByID(ctx, id)
	if err != nil || pkg == nil {
		return nil, domain.ErrPackageNotFound
	}

	pkg.ShippingCost = shippingCost
	pkg.WarehouseReceived = warehouseReceived
	pkg.PersonallyReceived = personallyReceived
	pkg.DispatchDate = dispatchDate
	pkg.UpdatedAt = time.Now()

	err = service.debtRepo.SavePackage(ctx, pkg)
	if err != nil {
		return nil, err
	}

	service.logAudit(ctx, "UPDATE", "ShippingPackage", pkg.ID, "Updated shipping package tracking: "+pkg.TrackingNumber)

	_ = service.syncPurchaseShippingCost(ctx, pkg.PurchaseItemID)

	return pkg, nil
}

func (service *DebtService) CreateShippingPackage(ctx context.Context, purchaseID string, trackingNumber string, shippingCost float64) (*domain.ShippingPackage, error) {
	purchase, err := service.debtRepo.FindPurchaseByID(ctx, purchaseID)
	if err != nil {
		return nil, err
	}
	if purchase == nil {
		return nil, domain.ErrPurchaseItemNotFound
	}

	pkg := &domain.ShippingPackage{
		ID:                 uuid.New().String(),
		PurchaseItemID:     purchase.ID,
		OrderNumber:        purchase.OrderNumber,
		TrackingNumber:     trackingNumber,
		ShippingCost:       shippingCost,
		ItemDescription:    "",
		WarehouseReceived:  false,
		PersonallyReceived: false,
		DispatchDate:       "",
		BatchMonth:         "",
		CreatedAt:          time.Now(),
		UpdatedAt:          time.Now(),
	}

	err = service.debtRepo.SavePackage(ctx, pkg)
	if err != nil {
		return nil, err
	}

	service.logAudit(ctx, "CREATE", "ShippingPackage", pkg.ID, "Created shipping package tracking: "+pkg.TrackingNumber)

	_ = service.syncPurchaseShippingCost(ctx, purchase.ID)

	return pkg, nil
}

func (service *DebtService) ReassignPurchaseToPerson(ctx context.Context, orderID string, newPersonID string) (*domain.PurchaseItem, error) {
	var reassigned *domain.PurchaseItem
	err := service.debtRepo.RunInTransaction(ctx, func(txCtx context.Context) error {
		item, err := service.debtRepo.FindPurchaseByID(txCtx, orderID)
		if err != nil {
			return err
		}
		if item == nil {
			return domain.ErrPurchaseItemNotFound
		}

		person, err := service.debtRepo.FindPersonByID(txCtx, newPersonID)
		if err != nil {
			return err
		}
		if person == nil {
			return domain.ErrPersonNotFound
		}

		oldPersonID := item.PersonID
		oldPersonName := item.PersonName

		item.PersonID = person.ID
		item.PersonName = person.Name
		item.UpdatedAt = time.Now()

		if err := service.debtRepo.SavePurchase(txCtx, item); err != nil {
			return err
		}

		if oldPersonID != person.ID {
			service.logAudit(txCtx, "UPDATE", "PurchaseItem", item.ID,
				fmt.Sprintf("Reassigned order %s from person %s to person %s", item.OrderNumber, oldPersonName, person.Name))
		}

		reassigned = item
		return service.rebuildBalances(txCtx)
	})
	if err != nil {
		return nil, err
	}
	return reassigned, nil
}

func (service *DebtService) DeletePurchase(ctx context.Context, orderID string) error {
	return service.debtRepo.RunInTransaction(ctx, func(txCtx context.Context) error {
		item, err := service.debtRepo.FindPurchaseByID(txCtx, orderID)
		if err != nil {
			return err
		}
		if item == nil {
			return domain.ErrPurchaseItemNotFound
		}

		if err := service.debtRepo.DeletePurchase(txCtx, orderID); err != nil {
			return err
		}
		if err := service.debtRepo.DeletePackagesByPurchaseID(txCtx, orderID); err != nil {
			return err
		}

		service.logAudit(txCtx, "DELETE", "PurchaseItem", item.ID,
			fmt.Sprintf("Deleted order %s - %s ($%.2f)", item.OrderNumber, item.Description, item.TotalCost))

		return service.rebuildBalances(txCtx)
	})
}

func (service *DebtService) RecordPayment(ctx context.Context, personID string, amount float64, notes string) (*domain.PaymentTransaction, error) {
	person, err := service.debtRepo.FindPersonByID(ctx, personID)
	if err != nil || person == nil {
		return nil, domain.ErrPersonNotFound
	}

	if amount <= 0 {
		return nil, domain.ErrInvalidAmount
	}

	payment := &domain.PaymentTransaction{
		ID:          uuid.New().String(),
		PersonID:    personID,
		AmountPaid:  amount,
		Notes:       notes,
		PaymentDate: time.Now(),
	}

	err = service.debtRepo.SavePayment(ctx, payment)
	if err != nil {
		return nil, err
	}

	service.logAudit(ctx, "CREATE", "PaymentTransaction", payment.ID, "Recorded payment for person: "+person.Name)

	if err := service.rebuildBalances(ctx); err != nil {
		return nil, err
	}

	return payment, nil
}

func (service *DebtService) SeedInitialSpreadsheetData(ctx context.Context) error {
	existingPersons, err := service.debtRepo.FindAllPersons(ctx)
	if err == nil && len(existingPersons) > 0 {
		return nil // Already seeded! Do not wipe user modifications!
	}
	return service.forceSeedData(ctx)
}

func (service *DebtService) ResetAndSeedData(ctx context.Context) error {
	_ = service.debtRepo.ResetAllData(ctx)
	return service.forceSeedData(ctx)
}

func (service *DebtService) forceSeedData(ctx context.Context) error {

	personMap := make(map[string]*domain.Person)

	personData := []struct {
		Name      string
		TotalPaid float64
	}{
		{"Mama", 7.95},
		{"Papa", 110.00},
		{"Vale", 184.11},
		{"Antonio/Sonia", 300.00},
		{"Yo", 279.43},
	}

	for _, pData := range personData {
		person := domain.NewPerson(uuid.New().String(), pData.Name)
		person.TotalPaid = pData.TotalPaid
		_ = service.debtRepo.SavePerson(ctx, person)
		personMap[pData.Name] = person

		if pData.TotalPaid > 0 {
			payment := &domain.PaymentTransaction{
				ID:          uuid.New().String(),
				PersonID:    person.ID,
				AmountPaid:  pData.TotalPaid,
				Notes:       "Pago inicial",
				PaymentDate: time.Now(),
			}
			_ = service.debtRepo.SavePayment(ctx, payment)
		}
	}

	purchases := []struct {
		PersonName   string
		OrderNumber  string
		Description  string
		Amount       float64
		Tax          float64
		Shipping     float64
		TotalCost    float64
		DetailPeriod string
	}{
		{"Mama", "Aparato", "Aparato", 8.51, 0.56, 0.00, 7.95, "N/A"},
		{"Papa", "Zapatos", "Zapatos", 80.20, 5.25, 34.87, 109.82, "N/A"},
		{"Vale", "Chaqueta", "Chaqueta", 29.95, 2.10, 6.00, 33.85, "N/A"},
		{"Vale", "Cosas telefono", "Cosas telefono", 107.30, 7.02, 11.00, 111.28, "N/A"},
		{"Vale", "Cosas telefono 2", "Cosas telefono 2", 36.36, 2.38, 5.00, 38.98, "N/A"},
		{"Antonio/Sonia", "Pedido n.º 112-0540974-2959424", "Pedido n.º 112-0540974-2959424", 41.00, 0.00, 8.00, 49.00, "Julio-26"},
		{"Antonio/Sonia", "Pedido n.º 112-1133266-2328259", "Pedido n.º 112-1133266-2328259", 250.07, 3.23, 33.50, 280.34, "Julio-26"},
		{"Yo", "Kindle/Forro/Cubito", "Kindle/Forro/Cubito", 210.76, 13.79, 5.00, 201.97, "Julio-26"},
		{"Vale", "Pedido n.º 113-5442044-6705847 (Vale)", "Pedido n.º 113-5442044-6705847 (Vale)", 100.32, 6.57, 24.50, 118.25, "Julio-26"},
		{"Antonio/Sonia", "Pedido n.º 113-5442044-6705847 (Sonia)", "Pedido n.º 113-5442044-6705847 (Sonia)", 10.69, 0.70, 8.00, 17.99, "Julio-26"},
		{"Antonio/Sonia", "Pedido n.º 113-8032908-0321067", "Pedido n.º 113-8032908-0321067", 9.87, 0.65, 5.00, 14.22, "Julio-26"},
		{"Yo", "Pedido n.º 113-2762984-9750611", "Pedido n.º 113-2762984-9750611", 64.17, 4.20, 10.50, 70.47, "Julio-26"},
		{"Mama", "Pedido n.º 112-5683510-2489856", "Pedido n.º 112-5683510-2489856", 18.73, 1.23, 5.50, 23.00, "Julio-26"},
		{"Yo", "Pedido n.º 112-3028324-3271469", "Pedido n.º 112-3028324-3271469", 7.48, 0.49, 0.00, 6.99, "Agosto-26"},
		{"Vale", "Pedido n.º 112-1587329-1532246", "Pedido n.º 112-1587329-1532246", 59.97, 0.00, 0.00, 59.97, "Agosto-26"},
		{"Antonio/Sonia", "Pedido n.º 112-6323375-4360265", "Pedido n.º 112-6323375-4360265", 15.17, 0.00, 0.00, 15.17, "Agosto-26"},
		{"Papa", "Pedido n.º 112-4560122-2392227", "Pedido n.º 112-4560122-2392227", 19.99, 0.00, 0.00, 19.99, "Agosto-26"},
		{"Vale", "Pedido n.º 113-4750100-0765027", "Pedido n.º 113-4750100-0765027", 32.23, 0.00, 0.00, 32.23, "Agosto-26"},
	}

	purchaseIDByOrderNumber := make(map[string]string)
	for _, item := range purchases {
		person, exists := personMap[item.PersonName]
		if !exists {
			continue
		}

		newItem := &domain.PurchaseItem{
			ID:           uuid.New().String(),
			PersonID:     person.ID,
			PersonName:   person.Name,
			OrderNumber:  item.OrderNumber,
			Description:  item.Description,
			ItemAmount:   item.Amount,
			TaxAmount:    item.Tax,
			ShippingCost: item.Shipping,
			TotalCost:    item.TotalCost,
			DetailPeriod: item.DetailPeriod,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		}
		_ = service.debtRepo.SavePurchase(ctx, newItem)
		purchaseIDByOrderNumber[newItem.OrderNumber] = newItem.ID
		person.TotalOwed += newItem.TotalCost
	}

	for _, person := range personMap {
		person.RecalculateBalance()
		_ = service.debtRepo.SavePerson(ctx, person)
	}

	packages := []struct {
		OrderNumber    string
		TrackingNumber string
		Cost           float64
		ItemDesc       string
		Received       bool
		DispatchDate   string
		BatchMonth     string
	}{
		{"Pedido n.º 112-1133266-2328259", "TBA332820188579", 5.00, "TBA332820188579", true, "Viernes 17", "Julio-26"},
		{"Pedido n.º 112-1133266-2328259", "TBA332803567087", 5.00, "TBA332803567087", true, "Viernes 17", "Julio-26"},
		{"Pedido n.º 112-1133266-2328259", "TBA332804016774", 12.50, "TBA332804016774", true, "Viernes 17", "Julio-26"},
		{"Pedido n.º 112-1133266-2328259", "TBA332802961657", 5.00, "TBA332802961657", true, "Viernes 17", "Julio-26"},
		{"Pedido n.º 112-1133266-2328259", "TBA332810041723", 6.00, "TBA332810041723", true, "Viernes 17", "Julio-26"},
		{"Pedido n.º 112-0540974-2959424", "1ZA0964A0127154917", 8.00, "1ZA0964A0127154917", true, "Viernes 17", "Julio-26"},
		{"Kindle/Forro/Cubito", "TBA332757350802", 5.00, "Kindle", true, "Viernes 17", "Julio-26"},
		{"Pedido n.º 113-5442044-6705847 (Sonia)", "TBA332866900956", 8.00, "Almohadillas de ejercicio", true, "Viernes 17", "Julio-26"},
		{"Pedido n.º 113-5442044-6705847 (Vale)", "TBA332866900956", 8.00, "Sueter", true, "Viernes 17", "Julio-26"},
		{"Pedido n.º 113-8032908-0321067", "9402250206218380683005", 5.00, "Bar Keepers", true, "Viernes 24", "Julio-26"},
		{"Pedido n.º 113-5442044-6705847 (Vale)", "TBA332882466250", 8.00, "Zapatillas", true, "Viernes 24", "Julio-26"},
		{"Pedido n.º 113-2762984-9750611", "TBA332865186256", 10.50, "Pantalones", true, "Viernes 17", "Julio-26"},
		{"Pedido n.º 113-5442044-6705847 (Vale)", "TBA332874170414", 8.50, "Short/Pantalon", true, "Viernes 17", "Julio-26"},
		{"Pedido n.º 112-5683510-2489856", "TBA333004821680", 5.50, "Detalle", true, "Viernes 24", "Julio-26"},
		{"Pedido n.º 112-3028324-3271469", "TBA333435597247", 0.00, "Correa Kindle", false, "", "Agosto-26"},
		{"Pedido n.º 112-1587329-1532246", "TBA333438874067", 0.00, "Zapatos Vale", false, "", "Agosto-26"},
		{"Pedido n.º 112-6323375-4360265", "526857417700", 0.00, "Cinturon Antonio", false, "", "Agosto-26"},
	}

	for _, pkg := range packages {
		newPkg := &domain.ShippingPackage{
			ID:                uuid.New().String(),
			PurchaseItemID:    purchaseIDByOrderNumber[pkg.OrderNumber],
			OrderNumber:       pkg.OrderNumber,
			TrackingNumber:    pkg.TrackingNumber,
			ShippingCost:      pkg.Cost,
			ItemDescription:   pkg.ItemDesc,
			WarehouseReceived: pkg.Received,
			DispatchDate:      pkg.DispatchDate,
			BatchMonth:        pkg.BatchMonth,
			CreatedAt:         time.Now(),
		}
		_ = service.debtRepo.SavePackage(ctx, newPkg)
	}

	return nil
}

func (service *DebtService) ProcessInvoiceUpload(ctx context.Context, fileBytes []byte, filename string) (*ports.ParseInvoiceResult, error) {
	parsedData := pdf.ParseInvoiceContent(fileBytes)

	result := &ports.ParseInvoiceResult{
		OrderNumber:  parsedData.OrderNumber,
		Description:  parsedData.Description,
		ItemAmount:   parsedData.ItemAmount,
		TaxAmount:    parsedData.TaxAmount,
		ShippingCost: parsedData.ShippingCost,
		TotalCost:    parsedData.TotalCost,
		Matched:      false,
	}

	if parsedData.OrderNumber != "" {
		matchedItem, err := service.debtRepo.FindPurchaseItemByOrderNumber(ctx, parsedData.OrderNumber)
		if err == nil && matchedItem != nil {
			result.Matched = true
			result.MatchedPurchaseItem = matchedItem
		}
	}

	return result, nil
}

func (service *DebtService) ConfirmAttachInvoice(ctx context.Context, purchaseID string, invoiceFilename string, mode string) (*domain.PurchaseItem, error) {
	item, err := service.debtRepo.FindPurchaseByID(ctx, purchaseID)
	if err != nil || item == nil {
		return nil, domain.ErrPurchaseItemNotFound
	}

	if mode == "append" && item.InvoiceURL != "" {
		item.InvoiceURL = item.InvoiceURL + ", " + invoiceFilename
	} else {
		item.InvoiceURL = invoiceFilename
	}

	err = service.debtRepo.SavePurchase(ctx, item)
	if err != nil {
		return nil, err
	}

	return item, nil
}

func (service *DebtService) SearchOrders(ctx context.Context, query string, user *domain.User, limit int) ([]*ports.SearchResult, error) {
	var personIDs []string
	if user.Role != domain.RoleAdmin {
		var err error
		personIDs, err = service.userRepo.GetAssignedPersonIDs(ctx, user.ID)
		if err != nil {
			return nil, err
		}
		// If a standard user has no assigned persons, they shouldn't see any results
		if len(personIDs) == 0 {
			return []*ports.SearchResult{}, nil
		}
	}

	if service.searcher == nil {
		return []*ports.SearchResult{}, nil
	}
	return service.searcher.SearchOrders(ctx, query, personIDs, limit)
}

func (service *DebtService) logAudit(ctx context.Context, action string, entityType string, entityID string, details string) {
	if service.auditRepo == nil {
		return
	}
	userObj := ctx.Value("user")
	if userObj == nil {
		return
	}
	user, ok := userObj.(*domain.User)
	if !ok || user == nil {
		return
	}

	auditLog := &domain.AuditLog{
		ID:         uuid.New().String(),
		UserID:     user.ID,
		UserEmail:  user.Email,
		Action:     action,
		EntityType: entityType,
		EntityID:   entityID,
		Details:    details,
		CreatedAt:  time.Now(),
	}

	_ = service.auditRepo.SaveAuditLog(ctx, auditLog)
}

func (service *DebtService) GetAuditLogs(ctx context.Context, limit int, offset int) ([]*domain.AuditLog, error) {
	if service.auditRepo == nil {
		return nil, nil
	}
	return service.auditRepo.GetAuditLogs(ctx, limit, offset)
}
