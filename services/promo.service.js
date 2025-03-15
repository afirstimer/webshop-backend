import { reqCreateActivity, reqUpdateActivityProduct } from "./deal.service.js";
import { readJSONFile, writeJSONFile, createFolder } from "../helper/helper.js";
import { callTiktokApi } from "./tiktok.service.js";
import { reqActiveShops } from "./shop.service.js";
import fs from "fs";

const PROMO_FOLDER = "./dummy/tiktok/promos/shop/";

export const fetchAllJsonPromos = async () => {
  try {
    // get all shops
    const shops = await reqActiveShops();
    let promos = [];

    for (const shop of shops) {
      let filteredPromos = [];
      const data = await getLocalTiktokPromos(shop);
      // sort data by create_time desc
      data.sort((a, b) => {
        return b.create_time - a.create_time;
      });
      // loop promos
      // id, title, activity_type, begin_time, end_time, status, create_time, update_time, product_level
      for (const promo of data) {
        const filteredPromo = {
          id: promo.id,
          shopId: shop.id,
          title: promo.title,
          activity_type: promo.activity_type,
          begin_time: promo.begin_time,
          end_time: promo.end_time,
          status: promo.status,
          create_time: promo.create_time,
          update_time: promo.update_time,
          product_level: promo.product_level,
        };
        filteredPromos.push(filteredPromo);
      }
      promos = promos.concat(filteredPromos);
    }

    // console.log(promos);
    return promos;
  } catch (error) {
    console.log(error);
    return [];
  }
};

export const getLocalPromos = async (shop) => {
  try {
    let page = 1;
    let hasJsonFile = true;
    let promos = [];
    while (hasJsonFile) {
      // get local json file
      const jsonFilePath = PROMO_FOLDER + shop.id + "/" + page + ".json";
      if (!fs.existsSync(jsonFilePath)) {
        hasJsonFile = false;
        break;
      }
      const jsonFileData = await readJSONFile(jsonFilePath);
      if (!jsonFileData) {
        hasJsonFile = false;
        break;
      }

      promos = promos.concat(jsonFileData.promos);
      page++;
    }

    return promos;
  } catch (error) {
    console.log(error);
  }
};

export const getLocalTiktokPromos = async (shop) => {
  try {
    let page = 1;
    let hasJsonFile = true;
    let promos = [];
    while (hasJsonFile) {
      // get local json file
      const jsonFilePath = PROMO_FOLDER + shop.id + "/" + page + ".json";
      // console.log(jsonFilePath);
      if (!fs.existsSync(jsonFilePath)) {
        hasJsonFile = false;
        break;
      }
      const jsonFileData = await readJSONFile(jsonFilePath);
      if (!jsonFileData) {
        hasJsonFile = false;
        break;
      }
      // console.log(jsonFileData);

      promos = promos.concat(jsonFileData.activities);
      page++;
    }

    return promos;
  } catch (error) {
    console.log(error);
  }
};

export const getAllShopLocalPromos = async () => {
  try {
    // get all shops
    const shops = await reqActiveShops();
    let promos = [];

    for (const shop of shops) {
      let fPromos = [];
      const data = await getLocalPromos(shop);
      // sort data by create_time desc
      data.sort((a, b) => {
        return b.create_time - a.create_time;
      });
      for (const promo of data) {
        promo.shop = shop;
      }
      promos = promos.concat(data);
    }

    return promos;
  } catch (error) {
    console.log(error);
    return [];
  }
};

export const syncPromosToLocal = async (req, shop) => {
  try {
    let isHasPageToken = true;
    let nextPageToken = null;
    let page = 1;
    const folderPath = path.join(PROMO_FOLDER, shop.id);
    const result = await createFolder(folderPath);
    while (isHasPageToken) {
      const data = await getTiktokPromos(req, shop, {
        status: "",
        activity_title: "",
        page_size: 50,
        page_token: nextPageToken,
      });

      if (data) {
        if (data.next_page_token) {
          nextPageToken = data.next_page_token;
          isHasPageToken = true;
          createPromoFileLocal(data, shop.id + "/" + page + ".json");
        } else {
          createPromoFileLocal(data, shop.id + "/" + page + ".json");
          isHasPageToken = false;
        }
      }
      page++;
    }
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const getTiktokPromos = async (req, shop, payload) => {
  try {
    const extraParams = {
      shop_cipher: shop.tiktokShopCipher,
      shop_id: shop.tiktokShopId,
    };

    const response = await callTiktokApi(
      req,
      shop,
      payload,
      false,
      "POST",
      "/promotion/202309/activities/search",
      "application/json",
      extraParams
    );

    console.log(response.data.data);

    if (response.data.data) {
      return response.data.data;
    }
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const createActivity = async (
  req,
  res,
  shopId,
  productIds,
  startTimeUnix,
  endTimeUnix
) => {
  try {
    // create activity
    const tiktokActivity = await reqCreateActivity(
      req,
      res,
      shopId,
      productIds,
      startTimeUnix,
      endTimeUnix
    );

    if (!tiktokActivity) return false;

    return tiktokActivity;
  } catch (error) {
    return false;
  }
};

export const createActivityProduct = async (
  req,
  res,
  shopId,
  productIds,
  activityId,
  discount,
  qtyLimit,
  qtyPerUser
) => {
  try {
    const updateTiktokActivity = await reqUpdateActivityProduct(
      req,
      res,
      shopId,
      productIds,
      activityId,
      discount,
      qtyLimit,
      qtyPerUser
    );

    return updateTiktokActivity;
  } catch (error) {}
};

export const createPromoFileLocal = async (data, fileName = null) => {
  try {
    if (fileName) {
      const filePath = path.join(PROMO_FOLDER, fileName);
      await writeJSONFile(filePath, data);
      return true;
    }

    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};
