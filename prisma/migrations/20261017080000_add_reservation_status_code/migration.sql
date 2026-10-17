ALTER TABLE `reservation_statuses`
  ADD COLUMN `code` VARCHAR(50) NULL AFTER `name`;

UPDATE `reservation_statuses`
SET `code` = CASE `id`
  WHEN 1 THEN 'QUOTATION'
  WHEN 2 THEN 'CONFIRMED'
  WHEN 3 THEN 'CANCELLED'
  ELSE CONCAT('STATUS_', `id`)
END;

ALTER TABLE `reservation_statuses`
  MODIFY COLUMN `code` VARCHAR(50) NOT NULL,
  ADD UNIQUE INDEX `reservation_statuses_code_key` (`code`);
