-- Migration number: 0001 	 2024-04-10T08:09:24.387Z
-- CreateTable
CREATE TABLE "Poker" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "system" TEXT NOT NULL,
    "autoReveal" BOOLEAN NOT NULL,
    "showAverage" BOOLEAN NOT NULL
);

