import { generateMigration } from '@vendure/core';
import { config } from './vendure-config';
import 'dotenv/config';

generateMigration(config, {
    name: 'add-collection-misa-id',
    outputDir: './src/migrations' // assuming outputDir based on src code of @vendure/core
}).then(() => {
    console.log('Migration generated successfully');
    process.exit(0);
}).catch(err => {
    console.error('Failed to generate migration:', err);
    process.exit(1);
});
