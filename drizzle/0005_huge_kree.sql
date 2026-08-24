CREATE TABLE `dental_lead_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('own_form','widget','partner_site','vk_lead_form','yandex_form','tilda','telephony','api') NOT NULL DEFAULT 'api',
	`apiKeyPrefix` varchar(16) NOT NULL,
	`apiKeyHash` varchar(128) NOT NULL,
	`domain` varchar(255),
	`defaultCity` varchar(128),
	`defaultService` varchar(64),
	`status` enum('active','paused') NOT NULL DEFAULT 'active',
	`lastLeadAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dental_lead_sources_id` PRIMARY KEY(`id`),
	CONSTRAINT `dental_lead_sources_apiKeyPrefix_unique` UNIQUE(`apiKeyPrefix`)
);
--> statement-breakpoint
ALTER TABLE `dental_leads` ADD `sourceId` int;--> statement-breakpoint
ALTER TABLE `dental_leads` ADD `externalId` varchar(128);--> statement-breakpoint
CREATE INDEX `dental_leads_source_idx` ON `dental_leads` (`sourceId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `dental_leads_external_idx` ON `dental_leads` (`externalId`);