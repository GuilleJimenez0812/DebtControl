package pdf

import (
	"testing"
)

func TestParseInvoiceContentAmazonOrder(t *testing.T) {
	sampleInvoiceText := `
Resumen del pedido
Pedido realizado 4 de agosto de 2026 N.º de pedido 112-3028324-3271469
Enviar a
Guillermo Andres Jimenez
8211 NW 68TH ST 152317
MIAMI, FL 33166-2760
Estados Unidos
Mastercard que termina en 1518
Método de pago
Ver transacciones relacionadas
Productos: US$6.99
Envío: US$0.00
Total antes de impuestos: US$6.99
Impuestos: US$0.49
Total (I.V.A. Incluido): US$7.48
Entregado hoy
Se entregó directamente a un recepcionista o alguien de la recepción.
MoKo Correa de mano suave para Kindle eReaders Fire Tablet de 6-8" Kindle/Kobo/
Vendido por: Amoi Channel
Devolver o reemplazar: Elegible hasta 5 de septiembre de 2026
US$6.99
`

	parsedData := ParseInvoiceContent([]byte(sampleInvoiceText))

	if parsedData.OrderNumber != "112-3028324-3271469" {
		t.Errorf("expected order number 112-3028324-3271469, got %s", parsedData.OrderNumber)
	}

	if parsedData.ItemAmount != 6.99 {
		t.Errorf("expected item amount 6.99, got %f", parsedData.ItemAmount)
	}

	if parsedData.TaxAmount != 0.49 {
		t.Errorf("expected tax amount 0.49, got %f", parsedData.TaxAmount)
	}

	if parsedData.TotalCost != 7.48 {
		t.Errorf("expected total cost 7.48, got %f", parsedData.TotalCost)
	}

	if parsedData.Description != "MoKo Correa de mano suave para Kindle eReaders ..." {
		t.Errorf("expected product description 'MoKo Correa de mano suave para Kindle eReaders ...', got %s", parsedData.Description)
	}
}
