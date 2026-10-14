CREATE TABLE `countries` (
  `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `iso2` CHAR(2) NOT NULL,
  `phone_code` VARCHAR(10) NOT NULL,
  `status` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NULL,

  UNIQUE INDEX `countries_name_key`(`name`),
  UNIQUE INDEX `countries_iso2_key`(`iso2`),
  INDEX `countries_phone_code_idx`(`phone_code`),
  INDEX `countries_status_idx`(`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `reservation_customers`
  ADD COLUMN `country_id` INTEGER UNSIGNED NULL;

CREATE INDEX `reservation_customers_country_id_idx`
  ON `reservation_customers`(`country_id`);

ALTER TABLE `reservation_customers`
  ADD CONSTRAINT `reservation_customers_country_id_fkey`
  FOREIGN KEY (`country_id`) REFERENCES `countries`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
