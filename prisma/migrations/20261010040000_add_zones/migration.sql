CREATE TABLE `zones` (
  `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `description` TEXT NULL,
  `is_local` BOOLEAN NOT NULL DEFAULT false,
  `status` BOOLEAN NOT NULL DEFAULT true,
  `code_external` VARCHAR(100) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `created_by` INTEGER UNSIGNED NOT NULL,

  UNIQUE INDEX `zones_name_key`(`name`),
  UNIQUE INDEX `zones_code_key`(`code`),
  INDEX `zones_status_idx`(`status`),
  INDEX `zones_is_local_idx`(`is_local`),
  INDEX `zones_created_by_idx`(`created_by`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `zones`
  ADD CONSTRAINT `zones_created_by_fkey`
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
