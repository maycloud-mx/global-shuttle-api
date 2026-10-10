CREATE TABLE `transfer_points` (
  `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
  `zone_id` INTEGER UNSIGNED NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `code_external` VARCHAR(100) NULL,
  `type` ENUM('HOTEL', 'AIRPORT') NOT NULL,
  `latitude` DECIMAL(10, 7) NOT NULL,
  `longitude` DECIMAL(10, 7) NOT NULL,
  `status` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `created_by` INTEGER UNSIGNED NOT NULL,
  `updated_by` INTEGER UNSIGNED NOT NULL,

  UNIQUE INDEX `transfer_points_code_key`(`code`),
  UNIQUE INDEX `transfer_points_zone_id_name_key`(`zone_id`, `name`),
  INDEX `transfer_points_zone_id_status_idx`(`zone_id`, `status`),
  INDEX `transfer_points_type_idx`(`type`),
  INDEX `transfer_points_created_by_idx`(`created_by`),
  INDEX `transfer_points_updated_by_idx`(`updated_by`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `transfer_points`
  ADD CONSTRAINT `transfer_points_zone_id_fkey`
  FOREIGN KEY (`zone_id`) REFERENCES `zones`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `transfer_points`
  ADD CONSTRAINT `transfer_points_created_by_fkey`
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `transfer_points`
  ADD CONSTRAINT `transfer_points_updated_by_fkey`
  FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
