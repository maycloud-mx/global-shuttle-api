-- Development seed: create the initial administration authorization catalog
-- and grant the role assigned to the bootstrap administrator every
-- menu/action combination. It is safe to execute more than once.
-- Because permissions belong to roles, every user with the same role receives
-- the same access.

INSERT INTO modules
  (name, code, description, icon, sort_order, is_active, created_at, updated_at)
VALUES
  ('Administration', 'administration', 'Administrative panel', 'settings', 1, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON DUPLICATE KEY UPDATE
  is_active = TRUE,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO modules
  (name, code, description, icon, sort_order, is_active, created_at, updated_at)
VALUES
  ('Catalogs', 'catalogs', 'System catalogs', 'book-open', 2, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON DUPLICATE KEY UPDATE
  is_active = TRUE,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO menus
  (module_id, parent_id, name, code, route, icon, sort_order, is_visible, is_active, created_at, updated_at)
SELECT id, NULL, 'Users', 'users', '/users', 'users', 1, TRUE, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM modules
WHERE code = 'administration'
ON DUPLICATE KEY UPDATE
  is_active = TRUE,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO menus
  (module_id, parent_id, name, code, route, icon, sort_order, is_visible, is_active, created_at, updated_at)
SELECT id, NULL, 'Currencies', 'currencies', '/currencies', 'coins', 1, TRUE, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM modules
WHERE code = 'catalogs'
ON DUPLICATE KEY UPDATE
  is_active = TRUE,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO menus
  (module_id, parent_id, name, code, route, icon, sort_order, is_visible, is_active, created_at, updated_at)
SELECT id, NULL, 'Roles and permissions', 'roles', '/roles', 'shield', 2, TRUE, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM modules
WHERE code = 'administration'
ON DUPLICATE KEY UPDATE
  is_active = TRUE,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO actions
  (name, code, description, is_active, created_at, updated_at)
VALUES
  ('List', 'list', 'List records', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('View', 'view', 'View a record', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Create', 'create', 'Create a record', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Update', 'update', 'Update a record', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Change status', 'change-status', 'Activate or deactivate a record', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Manage permissions', 'manage-permissions', 'Assign permissions to a role', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON DUPLICATE KEY UPDATE
  is_active = TRUE,
  updated_at = CURRENT_TIMESTAMP;

INSERT IGNORE INTO role_menu_actions (role_id, menu_id, action_id, created_at)
SELECT admin.role_id, menus.id, actions.id, CURRENT_TIMESTAMP
FROM users AS admin
CROSS JOIN menus
CROSS JOIN actions
WHERE admin.username = 'admin';
