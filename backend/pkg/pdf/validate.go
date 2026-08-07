package pdf

import (
	"errors"
	"os"
	"strings"

	pdfReader "github.com/ledongthuc/pdf"
)

// MaxInvoiceUploadSize caps the size of an uploaded invoice to protect the
// server from memory exhaustion (the parser holds the file in memory).
const MaxInvoiceUploadSize = 5 * 1024 * 1024 // 5 MB

var (
	ErrInvoicesTooLarge = errors.New("invoice file exceeds the 5MB maximum")
	ErrInvalidPDFName   = errors.New("only PDF invoice files are accepted (filename must end in .pdf)")
	ErrInvalidPDFHeader = errors.New("file is not a valid PDF (missing %PDF- header)")
	ErrUnparseablePDF   = errors.New("file is not a structurally valid PDF")
	ErrSuspiciousPDF    = errors.New("invoice contains embedded code and was rejected")
)

// forbiddenPDFTokens are streams/actions that can make a PDF carry executable
// content (embedded JS, OpenAction, automatic launch). Their presence is a
// strong signal of a malicious PDF and the upload is rejected.
var forbiddenPDFTokens = []string{
	"/Launch",
	"/JavaScript",
	"/JS ",
	"/OpenAction",
	"/Movie",
	"/RichMedia",
	"/AcroForm",
}

// ValidateInvoiceUpload enforces the upload policy against both what the
// client claims (the filename) and the file contents (magic bytes, structural
// validity, absence of embedded executable content). The Content-Type the
// client sends is never trusted.
func ValidateInvoiceUpload(filename string, content []byte) error {
	if len(content) > MaxInvoiceUploadSize {
		return ErrInvoicesTooLarge
	}

	if !strings.HasSuffix(strings.ToLower(filename), ".pdf") {
		return ErrInvalidPDFName
	}

	if !hasPDFHeader(content) {
		return ErrInvalidPDFHeader
	}

	if err := validateStructure(content); err != nil {
		return err
	}

	return rejectSuspiciousContent(content)
}

func hasPDFHeader(content []byte) bool {
	return len(content) >= 5 && string(content[:5]) == "%PDF-"
}

// validateStructure confirms the PDF reader can open the file and that it
// exposes at least one page, mirroring how real invoices are parsed.
func validateStructure(content []byte) error {
	tmpFile, err := os.CreateTemp("", "invoice-*.pdf")
	if err != nil {
		return ErrUnparseablePDF
	}
	defer os.Remove(tmpFile.Name())

	if _, err := tmpFile.Write(content); err != nil {
		_ = tmpFile.Close()
		return ErrUnparseablePDF
	}
	if err := tmpFile.Close(); err != nil {
		return ErrUnparseablePDF
	}

	f, reader, err := pdfReader.Open(tmpFile.Name())
	if err != nil {
		return ErrUnparseablePDF
	}
	defer f.Close()

	if reader.NumPage() == 0 {
		return ErrUnparseablePDF
	}
	return nil
}

func rejectSuspiciousContent(content []byte) error {
	lower := strings.ToLower(string(content))
	for _, token := range forbiddenPDFTokens {
		if strings.Contains(lower, strings.ToLower(token)) {
			return ErrSuspiciousPDF
		}
	}
	return nil
}
