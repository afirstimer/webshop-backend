import prisma from "../lib/prisma.js";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";

export const getProductValueByKey = (productInfo, key) => {
  const actualKey = Object.keys(productInfo).find((k) => k.includes(key));
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
};

export const readJSONFile = async (filePath) => {
  try {
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading JSON file:", error.message);
    return [];
  }
};

export const writeJSONFile = async (filePath, data) => {
  try {
    // console.log(filePath);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error writing JSON file:", error.message);
    throw error;
  }
};

export const getDefaultShop = async (req) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return null;

    if (user.defaultShop === null) return null;
    const shop = await prisma.shop.findUnique({
      where: { id: user.defaultShop },
    });
    if (shop) return shop;
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const proceedRefreshToken = async (shop) => {
  const url = "https://auth.tiktok-shops.com/api/v2/token/refresh";

  const params = {
    app_key: process.env.TIKTOK_SHOP_APP_KEY,
    app_secret: process.env.TIKTOK_SHOP_APP_SECRET,
    refresh_token: shop.shopRefreshToken, //REQUIRED
    grant_type: "refresh_token",
  };

  try {
    const response = await axios.get(url, { params });
    const { code, message, data } = response.data;

    if (code === 0 && message === "success") {
      const accessToken = data.access_token;
      const refreshToken = data.refresh_token;

      await prisma.shop.update({
        where: {
          id: shop.id,
        },
        data: {
          shopAccessToken: accessToken,
          shopRefreshToken: refreshToken,
        },
      });

      return { accessToken, refreshToken };
    } else {
      console.error("API Error:", response.data);
      throw new Error("Failed to refresh token");
    }
  } catch (error) {
    console.error("Error refreshing token:", error.message);
    return false;
  }
};

export const getPercentPromo = (inputPrice, priceList) => {
  // Ensure input is a number
  const price = parseFloat(inputPrice);

  // If price is lower than the smallest price, return the highest percent
  const minPrice = Math.min(...priceList.map((item) => item.price));
  if (price < minPrice) {
    return priceList[0].percent; // First item has the highest discount
  }

  // Find the highest price that is <= inputPrice
  const matched = priceList
    .filter((item) => price >= item.price) // Get valid price options
    .sort((a, b) => b.price - a.price)[0]; // Get the highest price match

  return matched ? matched.percent : null;
};
