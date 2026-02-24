import {
    dummyPaymentHandler,
    DefaultJobQueuePlugin,
    DefaultSchedulerPlugin,
    DefaultSearchPlugin,
    VendureConfig,
    LanguageCode,
} from '@vendure/core';
import { defaultEmailHandlers, EmailPlugin, FileBasedTemplateLoader } from '@vendure/email-plugin';
import { AssetServerPlugin } from '@vendure/asset-server-plugin';
import { DashboardPlugin } from '@vendure/dashboard/plugin';
import { GraphiqlPlugin } from '@vendure/graphiql-plugin';
import 'dotenv/config';
import path from 'path';
import { MemberPriceStrategy } from './config/member-price.strategy';

const IS_DEV = process.env.APP_ENV === 'dev';
const serverPort = +process.env.PORT || 3000;

export const config: VendureConfig = {
    apiOptions: {
        port: serverPort,
        adminApiPath: 'admin-api',
        shopApiPath: 'shop-api',
        trustProxy: IS_DEV ? false : 1,
        // The following options are useful in development mode,
        // but are best turned off for production for security
        // reasons.
        ...(IS_DEV ? {
            adminApiDebug: true,
            shopApiDebug: true,
        } : {}),
    },
    authOptions: {
        tokenMethod: ['bearer', 'cookie'],
        superadminCredentials: {
            identifier: process.env.SUPERADMIN_USERNAME,
            password: process.env.SUPERADMIN_PASSWORD,
        },
        cookieOptions: {
            secret: process.env.COOKIE_SECRET,
        },
    },
    dbConnectionOptions: {
        type: 'postgres',
        // See the README.md "Migrations" section for an explanation of
        // the `synchronize` and `migrations` options.
        synchronize: false,
        migrations: [path.join(__dirname, './migrations/*.+(js|ts)')],
        logging: false,
        database: process.env.DB_NAME,
        schema: process.env.DB_SCHEMA,
        host: process.env.DB_HOST,
        port: +process.env.DB_PORT,
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
    },
    paymentOptions: {
        paymentMethodHandlers: [dummyPaymentHandler],
    },

    catalogOptions: {
        // Đăng ký ở đây thì file mới bắt đầu "chạy"
        productVariantPriceSelectionStrategy: new MemberPriceStrategy(),
    },
    // When adding or altering custom field definitions, the database will
    // need to be updated. See the "Migrations" section in README.md.
    customFields: {
        Product: [
            {
                name: 'misaId',
                type: 'string',
                label: [{ languageCode: LanguageCode.vi, value: 'ID MISA' }],
                public: false
            },
            {
                name: 'brandName',
                type: 'string',
                label: [{ languageCode: LanguageCode.vi, value: 'Thương hiệu' }]
            }
        ],
        ProductVariant: [
            {
                name: 'misaId',
                type: 'string',
                label: [{ languageCode: LanguageCode.vi, value: 'ID MISA' }],
                public: false // Chỉ dùng nội bộ để đồng bộ, không hiện ra ngoài shop
            },
            {
                name: 'purchasePrice',
                type: 'int', // Vendure lưu giá dưới dạng số nguyên (ví dụ: 100000)
                label: [{ languageCode: LanguageCode.vi, value: 'Giá mua (vốn)' }]
            },
            {
                name: 'unitId',
                type: 'string',
                label: [{ languageCode: LanguageCode.vi, value: 'ID Đơn vị tính' }]
            },
            {
                name: 'weight',
                type: 'float',
                label: [{ languageCode: LanguageCode.vi, value: 'Trọng lượng (g)' }]
            },
            {
                name: 'length',
                type: 'float',
                label: [{ languageCode: LanguageCode.vi, value: 'Chiều dài (cm)' }]
            },
            {
                name: 'width',
                type: 'float',
                label: [{ languageCode: LanguageCode.vi, value: 'Chiều rộng (cm)' }]
            },
            {
                name: 'height',
                type: 'float',
                label: [{ languageCode: LanguageCode.vi, value: 'Chiều cao (cm)' }]
            },
            {
                name: 'memberPrice',
                type: 'int', // Lưu dưới dạng đơn vị nhỏ nhất (vd: 100000 thay vì 100k)
                public: true,
                label: [{ languageCode: LanguageCode.vi, value: 'Giá thành viên (MISA B)' }],
            },
        ],
        Collection: [
            {
                name: 'misaId',
                type: 'string',
                label: [{ languageCode: LanguageCode.vi, value: 'ID MISA' }],
                public: false
            }
        ],
    },
    plugins: [
        GraphiqlPlugin.init(),
        AssetServerPlugin.init({
            route: 'assets',
            assetUploadDir: path.join(__dirname, '../static/assets'),
            // For local dev, the correct value for assetUrlPrefix should
            // be guessed correctly, but for production it will usually need
            // to be set manually to match your production url.
            assetUrlPrefix: IS_DEV ? undefined : 'https://www.my-shop.com/assets/',
        }),
        DefaultSchedulerPlugin.init(),
        DefaultJobQueuePlugin.init({ useDatabaseForBuffer: true }),
        DefaultSearchPlugin.init({ bufferUpdates: false, indexStockStatus: true }),
        EmailPlugin.init({
            devMode: true,
            outputPath: path.join(__dirname, '../static/email/test-emails'),
            route: 'mailbox',
            handlers: defaultEmailHandlers,
            templateLoader: new FileBasedTemplateLoader(path.join(__dirname, '../static/email/templates')),
            globalTemplateVars: {
                // The following variables will change depending on your storefront implementation.
                // Here we are assuming a storefront running at http://localhost:8080.
                fromAddress: '"example" <noreply@example.com>',
                verifyEmailAddressUrl: 'http://localhost:8080/verify',
                passwordResetUrl: 'http://localhost:8080/password-reset',
                changeEmailAddressUrl: 'http://localhost:8080/verify-email-address-change'
            },
        }),
        DashboardPlugin.init({
            route: 'dashboard',
            appDir: IS_DEV
                ? path.join(__dirname, '../dist/dashboard')
                : path.join(__dirname, 'dashboard'),
        }),
    ],
};
