process.env.JWT_SECRET ??= "dev_secret_32_characters_minimum_123";
process.env.JWT_EXPIRES_IN ??= "7d";
process.env.APP_URL ??= "http://localhost:3000";
process.env.DATABASE_URL ??= "postgresql://study:study@localhost:5432/study_project?schema=public";
process.env.APP_DATA_ROOT ??= ".tmp/test-data";
process.env.APP_BACKUP_ROOT ??= ".tmp/test-backups";
process.env.UPLOAD_MAX_BYTES ??= "5242880";
