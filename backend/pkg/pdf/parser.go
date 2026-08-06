package pdf

import (
	"bytes"
	"compress/zlib"
	"fmt"
	"io"
	"regexp"
	"strconv"
	"strings"
	"unicode"
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
	orderNumberRegex = regexp.MustCompile(`(?i)(?:N\.?[ºo]\s*de\s*pedido|Order\s*#|Order\s*ID|nº\s*pedido|Pedido)\s*[:=]?\s*([A-Za-z0-9-]+)`)

	productosRegex = regexp.MustCompile(`(?i)(?:Productos|Items|Subtotal)\s*[:=]?\s*(?:US\s*)?\$?\s*([0-9,]+(?:\.[0-9]{2})?)`)
	impuestosRegex = regexp.MustCompile(`(?i)(?:^|\n|\r|\()\s*Impuestos?\s*[:=]?\s*(?:US\s*)?\$?\s*([0-9,]+(?:\.[0-9]{2})?)`)
	envioRegex     = regexp.MustCompile(`(?i)(?:Envío|Shipping|Shipping\s*&\s*Handling)\s*[:=]?\s*(?:US\s*)?\$?\s*([0-9,]+(?:\.[0-9]{2})?)`)
	totalIVARegex  = regexp.MustCompile(`(?i)(?:Total\s*\([^)]*I\.?V\.?A\.?[^)]*\)|Total\s*Order|Grand\s*Total|Total\s*de\s*la\s*orden|Total\s*general)\s*[:=]?\s*(?:US\s*)?\$?\s*([0-9,]+(?:\.[0-9]{2})?)`)
	genericTotalRe = regexp.MustCompile(`(?i)(?:Total)\s*[:=]?\s*(?:US\s*)?\$?\s*([0-9,]+(?:\.[0-9]{2})?)`)
)

func ParseInvoiceContent(content []byte) *ParsedInvoiceData {
	text := extractCleanTextFromPDF(content)
	data := &ParsedInvoiceData{}

	// Match Order Number
	if match := amazonOrderRegex.FindString(text); match != "" {
		data.OrderNumber = match
	} else if matches := orderNumberRegex.FindStringSubmatch(text); len(matches) > 1 {
		data.OrderNumber = strings.TrimSpace(matches[1])
	}

	// Match Tax Amount (Impuestos)
	if matches := impuestosRegex.FindStringSubmatch(text); len(matches) > 1 {
		valStr := strings.ReplaceAll(matches[1], ",", "")
		data.TaxAmount, _ = strconv.ParseFloat(valStr, 64)
	}

	// Match Total Amount (Total (I.V.A. Incluido) or Grand Total)
	if matches := totalIVARegex.FindStringSubmatch(text); len(matches) > 1 {
		valStr := strings.ReplaceAll(matches[1], ",", "")
		data.TotalCost, _ = strconv.ParseFloat(valStr, 64)
	} else if matches := genericTotalRe.FindStringSubmatch(text); len(matches) > 1 {
		valStr := strings.ReplaceAll(matches[1], ",", "")
		data.TotalCost, _ = strconv.ParseFloat(valStr, 64)
	}

	// Match Item Amount (Productos)
	if matches := productosRegex.FindStringSubmatch(text); len(matches) > 1 {
		valStr := strings.ReplaceAll(matches[1], ",", "")
		data.ItemAmount, _ = strconv.ParseFloat(valStr, 64)
	} else if data.TotalCost > 0 {
		data.ItemAmount = data.TotalCost - data.TaxAmount
	}

	// Match Shipping Cost (Envío)
	if matches := envioRegex.FindStringSubmatch(text); len(matches) > 1 {
		valStr := strings.ReplaceAll(matches[1], ",", "")
		data.ShippingCost, _ = strconv.ParseFloat(valStr, 64)
	}

	if data.TotalCost == 0 {
		data.TotalCost = data.ItemAmount + data.TaxAmount + data.ShippingCost
	}

	// Extract Product Short Description
	data.Description = extractShortProductDescription(text, data.OrderNumber)

	return data
}

