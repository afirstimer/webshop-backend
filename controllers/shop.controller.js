import prisma from "../lib/prisma.js";
import { generateSign } from "../helper/tiktok.api.js";
import axios from "axios";
import { createFolder, getDefaultShop, writeJSONFile } from "../helper/helper.js";
import { getTiktokOrders, getTiktokProducts } from "../services/order.service.js";
import { createOrders, createProducts, processSyncProducts, reqSyncOrders } from "../services/shop.service.js";
import path from 'path';
import { callTiktokApi } from "../services/tiktok.service.js";

const ORDER_FILE = "./dummy/tiktok/orders.json";
const ORDER_FOLDER = "./dummy/tiktok/orders/shop/";

// get all shops
export const getShops = async (req, res) => {
    try {
        const { page = 1, limit = process.env.DEFAULT_LIMIT, search, sort } = req.query;

        /**
         * If user is admin, get all shops
         * If user is manager, get all shops of the team
         * If user is user, get all shops of the user
         */
        const requestUser = await prisma.user.findUnique({
            where: {
                id: req.userId
            }
        });

        if (!requestUser) {
            return res.status(404).json({ message: "User not found" });
        }

        const pageNum = parseInt(page, 10);
        const pageSize = parseInt(limit, 10);

        let where = {};
        if (requestUser && requestUser.isAdmin == 1) {
            where = {
                ...(search && {
                    name: {
                        contains: search,
                        mode: "insensitive",
                    },
                })
            };
        } else {
            where = {
                id: {
                    in: requestUser.shops,
                },
                ...(search && {
                    name: {
                        contains: search,
                        mode: "insensitive",
                    },
                })
            };
        }

        const orderBy = (() => {
            switch (sort) {
                case "newest":
                    return { createdAt: "desc" };
                case "oldest":
                    return { createdAt: "asc" };
                case "updated_newest":
                    return { updatedAt: "desc" };
                case "updated_oldest":
                    return { updatedAt: "asc" };
                default:
                    return { createdAt: "desc" };
            }
        })();

        const total = await prisma.shop.count({
            where
        });

        const shops = await prisma.shop.findMany({
            where,
            skip: (pageNum - 1) * pageSize,
            take: pageSize,
            orderBy: orderBy,
        });
        res.status(200).json({
            total,
            page: pageNum,
            limit: pageSize,
            shops
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Failed to get shops!" });
    }
}

export const getAllShops = async (req, res) => {
    try {
        const shops = await prisma.shop.findMany();
        res.status(200).json(shops);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Failed to get shops!" });
    }
}

// create shop
export const createShop = async (req, res) => {
    try {
        const { name, tiktokShopId, tiktokShopCipher, accessToken, shopRefreshToken } = req.body;
        const newShop = await prisma.shop.create({
            data: {
                name,
                code: 'new tiktok shop [need change]',
                status: 'CONNECTED',
                priceDiff: 1,
                shopItems: 0,
                accessToken,
                shopRefreshToken,
                signString: 'need change',
                tiktokShopId,
                tiktokShopCipher                
            },
        });
        res.status(201).json({message: "Shop created successfully", shop: newShop});
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Failed to create shop!" });
    }
}

// get shop
export const getShop = async (req, res) => {
    try {
        const shop = await prisma.shop.findUnique({
            where: {
                id: req.params.id
            },
            include: {
                User: {
                    select: {
                        username: true,
                        email: true,
                        avatar: true
                    }
                }
            },
        });
        res.status(200).json(shop);
    } catch (error) {
        console.log(error);
    }
}

export const getShopOrders = async (request, res) => {
    try {
        const app_key = process.env.TIKTOK_SHOP_APP_KEY;
        const secret = process.env.TIKTOK_SHOP_APP_SECRET;
        const setting = await prisma.setting.findFirst();
        if (!setting) {
            console.error("Setting not found");
            return res.status(404).json({ message: "Setting not found" });
        }
        const access_token = setting.shopAccessToken;

        if (!app_key || !secret || !access_token) {
            console.log(app_key, secret, access_token);
            console.error("Missing required parameters: app_key, secret, or access_token");
            throw new Error("Missing required parameters: app_key, secret, or access_token");
        }

        const shopId = request.params.id
        const shop = await prisma.shop.findUnique({
            where: {
                id: shopId
            }
        })

        if (!shop) {
            return res.status(404).json({ message: "Shop not found" });
        }

        request.query.path = "/order/202309/orders/search";
        request.query.access_token = access_token;
        request.query.app_key = app_key;
        request.query.secret = secret;
        request.query.shop_cipher = shop.tiktokShopCipher;
        request.query.page_size = 20;
        request.query.sort_order = 'ASC';
        request.query.sort_field = 'create_time';
        request.query.page_token = '';
        const timestamp = Math.floor(Date.now() / 1000);
        const header = request.headers['content-type'];
        const sign = generateSign(request, secret, timestamp, header);

        console.log(sign);

        // Define your request details
        const options = {
            method: "POST",
            url: "https://open-api.tiktokglobalshop.com/order/202309/orders/search",
            query: {
                app_key: app_key,
                sign: "{{sign}}",
                timestamp: "{{timestamp}}",
                shop_cipher: shop.tiktokShopCipher,
                page_size: 20,
                sort_order: 'ASC',
                sort_field: 'create_time',
                page_token: ''
            },
            headers: {
                "x-tts-access-token": setting.shopAccessToken,
                "content-type": "application/json"
            }
        };

        console.log(options);

        // Update the query parameters with calculated values
        options.query.sign = sign;
        options.query.timestamp = timestamp;

        // Interpolate URL
        const queryString = new URLSearchParams(options.query).toString();
        options.url = `${options.url}?${queryString}`;

        // Make the GET request    
        const response = await axios({
            method: options.method,
            url: options.url,
            headers: options.headers
        });
        console.log(response);

        if (response.data.message == 'Success') {
            await writeJSONFile(ORDER_FILE, response.data.data);

            res.status(200).json(response.data.data);
        } else {
            console.error("Error:", response.data);
            throw new Error("Failed to get active shops");
        }
    } catch (error) {
        console.error("Error:", error.response ? error.response.data : error.message);
    }
}

// get active shops
export const getActiveShops = async (request, res) => {
    try {
        const app_key = process.env.TIKTOK_SHOP_APP_KEY;
        const secret = process.env.TIKTOK_SHOP_APP_SECRET;
        const setting = await prisma.setting.findFirst();
        if (!setting) {
            console.error("Setting not found");
            return res.status(404).json({ message: "Setting not found" });
        }
        const access_token = setting.shopAccessToken;

        if (!app_key || !secret || !access_token) {
            console.log(app_key, secret, access_token);
            console.error("Missing required parameters: app_key, secret, or access_token");
            throw new Error("Missing required parameters: app_key, secret, or access_token");
        }

        request.query.path = "/seller/202309/shops";
        request.query.access_token = access_token;
        request.query.app_key = app_key;
        request.query.secret = secret;
        const timestamp = Math.floor(Date.now() / 1000);
        const header = request.headers['content-type'];
        const sign = generateSign(request, secret, timestamp, header);

        // Define your request details
        const options = {
            method: "GET",
            url: "https://open-api.tiktokglobalshop.com/seller/202309/shops",
            query: {
                app_key: app_key,
                sign: "{{sign}}",
                timestamp: "{{timestamp}}"
            },
            headers: {
                "x-tts-access-token": setting.shopAccessToken
            }
        };

        // Prepare the request object for signature calculation
        const req = {
            url: {
                path: "/authorization/202309/shops",
                query: Object.entries(options.query).map(([key, value]) => ({ key, value }))
            },
            body: null // No body for GET requests
        };

        // Update the query parameters with calculated values
        options.query.sign = sign;
        options.query.timestamp = timestamp;

        // Interpolate URL
        const queryString = new URLSearchParams(options.query).toString();
        options.url = `${options.url}?${queryString}`;

        // Make the GET request    
        const response = await axios({
            method: options.method,
            url: options.url,
            headers: options.headers
        });

        if (response.data.message == 'Success') {
            const shops = response.data.data.shops;
            res.status(200).json(shops);
        } else {
            console.error("Error:", response.data);
            throw new Error("Failed to get active shops");
        }
    } catch (error) {
        console.error("Error:", error.response ? error.response.data : error.message);
    }
};

// get shops
export const getShopsByUser = async (req, res) => {
    try {
        const shops = await prisma.shop.findMany({
            where: {
                userId: req.params.id
            },
            include: {
                User: {
                    select: {
                        username: true,
                        email: true,
                        avatar: true
                    }
                }
            },
        });

        res.status(200).json(shops);
    } catch (error) {
        console.log(error);
    }
}

// update shop
export const updateShop = async (req, res) => {
    const { images, managers, priceDiff, shopItems, ...inputs } = req.body;

    try {
        let shopImages = [];
        if (images) {
            shopImages = JSON.parse(images);
        }

        let shopManagers = [];
        if (managers) {
            shopManagers = JSON.parse(managers);
        }

        let shopPriceDiff = null;
        if (priceDiff) {
            shopPriceDiff = parseInt(priceDiff, 10);
        }

        let shopQtyItems = null;
        if (shopItems) {
            shopQtyItems = parseInt(shopItems, 10);
        }
        const updatedShop = await prisma.shop.update({
            where: {
                id: req.params.id,
            },
            data: {
                ...inputs,
                priceDiff: shopPriceDiff,
                shopItems: shopQtyItems,
                images: shopImages,
                managers: shopManagers
            },
        });

        res.status(200).json(updatedShop);
    } catch (error) {
        console.log(error);
    }
}

// authorize shop
export const requestAuthorizedShops = async (request, res) => {
    try {
        const app_key = process.env.TIKTOK_SHOP_APP_KEY;
        const secret = process.env.TIKTOK_SHOP_APP_SECRET;
        const setting = await prisma.setting.findFirst();
        if (!setting) {
            console.error("Setting not found");
            return res.status(404).json({ message: "Setting not found" });
        }
        const access_token = setting.shopAccessToken;

        if (!app_key || !secret || !access_token) {
            console.log(app_key, secret, access_token);
            console.error("Missing required parameters: app_key, secret, or access_token");
            throw new Error("Missing required parameters: app_key, secret, or access_token");
        }

        request.query.access_token = access_token;
        request.query.app_key = app_key;
        request.query.secret = secret;
        request.query.path = "/authorization/202309/shops";
        const timestamp = Math.floor(Date.now() / 1000);
        const header = request.headers['content-type'];
        const sign = generateSign(request, secret, timestamp, header);

        // Define your request details
        const options = {
            method: "GET",
            url: "https://open-api.tiktokglobalshop.com/authorization/202309/shops",
            query: {
                app_key: process.env.TIKTOK_SHOP_APP_KEY,
                sign: "{{sign}}",
                timestamp: "{{timestamp}}"
            },
            headers: {
                "x-tts-access-token": setting.shopAccessToken
            }
        };

        // Prepare the request object for signature calculation
        const req = {
            url: {
                path: "/authorization/202309/shops",
                query: Object.entries(options.query).map(([key, value]) => ({ key, value }))
            },
            body: null // No body for GET requests
        };

        // Update the query parameters with calculated values
        options.query.sign = sign;
        options.query.timestamp = timestamp;

        // Interpolate URL
        const queryString = new URLSearchParams(options.query).toString();
        options.url = `${options.url}?${queryString}`;

        // Make the GET request

        const response = await axios({
            method: options.method,
            url: options.url,
            headers: options.headers
        });

        // create shop
        console.log(response.data);
        if (response.data.code === 0) {
            // get user
            const user = await prisma.user.findUnique({
                where: {
                    id: request.userId,
                },
            });

            for (const shop of response.data.data.shops) {
                // find shop by code
                const existingShop = await prisma.shop.findUnique({
                    where: {
                        code: shop.code,
                    },
                });

                if (existingShop) {
                    // update
                    await prisma.shop.update({
                        where: {
                            id: existingShop.id,
                        },
                        data: {
                            status: "authorized",
                            signString: sign,
                            tiktokShopCipher: shop.cipher,
                            tiktokTimestamp: timestamp,
                            tiktokShopId: shop.id
                        },
                    });
                } else {
                    const newShop = await prisma.shop.create({
                        data: {
                            name: shop.name,
                            code: shop.code,
                            userId: user.id,
                            status: "authorized",
                            refreshToken: process.env.TIKTOK_SHOP_REFRESH_TOKEN,
                            accessToken: access_token,
                            priceDiff: 0,
                            shopItems: 0,
                            images: [],
                            signString: sign,
                            tiktokShopCipher: shop.cipher,
                            tiktokTimestamp: timestamp,
                            tiktokShopId: shop.id
                        },
                    });
                }
            }

            res.status(200).json(response.data);
        }
    } catch (error) {
        console.error("Error:", error.response ? error.response.data : error.message);
    }
};

// get shop info from tiktok
export const getTiktokShopInfo = async (req, res) => {

}

export const getMembersOnShop = async (req, res) => {
    try {
        if (!req.params.id) {
            return res.status(400).json({ message: "Missing shop id" });
        }
        const shop = await prisma.shop.findUnique({
            where: {
                id: req.params.id
            }
        });

        if (!shop) {
            return res.status(404).json({ message: "Shop not found" });
        }
        console.log(shop);

        const users = await prisma.user.findMany({
            where: {
                isActive: 1
            }
        });
        console.log(users);

        let shopUsers = [];
        users.forEach(user => {
            if (user.shops.includes(shop.id)) {
                shopUsers.push(user);
            }
        });
        console.log(shopUsers);

        res.status(200).json(shopUsers);
    } catch (error) {
        console.log(error);
    }
}

export const syncAllOrderShops = async (req, res) => {
    try {
        const reqUser = await prisma.user.findUnique({
            where: {
                id: req.userId
            }
        });

        if (!reqUser) {
            return res.status(404).json({ message: "User not found" });
        }
        if (reqUser.isAdmin == 1) {
            const shops = await prisma.shop.findMany();
            for (const shop of shops) {
                await reqSyncOrders(req, shop);
            }                    
        } else {
            // get default shop
            const shop = await getDefaultShop(req);
            if (!shop) {
                return res.status(404).json({ message: "Default shop not found" });
            }            
            await reqSyncOrders(req, shop);
        }

        res.status(200).json({ message: "Shops synced successfully" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Failed to sync shops" });
    }
}

export const syncOrders = async (req, res) => {
    try {
        const shopId = req.params.id;

        if (!shopId) {
            return res.status(400).json({ error: "Missing shop id" });
        }

        // get request shop
        const shop = await prisma.shop.findUnique({
            where: {
                id: shopId
            }
        });
        if (!shop) {
            return res.status(500).json({ error: "Failed to get shop" });
        }

        await reqSyncOrders(req, shop);

        res.status(200).json({ message: "Orders synced successfully" });
    } catch (error) {
        console.log(error);
    }
}

export const syncProducts = async (req, res) => {
    try {
        const shopId = req.params.id;

        if (!shopId) {
            return res.status(400).json({ error: "Missing shop id" });
        }

        // get request shop
        const shop = await prisma.shop.findUnique({
            where: {
                id: shopId
            }
        });
        if (!shop) {
            return res.status(500).json({ error: "Failed to get shop" });
        }

        const result = await processSyncProducts(req, shop);

        if (result) {
            res.status(200).json({ message: "Products synced successfully" });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Failed to sync products" });
    }
}

export const syncAllShops = async (req, res) => {
    try {
        const reqUser = await prisma.user.findUnique({
            where: {
                id: req.userId
            }
        });

        if (!reqUser) {
            return res.status(404).json({ message: "User not found" });
        }
        if (reqUser.isAdmin == 1) {
            const shops = await prisma.shop.findMany();
            for (const shop of shops) {
                await processSyncProducts(req, shop);
            }                    
        } else {
            // get default shop
            const shop = await getDefaultShop(req);
            if (!shop) {
                return res.status(404).json({ message: "Default shop not found" });
            }            
            await processSyncProducts(req, shop);
        }

        res.status(200).json({ message: "Shops synced successfully" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Failed to sync shops" });
    }
}

// refresh token
export const refreshToken = async (req, res) => {
    const url = 'https://auth.tiktok-shops.com/api/v2/token/refresh';

    console.log('Refreshing token...');
    // Get first setting
    const setting = await prisma.setting.findFirst();

    const params = {
        app_key: process.env.TIKTOK_SHOP_APP_KEY,
        app_secret: process.env.TIKTOK_SHOP_APP_SECRET,
        refresh_token: setting.shopRefreshToken,
        grant_type: 'refresh_token'
    };

    try {
        const response = await axios.get(url, { params });
        const { code, message, data } = response.data;

        console.log('API Response:', response.data);

        if (code === 0 && message === 'success') {
            const accessToken = data.access_token;
            const refreshToken = data.refresh_token;

            console.log('Access Token:', accessToken);
            console.log('Refresh Token:', refreshToken);

            setting.shopAccessToken = accessToken;
            setting.shopRefreshToken = refreshToken;
            const updatedSetting = await prisma.setting.update({
                where: {
                    id: setting.id,
                },
                data: {
                    shopAccessToken: accessToken,
                    shopRefreshToken: refreshToken
                },
            });

            res.status(200).json({ accessToken, refreshToken });
        } else {
            console.error('API Error:', response.data);
            throw new Error('Failed to refresh token');
        }
    } catch (error) {
        console.error('Error refreshing token:', error.message);
        throw error;
    }
}