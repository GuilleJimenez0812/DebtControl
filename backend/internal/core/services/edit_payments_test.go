package services_test

import (
	"context"
	"testing"

	"debtcontrol/backend/internal/core/domain"
	"debtcontrol/backend/internal/core/services"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Bug report: open an order's edit, click save without changing anything ->
// all the person's payments become 0.
//
// Root cause: a person with recorded paids that exist ONLY as the denormalized
// persons.total_paid column (no matching payment_transactions rows) has that
// denormalized value recomputed to the transaction sum (zero) by
// RecalculateAllBalances, which runs on every purchase edit.
func TestUpdatePurchaseItem_DoesNotWipeOrphanedPersonPayments(t *testing.T) {
	repo := newFakeDebtRepository()
	audit := &fakeAuditRepository{}

	p := domain.NewPerson("p1", "Mama")
	p.TotalPaid = 7.95
	require.NoError(t, repo.SavePerson(context.Background(), p))

	order, err := domain.NewPurchaseItem("o1", p.ID, p.Name, "Aparato", "Aparato", 100.0, 6.5, 10.0, "Julio-26")
	require.NoError(t, err)
	require.NoError(t, repo.SavePurchase(context.Background(), order))

	service := services.NewDebtService(repo, audit, &fakeUserRepository{}, repo)

	_, err = service.UpdatePurchaseItem(context.Background(), order.ID, order.ItemAmount, order.TaxAmount, order.ShippingCost, "", order.DetailPeriod)
	require.NoError(t, err)

	got, err := repo.FindPersonByID(context.Background(), p.ID)
	require.NoError(t, err)
	assert.Equal(t, 7.95, got.TotalPaid, "editing an order must not wipe a person's recorded payments")
}
