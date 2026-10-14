CREATE TABLE `transfer_statuses` (
  `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `status` BOOLEAN NOT NULL DEFAULT true,

  UNIQUE INDEX `transfer_statuses_name_key`(`name`),
  INDEX `transfer_statuses_status_idx`(`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `reservation_transfers` (
  `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
  `reservation_id` INTEGER UNSIGNED NOT NULL,
  `service_type_id` INTEGER UNSIGNED NOT NULL,
  `vehicle_id` INTEGER UNSIGNED NOT NULL,
  `rate_id` INTEGER UNSIGNED NOT NULL,
  `origin_transfer_point_id` INTEGER UNSIGNED NOT NULL,
  `destination_transfer_point_id` INTEGER UNSIGNED NOT NULL,
  `segment_leg` ENUM('SALIDA', 'LLEGADA') NOT NULL,
  `segment_type` ENUM('AH', 'HA', 'HH') NOT NULL,
  `transfer_group_uuid` CHAR(36) NOT NULL,
  `pickup_date` DATE NOT NULL,
  `pickup_time` TIME(0) NOT NULL,
  `service_date` DATE NOT NULL,
  `service_time` TIME(0) NOT NULL,
  `passengers` INTEGER UNSIGNED NOT NULL,
  `luggage` INTEGER UNSIGNED NOT NULL,
  `flight_number_airline_id` VARCHAR(100) NULL,
  `transfer_status_id` INTEGER UNSIGNED NOT NULL,
  `operator_name` VARCHAR(150) NULL,
  `unit_name` VARCHAR(150) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NULL,

  INDEX `reservation_transfers_reservation_id_idx`(`reservation_id`),
  INDEX `reservation_transfers_service_type_id_idx`(`service_type_id`),
  INDEX `reservation_transfers_vehicle_id_idx`(`vehicle_id`),
  INDEX `reservation_transfers_rate_id_idx`(`rate_id`),
  INDEX `reservation_transfers_origin_transfer_point_id_idx`(`origin_transfer_point_id`),
  INDEX `reservation_transfers_destination_transfer_point_id_idx`(`destination_transfer_point_id`),
  INDEX `reservation_transfers_transfer_group_uuid_idx`(`transfer_group_uuid`),
  INDEX `reservation_transfers_transfer_status_id_idx`(`transfer_status_id`),
  INDEX `reservation_transfers_service_date_service_time_idx`(`service_date`, `service_time`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `reservation_transfers`
  ADD CONSTRAINT `reservation_transfers_reservation_id_fkey`
  FOREIGN KEY (`reservation_id`) REFERENCES `reservations`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `reservation_transfers`
  ADD CONSTRAINT `reservation_transfers_service_type_id_fkey`
  FOREIGN KEY (`service_type_id`) REFERENCES `service_types`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `reservation_transfers`
  ADD CONSTRAINT `reservation_transfers_vehicle_id_fkey`
  FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `reservation_transfers`
  ADD CONSTRAINT `reservation_transfers_rate_id_fkey`
  FOREIGN KEY (`rate_id`) REFERENCES `rates`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `reservation_transfers`
  ADD CONSTRAINT `reservation_transfers_origin_transfer_point_id_fkey`
  FOREIGN KEY (`origin_transfer_point_id`) REFERENCES `transfer_points`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `reservation_transfers`
  ADD CONSTRAINT `reservation_transfers_destination_transfer_point_id_fkey`
  FOREIGN KEY (`destination_transfer_point_id`) REFERENCES `transfer_points`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `reservation_transfers`
  ADD CONSTRAINT `reservation_transfers_transfer_status_id_fkey`
  FOREIGN KEY (`transfer_status_id`) REFERENCES `transfer_statuses`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
