import { bootstrap } from '@vendure/core';
import { config } from './vendure-config';

// Ensure environment variables are loaded if needed
import 'dotenv/config';

async function runMigrations() {
    console.log('Bootstrapping Vendure to run migrations...');
    // Setting synchronize to false to avoid unwanted syncs and running migrations manually
    const app = await bootstrap({
        ...config,
        dbConnectionOptions: {
            ...config.dbConnectionOptions,
            migrationsRun: true,
        },
        apiOptions: {
            ...config.apiOptions,
            port: 0,
        }
    });

    console.log('Migrations run successfully.');
    await app.close();
    process.exit(0);
}

runMigrations().catch(err => {
    console.error(err);
    process.exit(1);
});
