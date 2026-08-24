CREATE TABLE `dental_partners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`city` varchar(128) NOT NULL,
	`region` varchar(128),
	`address` varchar(512),
	`site` varchar(512),
	`contactName` varchar(255),
	`contactPhone` varchar(32),
	`contactEmail` varchar(320),
	`services` json,
	`pricePerLead` decimal(10,2) DEFAULT '0.00',
	`pricePerVisit` decimal(10,2) DEFAULT '0.00',
	`dailyCap` int NOT NULL DEFAULT 0,
	`status` enum('active','paused','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dental_partners_id` PRIMARY KEY(`id`),
	CONSTRAINT `dental_partners_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `dental_leads` ADD `partnerId` int;--> statement-breakpoint
ALTER TABLE `dental_leads` ADD `routedAt` timestamp;--> statement-breakpoint
ALTER TABLE `dental_leads` ADD `region` varchar(128);--> statement-breakpoint
CREATE INDEX `dental_partners_city_idx` ON `dental_partners` (`city`,`status`);--> statement-breakpoint
CREATE INDEX `dental_leads_partner_idx` ON `dental_leads` (`partnerId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `dental_leads_city_idx` ON `dental_leads` (`city`);