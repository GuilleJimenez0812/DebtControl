package services_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"debtcontrol/backend/internal/core/domain"
	"debtcontrol/backend/internal/core/ports"
	"debtcontrol/backend/internal/core/services"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type fakeDebtRepository struct {
	persons       map[string]*domain.Person
	purchases     map[string]*domain.PurchaseItem
	deletedPurchases map[string]bool
	payments      map[string]*domain.PaymentTransaction
	packages      map[string]*domain.ShippingPackage
	deletedPackages map[string]bool
}

func newFakeDebtRepository() *fakeDebtRepository {
	return &fakeDebtRepository{
		persons:          make(map[string]*domain.Person),
		purchases:        make(map[string]*domain.PurchaseItem),
		deletedPurchases: make(map[string]bool),
		payments:         make(map[string]*domain.PaymentTransaction),
		packages:         make(map[string]*domain.ShippingPackage),
		deletedPackages:  make(map[string]bool),
	}
}

func (fake *fakeDebtRepository) RunInTransaction(ctx context.Context, fn func(ctx context.Context) error) error {
	return fn(ctx)
}

func (fake *fakeDebtRepository) FindAllPersons(_ context.Context) ([]*domain.Person, error) {
	persons := make([]*domain.Person, 0, len(fake.persons))
	for _, person := range fake.persons {
		persons = append(persons, person)
	}
	return persons, nil
}

func (fake *fakeDebtRepository) FindPersonByID(_ context.Context, id string) (*domain.Person, error) {
	return fake.persons[id], nil
}

func (fake *fakeDebtRepository) SavePerson(_ context.Context, person *domain.Person) error {
	fake.persons[person.ID] = person
	return nil
}

func (fake *fakeDebtRepository) FindAllPurchases(_ context.Context) ([]*domain.PurchaseItem, error) {
	purchases := make([]*domain.PurchaseItem, 0, len(fake.purchases))
	for _, purchase := range fake.purchases {
		if fake.deletedPurchases[purchase.ID] {
			continue
		}
		purchases = append(purchases, purchase)
	}
	return purchases, nil
}

func (fake *fakeDebtRepository) FindPurchaseByID(_ context.Context, id string) (*domain.PurchaseItem, error) {
	if fake.deletedPurchases[id] {
		return nil, nil
	}
	return fake.purchases[id], nil
}

func (fake *fakeDebtRepository) FindPurchaseItemByOrderNumber(_ context.Context, orderNumber string) (*domain.PurchaseItem, error) {
	for _, purchase := range fake.purchases {
		if fake.deletedPurchases[purchase.ID] {
			continue
		}
		if purchase.OrderNumber == orderNumber {
			return purchase, nil
		}
	}
	return nil, nil
}

func (fake *fakeDebtRepository) SavePurchase(_ context.Context, purchase *domain.PurchaseItem) error {
	fake.purchases[purchase.ID] = purchase
	return nil
}

func (fake *fakeDebtRepository) DeletePurchase(_ context.Context, id string) error {
	fake.deletedPurchases[id] = true
	return nil
}

func (fake *fakeDebtRepository) FindPaymentsByPersonID(_ context.Context, personID string) ([]*domain.PaymentTransaction, error) {
	payments := make([]*domain.PaymentTransaction, 0)
	for _, payment := range fake.payments {
		if payment.PersonID == personID {
			payments = append(payments, payment)
		}
	}
	return payments, nil
}

func (fake *fakeDebtRepository) SavePayment(_ context.Context, payment *domain.PaymentTransaction) error {
	fake.payments[payment.ID] = payment
	return nil
}

func (fake *fakeDebtRepository) FindAllPackages(_ context.Context) ([]*domain.ShippingPackage, error) {
	packages := make([]*domain.ShippingPackage, 0, len(fake.packages))
	for _, pkg := range fake.packages {
		if fake.deletedPackages[pkg.ID] {
			continue
		}
		packages = append(packages, pkg)
	}
	return packages, nil
}

