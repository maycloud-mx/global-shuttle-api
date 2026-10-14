CREATE TABLE `reservation_notes` (
  `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
  `reservation_id` INTEGER UNSIGNED NOT NULL,
  `user_id` INTEGER UNSIGNED NOT NULL,
  `notes` TEXT NOT NULL,
  `is_private` BOOLEAN NOT NULL DEFAULT false,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NULL,

  INDEX `reservation_notes_reservation_id_created_at_idx`(`reservation_id`, `created_at`),
  INDEX `reservation_notes_user_id_idx`(`user_id`),
  INDEX `reservation_notes_is_private_idx`(`is_private`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `reservation_notes`
  ADD CONSTRAINT `reservation_notes_reservation_id_fkey`
  FOREIGN KEY (`reservation_id`) REFERENCES `reservations`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `reservation_notes`
  ADD CONSTRAINT `reservation_notes_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
