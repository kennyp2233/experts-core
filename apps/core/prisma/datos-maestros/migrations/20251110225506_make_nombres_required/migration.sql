/*
  Warnings:

  - Made the column `nombre` on table `CaeAduana` required. This step will fail if there are existing NULL values in that column.
  - Made the column `nombre` on table `Origen` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "CaeAduana" ALTER COLUMN "nombre" SET NOT NULL;

-- AlterTable
ALTER TABLE "Origen" ALTER COLUMN "nombre" SET NOT NULL;
