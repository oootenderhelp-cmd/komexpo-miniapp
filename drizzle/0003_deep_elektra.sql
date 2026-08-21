CREATE TABLE `dental_lead_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`type` enum('created','status_change','message_sent','note','opt_out') NOT NULL DEFAULT 'note',
	`fromStatus` varchar(32),
	`toStatus` varchar(32),
	`channel` varchar(32),
	`body` text,
	`actorUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dental_lead_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dental_leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`publicId` varchar(32) NOT NULL,
	`name` varchar(255) NOT NULL,
	`phone` varchar(32) NOT NULL,
	`email` varchar(320),
	`messengerType` enum('telegram','max','vk','whatsapp','none') NOT NULL DEFAULT 'none',
	`messengerHandle` varchar(255),
	`city` varchar(128) NOT NULL DEFAULT 'Санкт-Петербург',
	`serviceSlug` varchar(64) NOT NULL,
	`comment` text,
	`painLevel` int NOT NULL DEFAULT 0,
	`symptoms` json,
	`readiness` enum('today','this_week','this_month','researching') NOT NULL DEFAULT 'researching',
	`urgencyScore` int NOT NULL DEFAULT 0,
	`urgencyTier` enum('critical','high','medium','low') NOT NULL DEFAULT 'low',
	`urgencyReasons` json,
	`sourceChannel` varchar(64),
	`utmSource` varchar(128),
	`utmMedium` varchar(128),
	`utmCampaign` varchar(255),
	`utmContent` varchar(255),
	`utmTerm` varchar(255),
	`landingPath` varchar(512),
	`consentPd` boolean NOT NULL DEFAULT false,
	`consentMarketing` boolean NOT NULL DEFAULT false,
	`consentAt` timestamp,
	`consentText` varchar(64),
	`optedOut` boolean NOT NULL DEFAULT false,
	`optedOutAt` timestamp,
	`status` enum('new','contacted','scheduled','visited','no_answer','rejected','spam') NOT NULL DEFAULT 'new',
	`assignedToUserId` int,
	`firstTouchAt` timestamp,
	`visitAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dental_leads_id` PRIMARY KEY(`id`),
	CONSTRAINT `dental_leads_publicId_unique` UNIQUE(`publicId`)
);
--> statement-breakpoint
ALTER TABLE `orders` MODIFY COLUMN `commissionRate` decimal(5,2) NOT NULL DEFAULT '15.00';--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(512);--> statement-breakpoint
CREATE INDEX `dental_lead_events_lead_idx` ON `dental_lead_events` (`leadId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `dental_leads_queue_idx` ON `dental_leads` (`urgencyScore`,`createdAt`);--> statement-breakpoint
CREATE INDEX `dental_leads_status_idx` ON `dental_leads` (`status`);--> statement-breakpoint
CREATE INDEX `dental_leads_created_idx` ON `dental_leads` (`createdAt`);--> statement-breakpoint
CREATE INDEX `dental_leads_service_idx` ON `dental_leads` (`serviceSlug`);--> statement-breakpoint
CREATE INDEX `dental_leads_phone_idx` ON `dental_leads` (`phone`);