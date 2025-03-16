import prisma from "../lib/prisma.js";
import { generateSign } from "../helper/tiktok.api.js";
import axios from "axios";
import {
  createFolder,
  getDefaultShop,
  writeJSONFile,
  proceedRefreshToken,
} from "../helper/helper.js";
import {
  getTiktokOrders,
  getTiktokProducts,
} from "../services/order.service.js";
import {
  createOrders,
  createProducts,
  processSyncProducts,
  processSyncPromos,
  refreshShopToken,
  reqActiveShops,
  reqSyncOrders,
} from "../services/shop.service.js";
import path from "path";
import {
  callTiktokApi,
  callTiktokAuthApi,
  reqAuthorizeShop,
} from "../services/tiktok.service.js";

const ORDER_FILE = "./dummy/tiktok/orders.json";
const ORDER_FOLDER = "./dummy/tiktok/orders/shop/";

// get all shops
export const getShops = async (req, res) => {
  try {
    const {
      page = 1,
      limit = process.env.DEFAULT_LIMIT,
      search,
      sort,
    } = req.query;

    /**
     * If user is admin, get all shops
     * If user is manager, get all shops of the team
     * If user is user, get all shops of the user
     */
    const requestUser = await prisma.user.findUnique({
      where: {
        id: req.userId,
      },
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
        }),
        isActive: 1,
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
        }),
        isActive: 1,
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
      where,
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
      shops,
    });
  } catch (e) {
    console.log(`Error: ${e.message}\nStack: ${e.stack.split("\n")[1]}`);

    res.status(500).json({ message: "Failed to get shops!" });
  }
};

export const getAllShops = async (req, res) => {
  try {
    const shops = await prisma.shop.findMany({
      where: {
        isActive: 1,
      },
    });
    res.status(200).json(shops);
  } catch (e) {
    console.log(`Error: ${e.message}\nStack: ${e.stack.split("\n")[1]}`);

    res.status(500).json({ message: "Failed to get shops!" });
  }
};

// create shop
export const createShop = async (req, res) => {
  try {
    const { name, accessToken, refreshToken, tiktokAuthCode } = req.body;
    const newShop = await prisma.shop.create({
      data: {
        tiktokAuthCode,
        name: name,
        accessToken,
        shopRefreshToken: refreshToken,
        status: "CONNECTED",
        priceDiff: 1,
        shopItems: 99,
      },
    });

    const authorizeResponse = await reqAuthorizeShop(req, newShop);

    if (!authorizeResponse) {
      return res.status(500).json({ message: "Failed to authorize shop" });
    }

    const resultFreshToken = await proceedRefreshToken(newShop);
    if (!resultFreshToken) {
      return res.status(500).json({ message: "Failed to refresh token" });
    }
    res
      .status(201)
      .json({ message: "Shop created successfully", shop: newShop });
  } catch (e) {
    console.log(`Error: ${e.message}\nStack: ${e.stack.split("\n")[1]}`);

    res.status(500).json({ message: "Failed to create shop!" });
  }
};

// get shop
export const getShop = async (req, res) => {
  try {
    const shop = await prisma.shop.findUnique({
      where: {
        id: req.params.id,
      },
      include: {
        User: {
          select: {
            username: true,
            email: true,
            avatar: true,
          },
        },
      },
    });
    res.status(200).json(shop);
  } catch (e) {
    console.log(`Error: ${e.message}\nStack: ${e.stack.split("\n")[1]}`);
  }
};

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
      console.error(
        "Missing required parameters: app_key, secret, or access_token"
      );
      throw new Error(
        "Missing required parameters: app_key, secret, or access_token"
      );
    }

    const shopId = request.params.id;
    const shop = await prisma.shop.findUnique({
      where: {
        id: shopId,
      },
    });

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    request.query.path = "/order/202309/orders/search";
    request.query.access_token = access_token;
    request.query.app_key = app_key;
    request.query.secret = secret;
    request.query.shop_cipher = shop.tiktokShopCipher;
    request.query.page_size = 20;
    request.query.sort_order = "ASC";
    request.query.sort_field = "create_time";
    request.query.page_token = "";
    const timestamp = Math.floor(Date.now() / 1000);
    const header = request.headers["content-type"];
    const sign = generateSign(request, secret, timestamp, header);

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
        sort_order: "ASC",
        sort_field: "create_time",
        page_token: "",
      },
      headers: {
        "x-tts-access-token": setting.shopAccessToken,
        "content-type": "application/json",
      },
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
      headers: options.headers,
    });

    if (response.data.message == "Success") {
      await writeJSONFile(ORDER_FILE, response.data.data);

      res.status(200).json(response.data.data);
    } else {
      console.error("Error:", response.data);
      throw new Error("Failed to get active shops");
    }
  } catch (error) {
    console.error(
      "Error:",
      error.response ? error.response.data : error.message
    );
  }
};

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
      console.error(
        "Missing required parameters: app_key, secret, or access_token"
      );
      throw new Error(
        "Missing required parameters: app_key, secret, or access_token"
      );
    }

    request.query.path = "/seller/202309/shops";
    request.query.access_token = access_token;
    request.query.app_key = app_key;
    request.query.secret = secret;
    const timestamp = Math.floor(Date.now() / 1000);
    const header = request.headers["content-type"];
    const sign = generateSign(request, secret, timestamp, header);

    // Define your request details
    const options = {
      method: "GET",
      url: "https://open-api.tiktokglobalshop.com/seller/202309/shops",
      query: {
        app_key: app_key,
        sign: "{{sign}}",
        timestamp: "{{timestamp}}",
      },
      headers: {
        "x-tts-access-token": setting.shopAccessToken,
      },
    };

    // Prepare the request object for signature calculation
    const req = {
      url: {
        path: "/authorization/202309/shops",
        query: Object.entries(options.query).map(([key, value]) => ({
          key,
          value,
        })),
      },
      body: null, // No body for GET requests
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
      headers: options.headers,
    });

    if (response.data.message == "Success") {
      const shops = response.data.data.shops;
      res.status(200).json(shops);
    } else {
      console.error("Error:", response.data);
      throw new Error("Failed to get active shops");
    }
  } catch (error) {
    console.error(
      "Error:",
      error.response ? error.response.data : error.message
    );
  }
};

