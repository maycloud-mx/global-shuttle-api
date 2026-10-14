CREATE TABLE `reservation_payments` (
  `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
  `reservation_id` INTEGER UNSIGNED NOT NULL,
  `payment_method` VARCHAR(50) NOT NULL,
  `provider` VARCHAR(50) NULL,
  `provider_environment` VARCHAR(30) NULL,
  `provider_order_id` VARCHAR(191) NULL,
  `provider_capture_id` VARCHAR(191) NULL,
  `provider_payer_id` VARCHAR(191) NULL,
  `provider_payer_email` VARCHAR(191) NULL,
  `provider_status` VARCHAR(50) NULL,
  `idempotency_key` VARCHAR(191) NULL,
  `public_token_hash` VARCHAR(255) NULL,
  `public_token_expires_at` DATETIME(3) NULL,
  `public_token_used_at` DATETIME(3) NULL,
  `payment_status` VARCHAR(50) NOT NULL,
  `amount` DECIMAL(12, 2) NOT NULL,
  `currency_id` INTEGER UNSIGNED NOT NULL,
  `payment_date` DATETIME(3) NULL,
  `expires_at` DATETIME(3) NULL,
  `approved_at` DATETIME(3) NULL,
  `captured_at` DATETIME(3) NULL,
  `cancelled_at` DATETIME(3) NULL,
  `failed_at` DATETIME(3) NULL,
  `provider_response` JSON NULL,
  `reference` VARCHAR(191) NULL,
  `receipt_file` TEXT NULL,
  `notes` TEXT NULL,
  `created_by` INTEGER UNSIGNED NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NULL,

  UNIQUE INDEX `reservation_payments_idempotency_key_key`(`idempotency_key`),
  INDEX `reservation_payments_reservation_id_idx`(`reservation_id`),
  INDEX `reservation_payments_payment_status_idx`(`payment_status`),
  INDEX `reservation_payments_provider_provider_order_id_idx`(`provider`, `provider_order_id`),
  INDEX `reservation_payments_currency_id_idx`(`currency_id`),
  INDEX `reservation_payments_created_by_idx`(`created_by`),
  INDEX `reservation_payments_created_at_idx`(`created_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `reservation_payments`
  ADD CONSTRAINT `reservation_payments_reservation_id_fkey`
  FOREIGN KEY (`reservation_id`) REFERENCES `reservations`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `reservation_payments`
  ADD CONSTRAINT `reservation_payments_currency_id_fkey`
  FOREIGN KEY (`currency_id`) REFERENCES `currencies`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `reservation_payments`
  ADD CONSTRAINT `reservation_payments_created_by_fkey`
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