func (fake *fakeDebtRepository) FindPackagesByPurchaseID(_ context.Context, purchaseID string) ([]*domain.ShippingPackage, error) {
	packages := make([]*domain.ShippingPackage, 0)
	for _, pkg := range fake.packages {
		if fake.deletedPackages[pkg.ID] {
			continue
		}
		if pkg.PurchaseItemID == purchaseID {
			packages = append(packages, pkg)
		}
	}
	return packages, nil
}

func (fake *fakeDebtRepository) FindPackageByID(_ context.Context, id string) (*domain.ShippingPackage, error) {
	if fake.deletedPackages[id] {
		return nil, nil
	}
	return fake.packages[id], nil
}

func (fake *fakeDebtRepository) SavePackage(_ context.Context, pkg *domain.ShippingPackage) error {
	fake.packages[pkg.ID] = pkg
	return nil
}

func (fake *fakeDebtRepository) DeletePackagesByPurchaseID(_ context.Context, purchaseID string) error {
	for id, pkg := range fake.packages {
		if pkg.PurchaseItemID == purchaseID {
			fake.deletedPackages[id] = true
		}
	}
	return nil
}

func (fake *fakeDebtRepository) SearchOrders(_ context.Context, query string, personIDs []string, limit int) ([]*ports.SearchResult, error) {
	return nil, nil
}

func (fake *fakeDebtRepository) ResetAllData(_ context.Context) error {
	return nil
}

func (fake *fakeDebtRepository) isPurchaseDeleted(id string) bool {
	return fake.deletedPurchases[id]
}

func (fake *fakeDebtRepository) isPackageDeleted(id string) bool {
	return fake.deletedPackages[id]
}

type fakeAuditRepository struct {
	entries []*domain.AuditLog
}

func (fake *fakeAuditRepository) SaveAuditLog(_ context.Context, log *domain.AuditLog) error {
	fake.entries = append(fake.entries, log)
	return nil
}

func (fake *fakeAuditRepository) GetAuditLogs(_ context.Context, _ int, _ int) ([]*domain.AuditLog, error) {
	return fake.entries, nil
}

type fakeUserRepository struct{}

func (fake *fakeUserRepository) Create(_ context.Context, _ *domain.User) error { return nil }
func (fake *fakeUserRepository) Update(_ context.Context, _ *domain.User) error { return nil }
func (fake *fakeUserRepository) FindByEmail(_ context.Context, _ string) (*domain.User, error) {
	return nil, nil
}
func (fake *fakeUserRepository) FindByID(_ context.Context, _ string) (*domain.User, error) {
	return nil, nil
}
func (fake *fakeUserRepository) FindAll(_ context.Context) ([]*domain.User, error) { return nil, nil }
func (fake *fakeUserRepository) EnsureFirstUserIsAdmin(_ context.Context) error   { return nil }
func (fake *fakeUserRepository) AssignPersonsToUser(_ context.Context, _ string, _ []string) error {
	return nil
}
func (fake *fakeUserRepository) GetAssignedPersonIDs(_ context.Context, _ string) ([]string, error) {
	return nil, nil
}

type reassignTestHarness struct {
	service    *services.DebtService
	debtRepo   *fakeDebtRepository
	auditRepo  *fakeAuditRepository
	adminUser  *domain.User
	ctx        context.Context
	personA    *domain.Person
	personB    *domain.Person
	purchase   *domain.PurchaseItem
}

func newReassignTestHarness(t *testing.T) *reassignTestHarness {
	t.Helper()

	debtRepo := newFakeDebtRepository()
	auditRepo := &fakeAuditRepository{}

	personA := domain.NewPerson("person-a", "Alice")
	personB := domain.NewPerson("person-b", "Bob")
	require.NoError(t, debtRepo.SavePerson(context.Background(), personA))
	require.NoError(t, debtRepo.SavePerson(context.Background(), personB))

	purchase, err := domain.NewPurchaseItem("order-1", personA.ID, personA.Name, "ORD-100", "Wireless mouse", 80.0, 5.0, 15.0, "Julio-26")
	require.NoError(t, err)
	require.NoError(t, debtRepo.SavePurchase(context.Background(), purchase))

	adminUser := &domain.User{ID: "admin-1", Email: "admin@example.com", Role: domain.RoleAdmin}
	ctx := context.WithValue(context.Background(), "user", adminUser)

	service := services.NewDebtService(debtRepo, auditRepo, &fakeUserRepository{}, debtRepo)

	return &reassignTestHarness{
		service:   service,
		debtRepo:  debtRepo,
		auditRepo: auditRepo,
		adminUser: adminUser,
		ctx:       ctx,
		personA:   personA,
		personB:   personB,
		purchase:  purchase,
	}
}

