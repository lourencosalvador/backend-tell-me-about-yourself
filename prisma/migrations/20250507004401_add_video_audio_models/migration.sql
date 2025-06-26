-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Audio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "path" TEXT NOT NULL,
    "userId" TEXT,
    "videoId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    CONSTRAINT "Audio_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Audio_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Audio" ("id", "path", "userId", "videoId") SELECT "id", "path", "userId", "videoId" FROM "Audio";
DROP TABLE "Audio";
ALTER TABLE "new_Audio" RENAME TO "Audio";
CREATE UNIQUE INDEX "Audio_videoId_key" ON "Audio"("videoId");
CREATE TABLE "new_Transcription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "audioId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    CONSTRAINT "Transcription_audioId_fkey" FOREIGN KEY ("audioId") REFERENCES "Audio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Transcription" ("audioId", "createdAt", "id", "text") SELECT "audioId", "createdAt", "id", "text" FROM "Transcription";
DROP TABLE "Transcription";
ALTER TABLE "new_Transcription" RENAME TO "Transcription";
CREATE UNIQUE INDEX "Transcription_audioId_key" ON "Transcription"("audioId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
