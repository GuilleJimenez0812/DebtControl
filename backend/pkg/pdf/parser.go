package pdf

import (
	"bytes"
	"fmt"
	"log"
	"os"
	"regexp"
	"strconv"
	"strings"

	pdfReader "github.com/ledongthuc/pdf"
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
	amazonOrderRegex = regexp.MustCompile(`\b1\d{2}-\d{7}-\d{7}\b`)
	orderNumberRegex = regexp.MustCompile(`(?i)(?:N\.?[ºo°]\s*de\s*pedido|Order\s*#|Order\s*ID|nº\s*pedido|Pedido)\s*[:=]?\s*([A-Za-z0-9-]+)`)
)


func ParseInvoiceContent(content []byte) *ParsedInvoiceData {
	text := extractTextFromPDF(content)
	data := &ParsedInvoiceData{}

	// Debug: log first 2000 chars of extracted text
	debugText := text
	if len(debugText) > 2000 {
		debugText = debugText[:2000]
	}
	log.Printf("[PDF_PARSER] Extracted text (%d chars):\n%s", len(text), debugText)

	// Match Order Number
	if match := amazonOrderRegex.FindString(text); match != "" {
		data.OrderNumber = match
	} else if matches := orderNumberRegex.FindStringSubmatch(text); len(matches) > 1 {
		data.OrderNumber = strings.TrimSpace(matches[1])
	}

	// Line-by-line extraction for amounts.
	// The PDF library separates labels and amounts onto different lines, e.g.:
	//   Productos:
	//   US$6.99
	//   Impuestos:
	//   US$0.49
	//   Total (I.V.A. Incluido):
	//   US$7.48
	lines := strings.Split(text, "\n")
	amountRe := regexp.MustCompile(`(?:US\s*)?\$\s*([0-9,]+\.[0-9]{2})`)

	for i, line := range lines {
		lower := strings.ToLower(strings.TrimSpace(line))

		// Look for the amount on the same line or the next line
		findAmount := func() float64 {
			// Try same line first
			if m := amountRe.FindStringSubmatch(line); len(m) > 1 {
				return parseMoney(m[1])
			}
			// Try next line
			if i+1 < len(lines) {
				if m := amountRe.FindStringSubmatch(lines[i+1]); len(m) > 1 {
					return parseMoney(m[1])
				}
			}
			return 0
		}

		// "Total (I.V.A. Incluido):" — must match before plain "Total"
		if strings.Contains(lower, "i.v.a.") || strings.Contains(lower, "iva") {
			if strings.Contains(lower, "total") {
				val := findAmount()
				if val > 0 {
					data.TotalCost = val
				}
				continue
			}
		}

		// "Total antes de impuestos:" — skip (this is the subtotal before tax)
		if strings.Contains(lower, "total antes de") {
			continue
		}

		// "Impuestos:" (standalone, not "Total antes de impuestos")
		if strings.Contains(lower, "impuesto") && !strings.Contains(lower, "antes") {
			val := findAmount()
			if val > 0 {
				data.TaxAmount = val
			}
			continue
		}

		// "Productos:" / "Subtotal"
		if strings.Contains(lower, "productos") || (strings.Contains(lower, "subtotal") && !strings.Contains(lower, "antes")) {
			val := findAmount()
			if val > 0 {
				data.ItemAmount = val
			}
			continue
		}

		// "Envío:" / "Shipping"
		if strings.Contains(lower, "envío") || strings.Contains(lower, "envio") || strings.Contains(lower, "shipping") {
			val := findAmount()
			if val > 0 {
				data.ShippingCost = val
			}
			continue
		}

		// Generic "Total" (fallback) — only if we haven't found one yet
		if data.TotalCost == 0 && strings.Contains(lower, "total") && !strings.Contains(lower, "antes") {
			val := findAmount()
			if val > 0 {
				data.TotalCost = val
			}
		}
	}

	// If no Productos match, derive from Total - Tax
	if data.ItemAmount == 0 && data.TotalCost > 0 {
		data.ItemAmount = data.TotalCost - data.TaxAmount
		if data.ItemAmount < 0 {
			data.ItemAmount = 0
		}
	}

	if data.TotalCost == 0 {
		data.TotalCost = data.ItemAmount + data.TaxAmount + data.ShippingCost
	}

	// Extract clean product description
	data.Description = extractShortProductDescription(text, data.OrderNumber)

	return data
}


func parseMoney(s string) float64 {
	s = strings.ReplaceAll(s, ",", "")
	s = strings.TrimSpace(s)
	val, _ := strconv.ParseFloat(s, 64)
	return val
}