func TestReassignPurchaseToPerson_MovesOrderAndRecalculatesBothBalances(t *testing.T) {
	harness := newReassignTestHarness(t)

	secondOrder, err := domain.NewPurchaseItem("order-2", harness.personB.ID, harness.personB.Name, "ORD-200", "Keyboard", 20.0, 2.0, 8.0, "Julio-26")
	require.NoError(t, err)
	require.NoError(t, harness.debtRepo.SavePurchase(context.Background(), secondOrder))

	paymentA := &domain.PaymentTransaction{ID: "pay-a", PersonID: harness.personA.ID, AmountPaid: 50.0, PaymentDate: time.Now()}
	paymentB := &domain.PaymentTransaction{ID: "pay-b", PersonID: harness.personB.ID, AmountPaid: 10.0, PaymentDate: time.Now()}
	require.NoError(t, harness.debtRepo.SavePayment(context.Background(), paymentA))
	require.NoError(t, harness.debtRepo.SavePayment(context.Background(), paymentB))
	require.NoError(t, harness.service.RebalanceAllBalances(context.Background()))

	reassigned, err := harness.service.ReassignPurchaseToPerson(harness.ctx, harness.purchase.ID, harness.personB.ID)
	require.NoError(t, err)
	assert.Equal(t, harness.personB.ID, reassigned.PersonID)
	assert.Equal(t, harness.personB.Name, reassigned.PersonName)

	personA, err := harness.debtRepo.FindPersonByID(context.Background(), harness.personA.ID)
	require.NoError(t, err)
	assert.Equal(t, 0.0, personA.TotalOwed)
	assert.Equal(t, 50.0, personA.TotalPaid)
	assert.Equal(t, 0.0, personA.Balance)
	assert.Equal(t, domain.StatusPaid, personA.Status)

	personB, err := harness.debtRepo.FindPersonByID(context.Background(), harness.personB.ID)
	require.NoError(t, err)
	assert.Equal(t, 30.0+100.0, personB.TotalOwed)
	assert.Equal(t, 10.0, personB.TotalPaid)
	assert.Equal(t, 120.0, personB.Balance)
	assert.Equal(t, domain.StatusPending, personB.Status)
}

func TestReassignPurchaseToPerson_LeavesPaymentsWithOriginalPerson(t *testing.T) {
	harness := newReassignTestHarness(t)

	paymentA := &domain.PaymentTransaction{ID: "pay-a", PersonID: harness.personA.ID, AmountPaid: 80.0, PaymentDate: time.Now()}
	require.NoError(t, harness.debtRepo.SavePayment(context.Background(), paymentA))
	require.NoError(t, harness.service.RebalanceAllBalances(context.Background()))

	_, err := harness.service.ReassignPurchaseToPerson(harness.ctx, harness.purchase.ID, harness.personB.ID)
	require.NoError(t, err)

	personA, err := harness.debtRepo.FindPersonByID(context.Background(), harness.personA.ID)
	require.NoError(t, err)
	assert.Equal(t, 0.0, personA.TotalOwed, "order moved away, so Alice owes nothing")
	assert.Equal(t, 80.0, personA.TotalPaid, "payment stays with Alice")
	assert.Equal(t, domain.StatusPaid, personA.Status, "Alice is overpaid")

	personB, err := harness.debtRepo.FindPersonByID(context.Background(), harness.personB.ID)
	require.NoError(t, err)
	assert.Equal(t, 100.0, personB.TotalOwed)
	assert.Equal(t, 0.0, personB.TotalPaid)
	assert.Equal(t, 100.0, personB.Balance)
}

