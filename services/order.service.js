import prisma from "../lib/prisma.js";
import { callTiktokApi } from "./tiktok.service.js";
import { readJSONFile } from "../helper/helper.js";
import fs from "fs";

const ORDER_FOLDER = "./dummy/tiktok/orders/shop/";

export const getTiktokOrders = async (req, shop, payload) => {
    try {
        const extraParams = {
            'shop_cipher': shop.tiktokShopCipher,
            'page_size': 20,
            'sort_order': 'DESC',
            'page_token': '',
            'sort_field': 'create_time'
        }
        
        if (payload.nextPageToken) {
            extraParams.page_token = payload.nextPageToken;
        }
        const response = await callTiktokApi(req, shop, false, false, "POST", "/order/202309/orders/search", "application/json", extraParams);

        console.log(response.data);
        if (response.data.data) {
            return response.data.data;
        }
        return false;
    } catch (error) {
        console.log();
    }
}

export const getLocalTiktokOrders = async (shop) => {
    try {
        let page = 1;
        let hasJsonFile = true;
        let orders = [];
        while (hasJsonFile) {
            // get local json file
            const jsonFilePath = ORDER_FOLDER + shop.id + "/" + page + ".json";
            console.log(jsonFilePath);
            if (!fs.existsSync(jsonFilePath)) {
                hasJsonFile = false;
                break;
            }
            const jsonFileData = await readJSONFile(jsonFilePath);
            if (!jsonFileData) {
                hasJsonFile = false;
                break;
            }
            console.log(jsonFileData);

            orders = orders.concat(jsonFileData.orders);
            page++;
        }

        // append shop.id to each order
        orders.forEach(order => {
            order.shopId = shop.id;
        });

        console.log(orders);
        return orders;
    } catch (error) {
        console.log(error);
    }
}

export const getTiktokProducts = async (req, shop, payload) => {
    try {
        const extraParams = {
            "shop_cipher": shop.tiktokShopCipher,
            "page_size": 100,
            "page_token": ""
        }
        
        if (payload.nextPageToken) {
            extraParams.page_token = payload.nextPageToken;
        }
        console.log(extraParams);
        const response = await callTiktokApi(req, shop, payload, false, "POST", "/product/202312/products/search", "application/json", extraParams);

        console.log(response.data);
        if (response.data.data) {
            return response.data.data;
        }
        return true;
    } catch (error) {
        console.log(error);
        return false;
    }
}