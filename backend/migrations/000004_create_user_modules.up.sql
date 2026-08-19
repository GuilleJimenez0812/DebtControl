CREATE TABLE IF NOT EXISTS user_modules (
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    module_name VARCHAR(50) NOT NULL,
    PRIMARY KEY (user_id, module_name)
);

INSERT INTO user_modules (user_id, module_name)
SELECT id, 'amazon' FROM users WHERE role = 'user'
ON CONFLICT DO NOTHING;
