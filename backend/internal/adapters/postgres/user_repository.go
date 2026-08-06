package postgres

import (
	"context"
	"errors"

	"debtcontrol/backend/internal/core/domain"

	"gorm.io/gorm"
)

type UserRepository struct {
	databaseConnection *gorm.DB
}

func NewUserRepository(databaseConnection *gorm.DB) *UserRepository {
	return &UserRepository{
		databaseConnection: databaseConnection,
	}
}

func (repository *UserRepository) Create(ctx context.Context, user *domain.User) error {
	userModel := &UserModel{
		ID:           user.ID,
		Email:        user.Email,
		PasswordHash: user.PasswordHash,
		FullName:     user.FullName,
		Role:         string(user.Role),
		CreatedAt:    user.CreatedAt,
		UpdatedAt:    user.UpdatedAt,
	}
	return repository.databaseConnection.WithContext(ctx).Create(userModel).Error
}

func (repository *UserRepository) FindByEmail(ctx context.Context, email string) (*domain.User, error) {
	var userModel UserModel
	err := repository.databaseConnection.WithContext(ctx).Where("email = ?", email).First(&userModel).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &domain.User{
		ID:           userModel.ID,
		Email:        userModel.Email,
		PasswordHash: userModel.PasswordHash,
		FullName:     userModel.FullName,
		Role:         domain.UserRole(userModel.Role),
		CreatedAt:    userModel.CreatedAt,
		UpdatedAt:    userModel.UpdatedAt,
	}, nil
}

func (repository *UserRepository) FindByID(ctx context.Context, id string) (*domain.User, error) {
	var userModel UserModel
	err := repository.databaseConnection.WithContext(ctx).Where("id = ?", id).First(&userModel).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &domain.User{
		ID:           userModel.ID,
		Email:        userModel.Email,
		PasswordHash: userModel.PasswordHash,
		FullName:     userModel.FullName,
		Role:         domain.UserRole(userModel.Role),
		CreatedAt:    userModel.CreatedAt,
		UpdatedAt:    userModel.UpdatedAt,
	}, nil
}
