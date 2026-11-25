-- CreateTable
CREATE TABLE `contact_messages` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(150) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(30) NULL,
    `comment` TEXT NOT NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `customer_email_sent_at` DATETIME(3) NULL,
    `admin_email_sent_at` DATETIME(3) NULL,
    `read_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    INDEX `contact_messages_email_idx`(`email`),
    INDEX `contact_messages_is_read_created_at_idx`(`is_read`, `created_at`),
    INDEX `contact_messages_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
