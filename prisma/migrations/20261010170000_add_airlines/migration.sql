CREATE TABLE `airlines` (
  `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `iata_code` VARCHAR(3) NOT NULL,
  `icao_code` VARCHAR(4) NOT NULL,
  `status` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NULL,

  UNIQUE INDEX `airlines_iata_code_key`(`iata_code`),
  UNIQUE INDEX `airlines_icao_code_key`(`icao_code`),
  INDEX `airlines_status_idx`(`status`),
  INDEX `airlines_name_idx`(`name`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `reservation_transfers`
  CHANGE COLUMN `flight_number_airline_id` `flight_number` VARCHAR(30) NULL,
  ADD COLUMN `airline_id` INTEGER UNSIGNED NULL;

CREATE INDEX `reservation_transfers_airline_id_idx`
  ON `reservation_transfers`(`airline_id`);

ALTER TABLE `reservation_transfers`
  ADD CONSTRAINT `reservation_transfers_airline_id_fkey`
  FOREIGN KEY (`airline_id`) REFERENCES `airlines`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
