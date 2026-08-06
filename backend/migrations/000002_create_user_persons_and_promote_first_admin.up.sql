-- Up Migration: Create user_persons table and promote first user to admin role

CREATE TABLE IF NOT EXISTS user_persons (
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    person_id VARCHAR(64) NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, person_id)
);

-- Promote the first created user in the database to admin role
UPDATE users SET role = 'admin' WHERE id IN (
    SELECT id FROM users ORDER BY created_at ASC LIMIT 1
);
