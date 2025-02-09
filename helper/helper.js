import prisma from '../lib/prisma.js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

export const getProductValueByKey = (productInfo, key) => {
  const actualKey = Object.keys(productInfo).find(k => k.includes(key));
  return actualKey ? productInfo[actualKey] : null;
};

export const createFolder = async (folderPath) => {
  try {        
    await fs.mkdir(folderPath, { recursive: true });
    // console.log("Folder created successfully", folderPath);
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
}

export const readJSONFile = async (filePath) => {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading JSON file:', error.message);
    return [];
  }
};

export const writeJSONFile = async (filePath, data) => {
  try {    
    // console.log(filePath);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing JSON file:', error.message);
    throw error;
  }
};

export const getDefaultShop = async (req) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return null;

    if (user.defaultShop === null) return null;
    const shop = await prisma.shop.findUnique({ where: { id: user.defaultShop } });
    if (shop) return shop;
  } catch (error) {
    console.log(error);
    return null;
  }
}

/**
 * Refreshes the access and refresh tokens for a given shop using the TikTok API.
 *
 * @param {Object} shop - The shop object containing the current refresh token and shop ID.
 * @param {string} shop.shopRefreshToken - The current refresh token of the shop.
 * @param {string} shop.id - The unique identifier of the shop.
 * @returns {Object|boolean} - Returns an object with the new access and refresh tokens if successful,
 *                             or returns false if the operation fails.
 * @throws {Error} - Throws an error if the API call is not successful.
 */

export const proceedRefreshToken = async (shop) => {
  const url = 'https://auth.tiktok-shops.com/api/v2/token/refresh';

  const params = {
    app_key: process.env.TIKTOK_SHOP_APP_KEY,
    app_secret: process.env.TIKTOK_SHOP_APP_SECRET,
    refresh_token: shop.shopRefreshToken,  //REQUIRED
    grant_type: 'refresh_token'
  };

  try {
    const response = await axios.get(url, { params });
    const { code, message, data } = response.data;    

    if (code === 0 && message === 'success') {
      const accessToken = data.access_token;
      const refreshToken = data.refresh_token;

      await prisma.shop.update({
        where: {
          id: shop.id,
        },
        data: {          
          shopAccessToken: accessToken,
          shopRefreshToken: refreshToken
        },
      });

      return { accessToken, refreshToken };
    } else {
      console.error('API Error:', response.data);
      throw new Error('Failed to refresh token');
    }
  } catch (error) {
    console.error('Error refreshing token:', error.message);
    return false
  }
}