func extractCleanTextFromPDF(content []byte) string {
	var sb strings.Builder

	// 1. Decompress any zlib /FlateDecode streams in PDF content
	decompressedStreams := decompressPDFStreams(content)
	sb.WriteString(decompressedStreams)
	sb.WriteString("\n")

	// 2. Also process raw content
	sb.Write(content)

	raw := sb.String()

	// 3. Extract text tokens enclosed in parenthesized PDF operators (text)
	var cleanTextBuilder strings.Builder
	reToken := regexp.MustCompile(`\(([^)]+)\)`)
	matches := reToken.FindAllStringSubmatch(raw, -1)
	for _, m := range matches {
		if len(m) > 1 {
			decoded := decodePDFString(m[1])
			if len(decoded) > 0 {
				cleanTextBuilder.WriteString(decoded)
				cleanTextBuilder.WriteString("\n")
			}
		}
	}

	// Also add sanitized raw lines
	lines := strings.Split(raw, "\n")
	for _, l := range lines {
		clean := sanitizeString(l)
		if len(clean) > 0 {
			cleanTextBuilder.WriteString(clean)
			cleanTextBuilder.WriteString("\n")
		}
	}

	return cleanTextBuilder.String()
}

func decompressPDFStreams(content []byte) string {
	var decompressed strings.Builder
	streamStartRe := regexp.MustCompile(`stream[\r\n]+`)
	streamEndRe := regexp.MustCompile(`[\r\n]+endstream`)

	starts := streamStartRe.FindAllIndex(content, -1)
	for _, startLoc := range starts {
		startIdx := startLoc[1]
		endLoc := streamEndRe.FindIndex(content[startIdx:])
		if endLoc == nil {
			continue
		}
		endIdx := startIdx + endLoc[0]
		streamBytes := content[startIdx:endIdx]

		zr, err := zlib.NewReader(bytes.NewReader(streamBytes))
		if err == nil {
			var decompBuf bytes.Buffer
			_, err = io.Copy(&decompBuf, zr)
			_ = zr.Close()
			if err == nil && decompBuf.Len() > 0 {
				decompressed.Write(decompBuf.Bytes())
				decompressed.WriteString("\n")
			}
		}
	}
	return decompressed.String()
}

func decodePDFString(s string) string {
	s = strings.ReplaceAll(s, `\(`, "(")
	s = strings.ReplaceAll(s, `\)`, ")")
	s = strings.ReplaceAll(s, `\\`, "\\")

	// Decode octal escapes e.g. \376\377, \272
	reOctal := regexp.MustCompile(`\\[0-7]{3}`)
	s = reOctal.ReplaceAllStringFunc(s, func(oct string) string {
		val, err := strconv.ParseInt(oct[1:], 8, 32)
		if err == nil {
			return string(rune(val))
		}
		return oct
	})

	var b strings.Builder
	for _, r := range s {
		if r == unicode.ReplacementChar || r == '\uFFFD' {
			continue
		}
		if unicode.IsPrint(r) || r == ' ' || r == '\n' {
			b.WriteRune(r)
		}
	}

	return strings.TrimSpace(b.String())
}

func sanitizeString(s string) string {
	var b strings.Builder
	for _, r := range s {
		if r == unicode.ReplacementChar || r == '\uFFFD' {
			continue
		}
		if unicode.IsPrint(r) || r == '\n' || r == '\t' {
			if r != '%' && r != '\\' && r != '<' && r != '>' && r != '{' && r != '}' {
				b.WriteRune(r)
			}
		}
	}
	return strings.TrimSpace(b.String())
}

func extractShortProductDescription(text string, orderNumber string) string {
	systemNoiseKeywords := []string{
		"resumen del pedido", "pedido realizado", "enviar a", "método de pago",
		"ver transacciones", "productos", "envío", "total antes de", "impuestos",
		"total", "entregado", "se entregó", "vendido por", "devolver o reemplazar",
		"elegible hasta", "inicio de página", "condiciones de uso", "aviso de privacidad",
		"amazon.com", "detalles del pedido", "http", "/filter", "/flatedecode", "stream", "endobj",
		"guillermo", "andres", "jimenez", "miami", "fl ", "estados unidos", "mastercard", "1518", "8211 nw",
		"i.v.a.", "incluido", "subtotal", "grand total",
	}

	lines := strings.Split(text, "\n")
	for _, l := range lines {
		trimmed := strings.TrimSpace(l)
		lower := strings.ToLower(trimmed)

		// Filter out garbage replacement chars or non-alpha starts
		if len(trimmed) < 10 || strings.Contains(trimmed, "\uFFFD") {
			continue
		}

		isNoise := false
		for _, kw := range systemNoiseKeywords {
			if strings.Contains(lower, kw) {
				isNoise = true
				break
			}
		}

		if !isNoise && unicode.IsLetter(rune(trimmed[0])) {
			if len(trimmed) > 50 {
				trimmed = trimmed[:47] + "..."
			}
			return trimmed
		}
	}

	if orderNumber != "" {
		return fmt.Sprintf("Orden %s", orderNumber)
	}
	return "Pedido de Amazon"
}
