package postgres

import (
	"context"

	"debtcontrol/backend/internal/core/domain"
	"debtcontrol/backend/internal/core/ports"

	"gorm.io/gorm"
)

type AuditRepository struct {
	db *gorm.DB
}

func NewAuditRepository(db *gorm.DB) ports.AuditRepository {
	return &AuditRepository{db: db}
}

func (r *AuditRepository) SaveAuditLog(ctx context.Context, log *domain.AuditLog) error {
	model := AuditLogModel{
		ID:         log.ID,
		UserID:     log.UserID,
		UserEmail:  log.UserEmail,
		Action:     log.Action,
		EntityType: log.EntityType,
		EntityID:   log.EntityID,
		Details:    log.Details,
		CreatedAt:  log.CreatedAt,
	}
	return r.db.WithContext(ctx).Create(&model).Error
}

func (r *AuditRepository) GetAuditLogs(ctx context.Context, limit int, offset int) ([]*domain.AuditLog, error) {
	var models []AuditLogModel
	query := r.db.WithContext(ctx).Order("created_at desc")
	
	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}

	if err := query.Find(&models).Error; err != nil {
		return nil, err
	}

	var logs []*domain.AuditLog
	for _, m := range models {
		logs = append(logs, &domain.AuditLog{
			ID:         m.ID,
			UserID:     m.UserID,
			UserEmail:  m.UserEmail,
			Action:     m.Action,
			EntityType: m.EntityType,
			EntityID:   m.EntityID,
			Details:    m.Details,
			CreatedAt:  m.CreatedAt,
		})
	}

	return logs, nil
}
