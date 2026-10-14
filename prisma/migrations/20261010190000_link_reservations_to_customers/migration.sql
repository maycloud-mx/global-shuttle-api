ALTER TABLE `reservations`
  ADD COLUMN `reservation_customer_id` INTEGER UNSIGNED NULL;

CREATE INDEX `reservations_reservation_customer_id_idx`
  ON `reservations`(`reservation_customer_id`);

ALTER TABLE `reservations`
  ADD CONSTRAINT `reservations_reservation_customer_id_fkey`
  FOREIGN KEY (`reservation_customer_id`) REFERENCES `reservation_customers`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
