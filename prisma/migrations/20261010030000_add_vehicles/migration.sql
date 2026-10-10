CREATE TABLE `vehicles` (
  `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `min_pax` INTEGER UNSIGNED NOT NULL,
  `max_pax` INTEGER UNSIGNED NOT NULL,
  `luggage_capacity` INTEGER UNSIGNED NOT NULL,
  `description_es` TEXT NULL,
  `description_en` TEXT NULL,
  `image` TEXT NULL,
  `status` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  UNIQUE INDEX `vehicles_name_key`(`name`),
  UNIQUE INDEX `vehicles_code_key`(`code`),
  INDEX `vehicles_status_idx`(`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
