import { generateMigration } from '@vendure/core';
import { config } from './vendure-config';
import 'dotenv/config';

generateMigration(config, {
    name: 'add-product-misa-fields',
    outputDir: './src/migrations'
}).then(() => {
    console.log('Migration generated successfully');
    process.exit(0);
}).catch(err => {
    console.error('Failed to generate migration:', err);
    process.exit(1);
});
