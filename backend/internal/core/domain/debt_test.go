package domain_test

import (
	"testing"

	"debtcontrol/backend/internal/core/domain"

	"github.com/stretchr/testify/assert"
)

func TestPersonBalanceCalculation(t *testing.T) {
	person := domain.NewPerson("person-1", "Mama")
	assert.Equal(t, "Mama", person.Name)
	assert.Equal(t, 0.0, person.TotalOwed)
	assert.Equal(t, 0.0, person.TotalPaid)
	assert.Equal(t, domain.StatusPaid, person.Status)

	person.TotalOwed = 30.95
	person.TotalPaid = 7.95
	person.RecalculateBalance()

	assert.Equal(t, 23.00, person.Balance)
	assert.Equal(t, domain.StatusPending, person.Status)

	person.TotalPaid = 30.95
	person.RecalculateBalance()

	assert.Equal(t, 0.0, person.Balance)
	assert.Equal(t, domain.StatusPaid, person.Status)
}

func TestNewPurchaseItemCalculation(t *testing.T) {
	item, err := domain.NewPurchaseItem(
		"item-1",
		"person-1",
		"Mama",
		"Pedido n.º 112-5683510-2489856",
		"Aparato",
		18.73,
		1.23,
		5.50,
		"",
		"Julio-26",
	)

	assert.NoError(t, err)
	assert.NotNil(t, item)
	assert.InDelta(t, 25.46, item.TotalCost, 0.001)
}
