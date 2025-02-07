import prisma from "../lib/prisma.js";
import axios from "axios";
import fs from "fs";
import { fileURLToPath } from 'url';
import path from "path";
import { generateSign } from "../helper/tiktok.api.js";
import { getDefaultShop } from "../helper/helper.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const callTiktokApi = async (req, shop, payload = false, formData = false, method, pathURL, contentType, extraParams = {}) => {
    try {
        const app_key = process.env.TIKTOK_SHOP_APP_KEY;
        const secret = process.env.TIKTOK_SHOP_APP_SECRET;
        const API = process.env.TIKTOK_SHOP_API;

        // console.log(app_key);
        // console.log(secret);
        // console.log(API);

        //TODO: Lấy shop access token theo default shop
        const access_token = shop.shopAccessToken;

        // console.log(shop);
        const shop_cipher = shop.tiktokShopCipher;

        // Param
        req.query.access_token = access_token;
        req.query.app_key = app_key;
        req.query.secret = secret;
        req.query.path = pathURL;
        if (extraParams) {
            // loop through extraParams and add to req.query
            for (const key in extraParams) {
                req.query[key] = extraParams[key];
            }
        }
        const timestamp = Math.floor(Date.now() / 1000);
        const header = contentType;
        const sign = generateSign(req, secret, timestamp, header, payload);
        // console.log(sign);

        // define query params
        let params = {
            app_key: app_key,
            sign: "{{sign}}",
            timestamp: "{{timestamp}}"
        }
        // if extraParams is not empty, merge it with params
        if (Object.keys(extraParams).length > 0) {
            params = { ...params, ...extraParams };
        }
        // console.log(params);

        const options = {
            method: method,
            url: API + pathURL,
            query: params,
            headers: {
                "x-tts-access-token": access_token,
                "content-type": contentType,
            }
        };
        // console.log(options);

        // Update the query parameters with calculated values        
        options.query.sign = sign;
        options.query.timestamp = timestamp;
        // console.log(payload);

        // Interpolate URL
        const queryString = new URLSearchParams(options.query).toString();
        options.url = `${options.url}?${queryString}`;

        // console.log(options.url);

        let response = null;
        if (formData) {
            response = await axios({
                method: options.method,
                url: options.url,
                data: formData,
                headers: options.headers
            });
        } else if (payload) {
            // console.log(payload);
            response = await axios({
                method: options.method,
                url: options.url,
                data: payload,
                headers: options.headers
            });            
        } else {
            response = await axios({
                method: options.method,
                url: options.url,                
                headers: options.headers
            });
        }  

        return response;
    } catch (error) {
        console.log(error);
        return false;
    }
}

export const downloadImage = async (uri) => {
    const tempFilePath = path.join(__dirname, 'temp_image.png');
    // console.log(tempFilePath);
    try {
        const response = await axios({
            url: uri,
            method: 'GET',
            responseType: 'stream',
        });

        const writer = fs.createWriteStream(tempFilePath);
        response.data.pipe(writer);

        // Chờ ghi file hoàn tất
        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
        // console.log(tempFilePath);
        return tempFilePath;
    } catch (error) {
        console.log('Error downloading image:', error);
        throw error;
    }
}