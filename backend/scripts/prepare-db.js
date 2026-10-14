import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');

const dbUrl = process.env.DATABASE_URL || '';

if (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://')) {
  let schema = fs.readFileSync(schemaPath, 'utf8');
  if (schema.includes('provider = "sqlite"')) {
    schema = schema.replace('provider = "sqlite"', 'provider = "postgresql"');
    fs.writeFileSync(schemaPath, schema);
    console.log('🔄 Switched Prisma provider to "postgresql" for cloud deployment.');
  }
} else if (dbUrl.startsWith('file:') || !dbUrl) {
  let schema = fs.readFileSync(schemaPath, 'utf8');
  if (schema.includes('provider = "postgresql"')) {
    schema = schema.replace('provider = "postgresql"', 'provider = "sqlite"');
    fs.writeFileSync(schemaPath, schema);
    console.log('🔄 Switched Prisma provider to "sqlite" for local development.');
  }
}
