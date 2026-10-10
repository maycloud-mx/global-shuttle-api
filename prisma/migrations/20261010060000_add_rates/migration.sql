CREATE TABLE `rates` (
  `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
  `origin_zone_id` INTEGER UNSIGNED NOT NULL,
  `destination_zone_id` INTEGER UNSIGNED NOT NULL,
  `vehicle_id` INTEGER UNSIGNED NOT NULL,
  `currency_id` INTEGER UNSIGNED NOT NULL,
  `service_type_id` INTEGER UNSIGNED NOT NULL,
  `price` DECIMAL(12, 2) NOT NULL,
  `status` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_by` INTEGER UNSIGNED NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  `updated_by` INTEGER UNSIGNED NOT NULL,

  UNIQUE INDEX `rates_route_vehicle_currency_service_key`
    (`origin_zone_id`, `destination_zone_id`, `vehicle_id`, `currency_id`, `service_type_id`),
  INDEX `rates_origin_zone_id_destination_zone_id_status_idx`
    (`origin_zone_id`, `destination_zone_id`, `status`),
  INDEX `rates_vehicle_id_idx`(`vehicle_id`),
  INDEX `rates_currency_id_idx`(`currency_id`),
  INDEX `rates_service_type_id_idx`(`service_type_id`),
  INDEX `rates_created_by_idx`(`created_by`),
  INDEX `rates_updated_by_idx`(`updated_by`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `rates` ADD CONSTRAINT `rates_origin_zone_id_fkey`
  FOREIGN KEY (`origin_zone_id`) REFERENCES `zones`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `rates` ADD CONSTRAINT `rates_destination_zone_id_fkey`
  FOREIGN KEY (`destination_zone_id`) REFERENCES `zones`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `rates` ADD CONSTRAINT `rates_vehicle_id_fkey`
  FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `rates` ADD CONSTRAINT `rates_currency_id_fkey`
  FOREIGN KEY (`currency_id`) REFERENCES `currencies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `rates` ADD CONSTRAINT `rates_service_type_id_fkey`
  FOREIGN KEY (`service_type_id`) REFERENCES `service_types`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `rates` ADD CONSTRAINT `rates_created_by_fkey`
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `rates` ADD CONSTRAINT `rates_updated_by_fkey`
  FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