// get shops
export const getShopsByUser = async (req, res) => {
  try {
    const shops = await prisma.shop.findMany({
      where: {
        userId: req.params.id,
        isActive: 1,
      },
      include: {
        User: {
          select: {
            username: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    res.status(200).json(shops);
  } catch (e) {
    console.log(`Error: ${e.message}\nStack: ${e.stack.split("\n")[1]}`);
  }
};

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
        managers: shopManagers,
      },
    });

    res.status(200).json(updatedShop);
  } catch (e) {
    console.log(`Error: ${e.message}\nStack: ${e.stack.split("\n")[1]}`);
  }
};

// authorize shop
export const requestAuthorizedShops = async (request, res) => {
  try {
    const app_key = request.query.app_key;
    const secret = request.query.secret;
    const access_token = request.query.access_token;

    if (!app_key || !secret || !access_token) {
      console.error(
        "Missing required parameters: app_key, secret, or access_token"
      );
      throw new Error(
        "Missing required parameters: app_key, secret, or access_token"
      );
    }

    request.query.access_token = access_token;
    request.query.app_key = app_key;
    request.query.secret = secret;
    request.query.path = "/authorization/202309/shops";
    const timestamp = Math.floor(Date.now() / 1000);
    const header = request.headers["content-type"];
    const sign = generateSign(request, secret, timestamp, header);

    // Define your request details
    const options = {
      method: "GET",
      url: "https://open-api.tiktokglobalshop.com/authorization/202309/shops",
      query: {
        app_key: process.env.TIKTOK_SHOP_APP_KEY,
        sign: "{{sign}}",
        timestamp: "{{timestamp}}",
      },
      headers: {
        "x-tts-access-token": access_token,
      },
    };

    // Prepare the request object for signature calculation
    const req = {
      url: {
        path: "/authorization/202309/shops",
        query: Object.entries(options.query).map(([key, value]) => ({
          key,
          value,
        })),
      },
      body: null, // No body for GET requests
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
      headers: options.headers,
    });

    // create shop
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
              tiktokShopId: shop.id,
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
              tiktokShopId: shop.id,
            },
          });
        }
      }

      res.status(200).json(response.data);
    }
  } catch (error) {
    console.error(
      "Error:",
      error.response ? error.response.data : error.message
    );
  }
};

// get shop info from tiktok
export const getTiktokShopInfo = async (req, res) => {};

export const getMembersOnShop = async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({ message: "Missing shop id" });
    }
    const shop = await prisma.shop.findUnique({
      where: {
        id: req.params.id,
      },
    });

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    const users = await prisma.user.findMany({
      where: {
        isActive: 1,
      },
    });

    let shopUsers = [];
    users.forEach((user) => {
      if (user.shops.includes(shop.id)) {
        shopUsers.push(user);
      }
    });

    res.status(200).json(shopUsers);
  } catch (e) {
    console.log(`Error: ${e.message}\nStack: ${e.stack.split("\n")[1]}`);
  }
};