func extractTextFromPDF(content []byte) string {
	// Write content to a temp file for the PDF library
	tmpFile, err := os.CreateTemp("", "invoice-*.pdf")
	if err != nil {
		return fallbackTextExtraction(content)
	}
	defer os.Remove(tmpFile.Name())

	if _, err := tmpFile.Write(content); err != nil {
		tmpFile.Close()
		return fallbackTextExtraction(content)
	}
	tmpFile.Close()

	// Use ledongthuc/pdf to read the PDF
	f, reader, err := pdfReader.Open(tmpFile.Name())
	if err != nil {
		return fallbackTextExtraction(content)
	}
	defer f.Close()

	var sb strings.Builder
	totalPages := reader.NumPage()
	for i := 1; i <= totalPages; i++ {
		page := reader.Page(i)
		if page.V.IsNull() {
			continue
		}
		text, err := page.GetPlainText(nil)
		if err == nil && len(text) > 0 {
			sb.WriteString(text)
			sb.WriteString("\n")
		}
	}

	result := sb.String()
	if len(strings.TrimSpace(result)) < 10 {
		return fallbackTextExtraction(content)
	}
	return result
}

// fallbackTextExtraction is a last-resort raw byte scan for when
// the PDF library can't parse the file
func fallbackTextExtraction(content []byte) string {
	var buf bytes.Buffer
	buf.Write(content)
	raw := buf.String()

	// Extract parenthesized PDF text tokens
	reToken := regexp.MustCompile(`\(([^)]{2,})\)`)
	matches := reToken.FindAllStringSubmatch(raw, -1)

	var sb strings.Builder
	for _, m := range matches {
		if len(m) > 1 {
			token := m[1]
			// Skip binary-looking tokens
			if isBinaryGarbage(token) {
				continue
			}
			sb.WriteString(token)
			sb.WriteString("\n")
		}
	}

	// Also scan raw lines
	for _, line := range strings.Split(raw, "\n") {
		cleaned := strings.TrimSpace(line)
		if len(cleaned) > 3 && !isBinaryGarbage(cleaned) {
			sb.WriteString(cleaned)
			sb.WriteString("\n")
		}
	}

	return sb.String()
}

func isBinaryGarbage(s string) bool {
	nonPrintable := 0
	total := len(s)
	if total == 0 {
		return true
	}
	for _, r := range s {
		if r < 32 || r > 126 {
			nonPrintable++
		}
	}
	// If more than 30% non-printable, it's garbage
	return float64(nonPrintable)/float64(total) > 0.3
}

func extractShortProductDescription(text string, orderNumber string) string {
	noiseKeywords := []string{
		"resumen del pedido", "pedido realizado", "enviar a", "método de pago",
		"ver transacciones", "productos:", "envío:", "total antes de", "impuestos:",
		"total (", "total:", "entregado", "se entregó", "vendido por", "devolver o reemplazar",
		"elegible hasta", "inicio de página", "condiciones de uso", "aviso de privacidad",
		"amazon.com", "detalles del pedido", "http", "us$", "mastercard",
		"i.v.a.", "incluido", "subtotal", "grand total", "resumen",
		"n.º de pedido", "n.o de pedido", "estados unidos", "recepcionista",
		"que termina en",
	}

	isNoiseLine := func(lower string) bool {
		for _, kw := range noiseKeywords {
			if strings.Contains(lower, kw) {
				return true
			}
		}
		return false
	}

	isProductCandidate := func(trimmed string) bool {
		if len(trimmed) < 15 {
			return false
		}
		// Must start with a letter
		if !regexp.MustCompile(`^[A-Za-z]`).MatchString(trimmed) {
			return false
		}
		// Must contain at least one lowercase letter (filter ALL-CAPS like MIAMI)
		if !regexp.MustCompile(`[a-z]`).MatchString(trimmed) {
			return false
		}
		// Skip short name-like lines (2-3 words, all capitalized first letters)
		words := strings.Fields(trimmed)
		if len(words) <= 3 {
			allCapFirst := true
			for _, w := range words {
				if len(w) > 0 && (w[0] < 'A' || w[0] > 'Z') {
					allCapFirst = false
				}
			}
			if allCapFirst && len(trimmed) < 30 {
				return false // Likely a person name
			}
		}
		return true
	}

	truncate := func(s string) string {
		if len(s) > 60 {
			return s[:57] + "..."
		}
		return s
	}

	lines := strings.Split(text, "\n")

	// Strategy 1: Find product lines after "Entregado" / "Delivered" section
	foundDelivery := false
	for _, l := range lines {
		trimmed := strings.TrimSpace(l)
		lower := strings.ToLower(trimmed)

		if strings.Contains(lower, "entregado") || strings.Contains(lower, "delivered") {
			foundDelivery = true
			continue
		}
		if !foundDelivery {
			continue
		}
		if isNoiseLine(lower) {
			continue
		}
		if isProductCandidate(trimmed) {
			return truncate(trimmed)
		}
	}

	// Strategy 2: Fallback scan for any product-like line
	for _, l := range lines {
		trimmed := strings.TrimSpace(l)
		lower := strings.ToLower(trimmed)
		if isNoiseLine(lower) {
			continue
		}
		if isProductCandidate(trimmed) {
			return truncate(trimmed)
		}
	}

	if orderNumber != "" {
		return fmt.Sprintf("Orden %s", orderNumber)
	}
	return "Pedido de Amazon"
}

