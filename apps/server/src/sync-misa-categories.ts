import { bootstrap, RequestContext, CollectionService, ChannelService, LanguageCode } from '@vendure/core';
import { config } from './vendure-config';
// using native fetch


// Ensure environment variables are loaded if needed
import 'dotenv/config';

interface MisaCategory {
    expanded?: boolean;
    InventoryItemCategoryID: string;
    ItemCategoryCode: string;
    ItemCategoryName: string;
    Description?: string;
    MISACode: string;
    ParentID?: string;
    Data?: MisaCategory[];
    leaf?: boolean;
    [key: string]: any;
}

interface MisaResponse {
    Code: number;
    Data: MisaCategory[];
    Total: number;
    Success: boolean;
    Environment: string;
}

async function syncMisaCategories() {
    console.log('Bootstrapping Vendure...');
    // We can run bootstrap with a partial config to avoid starting the server port
    const app = await bootstrap({
        ...config,
        apiOptions: {
            ...config.apiOptions,
            port: 0, // Dùng port 0 để không xung đột nếu server chính đang chạy
        }
    });

    const collectionService = app.get(CollectionService);
    const channelService = app.get(ChannelService);

    const channel = await channelService.getDefaultChannel();
    const ctx = new RequestContext({
        channel,
        apiType: 'admin',
        isAuthorized: true,
        authorizedAsOwnerOnly: false,
    });

    console.log('Fetching categories from Misa...');
    const response = await fetch("https://ducngocshop.mshopkeeper.vn/backendg1/api/InventoryItemCategory/TreeItem?_dc=1771907698467&node=root", {
        "headers": {
            "accept": "application/json",
            "accept-language": "vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5",
            "authorization": "Bearer 4NjkUo8lDYc7wI4Wrg5Mtwb5oeDAxybpWYN6AOgOzSbHzbjoZAmdKnXaMGI5KPzkyX2Drm5bDMw0yCyS7aPGGNauEv0TaTY3R1_hWUxgfu3fNnQmvYb30soOJMpeRz-2RNEgmxK2vB87e3_LvJQYcaDRUl7p0oFvf1kYDfgygik3MUdt0Nsbhrrbwr8rqFy_Dwr9vwVhNOXfVG9k0h_AIP1VNqlCJzz8KOFeX67FAZxa0KCoiqwgBNn2tPtAlO5YeLGgbYYoGi3MMlRoegK6urrLlOrJxyHEtTrcpDDjANYdPA3wHyl8FUt9QZDVvlpbOXrUy0m6ppsqeOpIVUubJPaUYfvD6_QcP5E00knRnQoe_5UZbPzA2_Ian5vYJCDOW_DoU-4T358NgXLZQQQcI4VxShheJVRruUw0cksguvY1mZYeBnG03tlu6f2LH8Vpe5oErOETqpu8BqMHLlcW8RM_bpcDdK19IJ7V2-sKq_x_DQ4M_lPR8NOB2mbKLUCbWkasNNxfEMDTTDOnMmZnOma6jVn5ebiBJddjDwavr3WLF4fv20k9tkl9LhVJsHpbJ7trihBcCcyEDSNmG73PcFdEGu8yd_q7mA-ChFrMEKZ_tn87F-86iDoKrqmpIgmyUiNZ3bNoR5QpKua6lSg7QaW38Mgx3RAQnRa1lYRTsCzmu7iKw5r1dPT0oBLQjsqYmkanALLAB7m5q7fzQuiU5nlPDzglehH_bemazsroUUc",
            "companycode": "ducngocshop",
            "sec-ch-ua": "\"Not:A-Brand\";v=\"99\", \"Google Chrome\";v=\"145\", \"Chromium\";v=\"145\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "x-misa-branchid": "0b23dd91-e070-4b33-bddf-e05e9cff3264",
            "x-misa-language": "vi-VN",
            "cookie": "_gid=GA1.2.257613911.1771818706; _gcl_au=1.1.1973455688.1771818708; initialTrafficSource=utmccn=(not set); _fbp=fb.1.1771818708759.363375511701064677; x-deviceid=5e0bb97dc43942e78b0a02fde13a6e9a; _ga_04GRFG1GEE=GS2.1.s1771818708$o1$g1$t1771819186$j60$l0$h0; _ga_64YCPP0PNS=GS2.1.s1771843707$o2$g0$t1771843707$j60$l0$h0; _ga_5RQ0H2DBF0=GS2.1.s1771845016$o48$g0$t1771845016$j60$l0$h0; _ga_877E0J2DYM=GS2.1.s1771845016$o50$g0$t1771845016$j60$l0$h0; ASP.NET_SessionId=j4xe1nerylajlm3x2onmkbic; ducngocshop_Token=7cefc80c5aee49518b57ad965df04027; _ga=GA1.1.1274169688.1768790905; _ga_YLF50693DS=GS2.1.s1771906794$o4$g1$t1771906797$j57$l0$h0; _gat=1; _ga_D8GFJLDVNQ=GS2.2.s1771906779$o5$g1$t1771907690$j60$l0$h0",
            "Referer": "https://ducngocshop.mshopkeeper.vn/main"
        },
        "body": null,
        "method": "GET"
    });

    if (!response.ok) {
        console.error(`Failed to fetch from Misa: ${response.status} ${response.statusText}`);
        process.exit(1);
    }

    const resData = await response.json() as MisaResponse;
    if (!resData.Success || !resData.Data) {
        console.error("Misa API returned an error or no data:", resData);
        process.exit(1);
    }

    console.log(`Fetched ${resData.Data.length} root categories from Misa.`);

    console.log('Fetching existing Vendure Collections...');
    // Map of misaId -> collection.id
    const collectionMap = new Map<string, string>();
    const take = 100;
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
        const existingCollections = await collectionService.findAll(ctx, {
            take,
            skip,
        });

        for (const collection of existingCollections.items) {
            if ((collection.customFields as any).misaId) {
                collectionMap.set((collection.customFields as any).misaId, collection.id as string);
            }
        }

        skip += take;
        hasMore = skip < existingCollections.totalItems;
    }

    let createdCount = 0;
    let updatedCount = 0;

    /**
     * Recursively processes a Misa Category and creates/updates it in Vendure
     */
    async function processCategory(misaCat: MisaCategory, parentId?: string) {
        let collectionId = collectionMap.get(misaCat.InventoryItemCategoryID);

        if (!collectionId) {
            // Create
            try {
                const newCollection = await collectionService.create(ctx, {
                    translations: [{
                        languageCode: LanguageCode.vi,
                        name: misaCat.ItemCategoryName,
                        slug: misaCat.ItemCategoryCode || misaCat.InventoryItemCategoryID,
                        description: misaCat.Description || '',
                    }],
                    parentId,
                    customFields: {
                        misaId: misaCat.InventoryItemCategoryID,
                    },
                    filters: [], // Add an empty filters array since CollectionService usually expects it
                });
                collectionId = newCollection.id as string;
                collectionMap.set(misaCat.InventoryItemCategoryID, collectionId);
                createdCount++;
                console.log(`[Created] ${misaCat.ItemCategoryName}`);
            } catch (err: any) {
                console.error(`Failed to create collection ${misaCat.ItemCategoryName}:`, err.message);
                return; // skip children if parent fails
            }
        } else {
            // Update
            try {
                await collectionService.update(ctx, {
                    id: collectionId,
                    translations: [{
                        languageCode: LanguageCode.vi,
                        name: misaCat.ItemCategoryName,
                        slug: misaCat.ItemCategoryCode || misaCat.InventoryItemCategoryID,
                        description: misaCat.Description || '',
                    }],
                    customFields: {
                        misaId: misaCat.InventoryItemCategoryID,
                    }
                });
                updatedCount++;
                console.log(`[Updated] ${misaCat.ItemCategoryName}`);
            } catch (err: any) {
                console.error(`Failed to update collection ${misaCat.ItemCategoryName}:`, err.message);
            }
        }

        // Process children
        if (misaCat.Data && misaCat.Data.length > 0) {
            for (const child of misaCat.Data) {
                await processCategory(child, collectionId);
            }
        }
    }

    // Process all root categories
    for (const rootCat of resData.Data) {
        // Find existing Root Collection ID since Vendor root is special, but parentId=undefined creates it under Root
        await processCategory(rootCat);
    }

    console.log(`Sync complete! Created: ${createdCount}, Updated: ${updatedCount}`);

    // Close Vendure app gracefully
    await app.close();
    process.exit(0);
}

syncMisaCategories().catch(err => {
    console.error(err);
    process.exit(1);
});