func TestReassignPurchaseToPerson_UnknownPersonFailsWithoutChanges(t *testing.T) {
	harness := newReassignTestHarness(t)

	_, err := harness.service.ReassignPurchaseToPerson(harness.ctx, harness.purchase.ID, "ghost-person")
	require.Error(t, err)
	assert.True(t, errors.Is(err, domain.ErrPersonNotFound))

	order, err := harness.debtRepo.FindPurchaseByID(context.Background(), harness.purchase.ID)
	require.NoError(t, err)
	assert.Equal(t, harness.personA.ID, order.PersonID)
	assert.Empty(t, harness.auditRepo.entries)
}

func TestReassignPurchaseToPerson_UnknownOrderFails(t *testing.T) {
	harness := newReassignTestHarness(t)

	_, err := harness.service.ReassignPurchaseToPerson(harness.ctx, "missing-order", harness.personB.ID)
	require.Error(t, err)
	assert.True(t, errors.Is(err, domain.ErrPurchaseItemNotFound))
	assert.Empty(t, harness.auditRepo.entries)
}

func TestReassignPurchaseToPerson_DeletedOrderFails(t *testing.T) {
	harness := newReassignTestHarness(t)

	require.NoError(t, harness.debtRepo.DeletePurchase(context.Background(), harness.purchase.ID))

	_, err := harness.service.ReassignPurchaseToPerson(harness.ctx, harness.purchase.ID, harness.personB.ID)
	require.Error(t, err)
	assert.True(t, errors.Is(err, domain.ErrPurchaseItemNotFound))
}

func TestReassignPurchaseToPerson_EmitsAuditUpdateEntry(t *testing.T) {
	harness := newReassignTestHarness(t)

	_, err := harness.service.ReassignPurchaseToPerson(harness.ctx, harness.purchase.ID, harness.personB.ID)
	require.NoError(t, err)

	require.Len(t, harness.auditRepo.entries, 1)
	entry := harness.auditRepo.entries[0]
	assert.Equal(t, "UPDATE", entry.Action)
	assert.Equal(t, "PurchaseItem", entry.EntityType)
	assert.Equal(t, harness.purchase.ID, entry.EntityID)
	assert.Equal(t, harness.adminUser.ID, entry.UserID)
	assert.Contains(t, entry.Details, harness.personA.Name)
	assert.Contains(t, entry.Details, harness.personB.Name)
}

type deleteTestHarness struct {
	service   *services.DebtService
	debtRepo  *fakeDebtRepository
	auditRepo *fakeAuditRepository
	ctx       context.Context
	person    *domain.Person
	purchase  *domain.PurchaseItem
	packages  []*domain.ShippingPackage
}

func newDeleteTestHarness(t *testing.T) *deleteTestHarness {
	t.Helper()

	debtRepo := newFakeDebtRepository()
	auditRepo := &fakeAuditRepository{}

	person := domain.NewPerson("person-a", "Alice")
	require.NoError(t, debtRepo.SavePerson(context.Background(), person))

	purchase, err := domain.NewPurchaseItem("order-1", person.ID, person.Name, "ORD-100", "Wireless mouse", 80.0, 5.0, 15.0, "Julio-26")
	require.NoError(t, err)
	require.NoError(t, debtRepo.SavePurchase(context.Background(), purchase))

	packages := []*domain.ShippingPackage{
		{ID: "pkg-1", PurchaseItemID: purchase.ID, OrderNumber: purchase.OrderNumber, TrackingNumber: "TBA0001", ShippingCost: 8.0},
		{ID: "pkg-2", PurchaseItemID: purchase.ID, OrderNumber: purchase.OrderNumber, TrackingNumber: "TBA0002", ShippingCost: 7.0},
	}
	for _, pkg := range packages {
		require.NoError(t, debtRepo.SavePackage(context.Background(), pkg))
	}

	adminUser := &domain.User{ID: "admin-1", Email: "admin@example.com", Role: domain.RoleAdmin}
	ctx := context.WithValue(context.Background(), "user", adminUser)

	service := services.NewDebtService(debtRepo, auditRepo, &fakeUserRepository{}, debtRepo)

	return &deleteTestHarness{
		service:  service,
		debtRepo: debtRepo,
		auditRepo: auditRepo,
		ctx:      ctx,
		person:   person,
		purchase: purchase,
		packages: packages,
	}
}

