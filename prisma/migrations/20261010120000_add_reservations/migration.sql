CREATE TABLE `reservation_statuses` (
  `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `status` BOOLEAN NOT NULL DEFAULT true,

  UNIQUE INDEX `reservation_statuses_name_key`(`name`),
  INDEX `reservation_statuses_status_idx`(`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `reservations` (
  `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
  `folio` VARCHAR(50) NOT NULL,
  `currency_id` INTEGER UNSIGNED NOT NULL,
  `subtotal` DECIMAL(12, 2) NOT NULL,
  `discount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `total` DECIMAL(12, 2) NOT NULL,
  `paid_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `pending_amount` DECIMAL(12, 2) NOT NULL,
  `reservation_status_id` INTEGER UNSIGNED NOT NULL,
  `payment_status` VARCHAR(50) NOT NULL,
  `source` VARCHAR(50) NOT NULL,
  `created_by` INTEGER UNSIGNED NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NULL,

  UNIQUE INDEX `reservations_folio_key`(`folio`),
  INDEX `reservations_currency_id_idx`(`currency_id`),
  INDEX `reservations_reservation_status_id_idx`(`reservation_status_id`),
  INDEX `reservations_payment_status_idx`(`payment_status`),
  INDEX `reservations_source_idx`(`source`),
  INDEX `reservations_created_by_idx`(`created_by`),
  INDEX `reservations_created_at_idx`(`created_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `reservations`
  ADD CONSTRAINT `reservations_currency_id_fkey`
  FOREIGN KEY (`currency_id`) REFERENCES `currencies`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `reservations`
  ADD CONSTRAINT `reservations_reservation_status_id_fkey`
  FOREIGN KEY (`reservation_status_id`) REFERENCES `reservation_statuses`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `reservations`
  ADD CONSTRAINT `reservations_created_by_fkey`
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
