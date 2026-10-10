CREATE TABLE `service_types` (
  `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `status` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  UNIQUE INDEX `service_types_name_key`(`name`),
  UNIQUE INDEX `service_types_code_key`(`code`),
  INDEX `service_types_status_idx`(`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `service_types` (`name`, `code`, `status`, `created_at`, `updated_at`)
VALUES
  ('One Way', 'ONE_WAY', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('Round Trip', 'ROUND_TRIP', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));
