package pdf

import (
	"bytes"
	"regexp"
	"strconv"
	"strings"
)

type ParsedInvoiceData struct {
	OrderNumber  string  `json:"order_number"`
	Description  string  `json:"description"`
	ItemAmount   float64 `json:"item_amount"`
	TaxAmount    float64 `json:"tax_amount"`
	ShippingCost float64 `json:"shipping_cost"`
	TotalCost    float64 `json:"total_cost"`
}

var (
	amazonOrderRegex = regexp.MustCompile(`\b\d{3}-\d{7}-\d{7}\b`)
	orderNumberRegex = regexp.MustCompile(`(?i)(?:N\.º\s*de\s*pedido|Order\s*#|Order\s*ID|nº\s*pedido|Pedido)\s*[:=]?\s*([A-Za-z0-9-]+)`)

	productosRegex = regexp.MustCompile(`(?i)(?:Productos|Items|Subtotal)\s*[:=]?\s*(?:US\s*)?\$?\s*([0-9,]+(?:\.[0-9]{2})?)`)
	impuestosRegex = regexp.MustCompile(`(?i)(?:Impuestos|Tax|Estimated\s*Tax)\s*[:=]?\s*(?:US\s*)?\$?\s*([0-9,]+(?:\.[0-9]{2})?)`)
	envioRegex     = regexp.MustCompile(`(?i)(?:Envío|Shipping|Shipping\s*&\s*Handling)\s*[:=]?\s*(?:US\s*)?\$?\s*([0-9,]+(?:\.[0-9]{2})?)`)
	totalRegex     = regexp.MustCompile(`(?i)(?:Total\s*\(I\.V\.A\.\s*Incluido\)|Total\s*Order|Grand\s*Total|Total)\s*[:=]?\s*(?:US\s*)?\$?\s*([0-9,]+(?:\.[0-9]{2})?)`)
)

func ParseInvoiceContent(content []byte) *ParsedInvoiceData {
	text := extractRawTextFromPDF(content)
	data := &ParsedInvoiceData{}

	// Match Order Number
	if match := amazonOrderRegex.FindString(text); match != "" {
		data.OrderNumber = match
	} else if matches := orderNumberRegex.FindStringSubmatch(text); len(matches) > 1 {
		data.OrderNumber = strings.TrimSpace(matches[1])
	}

	// Match Item Amount (Productos)
	if matches := productosRegex.FindStringSubmatch(text); len(matches) > 1 {
		valStr := strings.ReplaceAll(matches[1], ",", "")
		data.ItemAmount, _ = strconv.ParseFloat(valStr, 64)
	}

	// Match Tax Amount (Impuestos)
	if matches := impuestosRegex.FindStringSubmatch(text); len(matches) > 1 {
		valStr := strings.ReplaceAll(matches[1], ",", "")
		data.TaxAmount, _ = strconv.ParseFloat(valStr, 64)
	}

	// Match Shipping Cost (Envío)
	if matches := envioRegex.FindStringSubmatch(text); len(matches) > 1 {
		valStr := strings.ReplaceAll(matches[1], ",", "")
		data.ShippingCost, _ = strconv.ParseFloat(valStr, 64)
	}

	// Match Total Cost
	if matches := totalRegex.FindStringSubmatch(text); len(matches) > 1 {
		valStr := strings.ReplaceAll(matches[1], ",", "")
		data.TotalCost, _ = strconv.ParseFloat(valStr, 64)
	} else {
		data.TotalCost = data.ItemAmount + data.TaxAmount + data.ShippingCost
	}

	// Extract Description line snippet if present
	lines := strings.Split(text, "\n")
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if len(trimmed) > 10 &&
			!strings.Contains(trimmed, "http") &&
			!strings.Contains(trimmed, "Resumen") &&
			!strings.Contains(trimmed, "Pedido") &&
			!strings.Contains(trimmed, "/Filter") &&
			!strings.Contains(trimmed, "/FlateDecode") &&
			!strings.Contains(trimmed, "/Length") &&
			!strings.Contains(trimmed, "<<") &&
			!strings.Contains(trimmed, ">>") &&
			!strings.Contains(trimmed, "stream") &&
			!strings.Contains(trimmed, "endobj") {
			data.Description = trimmed
			break
		}
	}
	if data.Description == "" || strings.Contains(data.Description, "/Filter") || strings.Contains(data.Description, "<<") {
		data.Description = "Invoice Order " + data.OrderNumber
	}

	return data
}

func extractRawTextFromPDF(content []byte) string {
	var buf bytes.Buffer
	buf.Write(content)
	raw := buf.String()

	// Extract PDF stream parenthesized tokens if present
	reToken := regexp.MustCompile(`\(([^\)]+)\)`)
	matches := reToken.FindAllStringSubmatch(raw, -1)

	var streamText strings.Builder
	for _, match := range matches {
		if len(match) > 1 && len(match[1]) > 1 {
			streamText.WriteString(match[1])
			streamText.WriteString("\n")
		}
	}

	combined := raw + "\n" + streamText.String()
	return combined
}