func TestDeletePurchase_MarksOrderAndAllPackagesDeleted(t *testing.T) {
	harness := newDeleteTestHarness(t)
	require.NoError(t, harness.service.RebalanceAllBalances(context.Background()))

	err := harness.service.DeletePurchase(harness.ctx, harness.purchase.ID)
	require.NoError(t, err)

	assert.True(t, harness.debtRepo.isPurchaseDeleted(harness.purchase.ID))
	assert.True(t, harness.debtRepo.isPackageDeleted("pkg-1"))
	assert.True(t, harness.debtRepo.isPackageDeleted("pkg-2"))

	person, err := harness.debtRepo.FindPersonByID(context.Background(), harness.person.ID)
	require.NoError(t, err)
	assert.Equal(t, 0.0, person.TotalOwed, "deleted order no longer counts against the person")
}

func TestDeletePurchase_ExcludesDeletedOrderFromReads(t *testing.T) {
	harness := newDeleteTestHarness(t)

	require.NoError(t, harness.service.DeletePurchase(harness.ctx, harness.purchase.ID))

	order, err := harness.debtRepo.FindPurchaseByID(context.Background(), harness.purchase.ID)
	require.NoError(t, err)
	assert.Nil(t, order)

	allOrders, err := harness.debtRepo.FindAllPurchases(context.Background())
	require.NoError(t, err)
	for _, order := range allOrders {
		assert.NotEqual(t, harness.purchase.ID, order.ID)
	}
}

func TestDeletePurchase_UnknownOrderFails(t *testing.T) {
	harness := newDeleteTestHarness(t)

	err := harness.service.DeletePurchase(harness.ctx, "missing-order")
	require.Error(t, err)
	assert.True(t, errors.Is(err, domain.ErrPurchaseItemNotFound))
	assert.Empty(t, harness.auditRepo.entries)
}

func TestDeletePurchase_AlreadyDeletedOrderFails(t *testing.T) {
	harness := newDeleteTestHarness(t)

	require.NoError(t, harness.service.DeletePurchase(harness.ctx, harness.purchase.ID))

	err := harness.service.DeletePurchase(harness.ctx, harness.purchase.ID)
	require.Error(t, err)
	assert.True(t, errors.Is(err, domain.ErrPurchaseItemNotFound))
}

func TestDeletePurchase_NeverTouchesPersonOrPayments(t *testing.T) {
	harness := newDeleteTestHarness(t)

	payment := &domain.PaymentTransaction{ID: "pay-a", PersonID: harness.person.ID, AmountPaid: 40.0, PaymentDate: time.Now()}
	require.NoError(t, harness.debtRepo.SavePayment(context.Background(), payment))

	require.NoError(t, harness.service.DeletePurchase(harness.ctx, harness.purchase.ID))

	person, err := harness.debtRepo.FindPersonByID(context.Background(), harness.person.ID)
	require.NoError(t, err)
	assert.NotNil(t, person, "person must survive the delete")

	payments, err := harness.debtRepo.FindPaymentsByPersonID(context.Background(), harness.person.ID)
	require.NoError(t, err)
	require.Len(t, payments, 1)
	assert.Equal(t, 40.0, payments[0].AmountPaid)
}

func TestDeletePurchase_EmitsAuditDeleteEntry(t *testing.T) {
	harness := newDeleteTestHarness(t)

	require.NoError(t, harness.service.DeletePurchase(harness.ctx, harness.purchase.ID))

	require.Len(t, harness.auditRepo.entries, 1)
	entry := harness.auditRepo.entries[0]
	assert.Equal(t, "DELETE", entry.Action)
	assert.Equal(t, "PurchaseItem", entry.EntityType)
	assert.Equal(t, harness.purchase.ID, entry.EntityID)
	assert.Contains(t, entry.Details, harness.purchase.OrderNumber)
	assert.Contains(t, entry.Details, harness.purchase.Description)
}
