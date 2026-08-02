CREATE TABLE `ad_tariffs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`placement` enum('banner_top','banner_side','ticker','featured') NOT NULL,
	`pricePerDay` decimal(10,2) NOT NULL,
	`minDays` int DEFAULT 1,
	`maxDays` int,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ad_tariffs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `admin_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminId` int NOT NULL,
	`permission` varchar(128) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_permissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `verification_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`method` enum('sms','tinkoff','sber','vk','gosuslugi','maks') NOT NULL,
	`status` enum('pending','verified','failed') NOT NULL DEFAULT 'pending',
	`verificationCode` varchar(255),
	`externalId` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `verification_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `orders` ADD `commissionRate` decimal(5,2) DEFAULT '15.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `adminLevel` enum('level_1','level_2','level_3','level_4','level_5');--> statement-breakpoint
ALTER TABLE `users` ADD `isKomekspoEmployee` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `employeeJobTitle` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `verificationMethod` enum('sms','tinkoff','sber','vk','gosuslugi','maks','none') DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `isVerified` boolean DEFAULT false NOT NULL;