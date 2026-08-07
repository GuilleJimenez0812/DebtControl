package pdf

import (
	"bytes"
	"strings"
	"testing"
)

// minimalValidPDF is a tiny but structurally parseable PDF (one page).
var minimalValidPDF = []byte("%PDF-1.4\n" +
	"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n" +
	"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n" +
	"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n" +
	"4 0 obj\n<< /Length 44 >>\nstream\nBT /F1 24 Tf 100 700 Td (Hello) Tj ET\nendstream\nendobj\n" +
	"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n" +
	"xref\n0 6\n" +
	"0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000241 00000 n \n0000000328 00000 n \n" +
	"trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n398\n%%EOF\n")

func TestValidateInvoiceUploadAcceptsValidPDF(t *testing.T) {
	err := ValidateInvoiceUpload("factura.pdf", minimalValidPDF)
	if err != nil {
		t.Fatalf("expected valid PDF to pass, got: %v", err)
	}
}

func TestValidateInvoiceUploadRejectsNonPDFName(t *testing.T) {
	err := ValidateInvoiceUpload("factura.txt", minimalValidPDF)
	if err == nil {
		t.Fatal("expected error for non-.pdf filename")
	}
}

func TestValidateInvoiceUploadRejectsWrongMagicBytes(t *testing.T) {
	// Content-Type can be spoofed; the %PDF- magic bytes are the real gate.
	err := ValidateInvoiceUpload("factura.pdf", []byte("<html><body>not a pdf</body></html>"))
	if err == nil {
		t.Fatal("expected error for content without PDF magic")
	}
}

func TestValidateInvoiceUploadRejectsOversizeFile(t *testing.T) {
	big := make([]byte, MaxInvoiceUploadSize+1)
	copy(big, "%PDF-")
	err := ValidateInvoiceUpload("big.pdf", big)
	if err == nil {
		t.Fatal("expected error for file over 5MB")
	}
}

func TestValidateInvoiceUploadRejectsSuspiciousPDF(t *testing.T) {
	suspicious := bytes.Replace(minimalValidPDF, []byte("/Type /Catalog"), []byte("/Type /Catalog /OpenAction << /S /JavaScript >>"), 1)
	err := ValidateInvoiceUpload("malicious.pdf", suspicious)
	if err == nil {
		t.Fatal("expected error for PDF with embedded JavaScript action")
	}
}

func TestValidateInvoiceUploadRejectsNonStructuralPDF(t *testing.T) {
	err := ValidateInvoiceUpload("broken.pdf", []byte("%PDF-1.4\n1 0 obj\nbroken"))
	if err == nil {
		t.Fatal("expected error for structurally invalid PDF")
	}
}

func TestRejectSuspiciousContentDetectsTokens(t *testing.T) {
	testCases := []string{"/Launch", "/JavaScript", "/JS ", "/OpenAction", "/Movie", "/RichMedia", "/AcroForm"}
	for _, token := range testCases {
		if err := rejectSuspiciousContent([]byte("header " + strings.ToLower(token) + " footer")); err == nil {
			t.Errorf("expected %q token to be rejected", token)
		}
	}
	if err := rejectSuspiciousContent([]byte("ordinary invoice text")); err != nil {
		t.Errorf("expected clean content to pass, got %v", err)
	}
}
