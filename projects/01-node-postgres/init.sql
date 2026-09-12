CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0
);

INSERT INTO items (name, quantity) VALUES
    ('Keyboard', 12),
    ('Mouse', 25),
    ('Monitor', 8);
