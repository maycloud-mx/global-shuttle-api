CREATE TABLE `zone_transfer_point_times` (
  `zone_id` INTEGER UNSIGNED NOT NULL,
  `transfer_point_id` INTEGER UNSIGNED NOT NULL,
  `hours` DECIMAL(5, 2) NOT NULL,

  INDEX `zone_transfer_point_times_transfer_point_id_idx`(`transfer_point_id`),
  PRIMARY KEY (`zone_id`, `transfer_point_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `zone_transfer_point_times`
  ADD CONSTRAINT `zone_transfer_point_times_zone_id_fkey`
  FOREIGN KEY (`zone_id`) REFERENCES `zones`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `zone_transfer_point_times`
  ADD CONSTRAINT `zone_transfer_point_times_transfer_point_id_fkey`
  FOREIGN KEY (`transfer_point_id`) REFERENCES `transfer_points`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
