CREATE TABLE `business_partners` (
  `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `company_name` VARCHAR(191) NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `discount_percentage` DECIMAL(5, 2) NOT NULL DEFAULT 0,
  `status` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NULL,

  UNIQUE INDEX `business_partners_code_key`(`code`),
  INDEX `business_partners_status_idx`(`status`),
  INDEX `business_partners_company_name_idx`(`company_name`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `reservations`
  ADD COLUMN `business_partner_id` INTEGER UNSIGNED NULL,
  ADD COLUMN `business_partner_code` VARCHAR(50) NULL,
  ADD COLUMN `business_partner_discount_percentage` DECIMAL(5, 2) NULL;

CREATE INDEX `reservations_business_partner_id_idx`
  ON `reservations`(`business_partner_id`);

CREATE INDEX `reservations_business_partner_code_idx`
  ON `reservations`(`business_partner_code`);

ALTER TABLE `reservations`
  ADD CONSTRAINT `reservations_business_partner_id_fkey`
  FOREIGN KEY (`business_partner_id`) REFERENCES `business_partners`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