export const syncAllOrderShops = async (req, res) => {
  try {
    const reqUser = await prisma.user.findUnique({
      where: {
        id: req.userId,
      },
    });

    if (!reqUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // get default shop
    const shop = await getDefaultShop(req);
    if (!shop) {
      return res.status(404).json({ message: "Default shop not found" });
    }
    await reqSyncOrders(req, shop);

    res.status(200).json({ message: "Shops synced successfully" });
  } catch (e) {
    console.log(`Error: ${e.message}\nStack: ${e.stack.split("\n")[1]}`);

    res.status(500).json({ message: "Failed to sync shops" });
  }
};

export const syncOrders = async (req, res) => {
  try {
    const shopId = req.params.id;

    if (!shopId) {
      return res.status(400).json({ error: "Missing shop id" });
    }

    // get request shop
    const shop = await prisma.shop.findUnique({
      where: {
        id: shopId,
      },
    });
    if (!shop) {
      return res.status(500).json({ error: "Failed to get shop" });
    }

    // refresh token first
    await refreshShopToken(shop);
    // get again shop
    const updatedShop = await prisma.shop.findUnique({
      where: {
        id: shopId,
      },
    });

    await reqSyncOrders(req, updatedShop);

    res.status(200).json({ message: "Orders synced successfully" });
  } catch (e) {
    console.log(`Error: ${e.message}\nStack: ${e.stack.split("\n")[1]}`);
  }
};

export const syncProducts = async (req, res) => {
  try {
    const shopId = req.params.id;

    if (!shopId) {
      return res.status(400).json({ error: "Missing shop id" });
    }

    // get request shop
    const shop = await prisma.shop.findUnique({
      where: {
        id: shopId,
      },
    });
    if (!shop) {
      return res.status(500).json({ error: "Failed to get shop" });
    }
    // refresh token first
    await refreshShopToken(shop);
    // get again shop
    const updatedShop = await prisma.shop.findUnique({
      where: {
        id: shopId,
      },
    });

    const result = await processSyncProducts(req, updatedShop);

    if (result) {
      res.status(200).json({ message: "Products synced successfully" });
    }
  } catch (e) {
    console.log(`Error: ${e.message}\nStack: ${e.stack.split("\n")[1]}`);

    res.status(500).json({ message: "Failed to sync products" });
  }
};

export const syncAllShops = async (req, res) => {
  try {
    const reqUser = await prisma.user.findUnique({
      where: {
        id: req.userId,
      },
    });

    if (!reqUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // get default shop
    const shop = await getDefaultShop(req);
    if (!shop) {
      return res.status(404).json({ message: "Default shop not found" });
    }
    await processSyncProducts(req, shop);

    res.status(200).json({ message: "Shops synced successfully" });
  } catch (e) {
    console.log(`Error: ${e.message}\nStack: ${e.stack.split("\n")[1]}`);

    res.status(500).json({ message: "Failed to sync shops" });
  }
};

export const syncAllShopPromos = async (req, res) => {
  try {
    const reqUser = await prisma.user.findUnique({
      where: {
        id: req.userId,
      },
    });

    if (!reqUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // get default shop
    const shop = await getDefaultShop(req);
    if (!shop) {
      return res.status(404).json({ message: "Default shop not found" });
    }
    const result = await processSyncPromos(req, shop);

    res.status(200).json({ message: "Shops synced successfully" });
  } catch (e) {
    console.log(`Error: ${e.message}\nStack: ${e.stack.split("\n")[1]}`);

    res.status(500).json({ message: "Failed to sync shops" });
  }
};

export const syncShopPromo = async (req, res) => {
  try {
    const { shopId } = req.params;
    // get default shop
    const shop = await prisma.shop.findUnique({
      where: {
        id: shopId,
      },
    });
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    await refreshShopToken(shop);
    const updatedShop = await prisma.shop.findUnique({
      where: {
        id: shopId,
      },
    });

    const result = await processSyncPromos(req, updatedShop);
    res.status(200).json({ message: "Shops synced successfully" });
  } catch (e) {
    console.log(`Error: ${e.message}\nStack: ${e.stack.split("\n")[1]}`);

    res.status(500).json({ message: "Failed to sync shop promo" });
  }
};

// refresh token
export const refreshToken = async (req, res) => {
  const url = "https://auth.tiktok-shops.com/api/v2/token/refresh";

  // console.log('Refreshing token...');
  // Get first setting
  const setting = await prisma.setting.findFirst();

  const params = {
    app_key: process.env.TIKTOK_SHOP_APP_KEY,
    app_secret: process.env.TIKTOK_SHOP_APP_SECRET,
    refresh_token: setting.shopRefreshToken,
    grant_type: "refresh_token",
  };

  try {
    const response = await axios.get(url, { params });
    const { code, message, data } = response.data;

    if (code === 0 && message === "success") {
      const accessToken = data.access_token;
      const refreshToken = data.refresh_token;

      setting.shopAccessToken = accessToken;
      setting.shopRefreshToken = refreshToken;
      const updatedSetting = await prisma.setting.update({
        where: {
          id: setting.id,
        },
        data: {
          shopAccessToken: accessToken,
          shopRefreshToken: refreshToken,
        },
      });

      res.status(200).json({ accessToken, refreshToken });
    } else {
      console.error("API Error:", response.data);
      throw new Error("Failed to refresh token");
    }
  } catch (error) {
    console.error("Error refreshing token:", error.message);
    throw error;
  }
};

export const deleteShop = async (req, res) => {
  try {
    await prisma.shop.update({
      where: {
        id: req.params.id,
      },
      data: {
        isActive: 0,
      },
    });

    res.status(200).json({ message: "Shop deleted successfully" });
  } catch (e) {
    console.log(`Error: ${e.message}\nStack: ${e.stack.split("\n")[1]}`);

    res.status(500).json({ message: "Failed to delete shop" });
  }
};
