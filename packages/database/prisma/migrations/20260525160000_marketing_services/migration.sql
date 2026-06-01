-- CreateTable
CREATE TABLE "marketing_services" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "heroTitle" TEXT NOT NULL,
    "heroTitleAccent" TEXT,
    "heroDescription" TEXT NOT NULL,
    "contentHtml" TEXT NOT NULL,
    "iconUrl" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_services_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "marketing_services_slug_key" ON "marketing_services"("slug");

-- CreateIndex
CREATE INDEX "marketing_services_published_sortOrder_idx" ON "marketing_services"("published", "sortOrder");
