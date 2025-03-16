import prisma from "../lib/prisma.js";
import jwt from "jsonwebtoken";
import fetch from "node-fetch";
import axios from "axios";

export const crawlAmazonProduct = async (req, res) => {
  try {
    // check Bearer token
    let token = req.headers.authorization.split(" ")[1];
    // compare with accessToken in setting
    const settings = await prisma.setting.findMany();
    if (!settings.length) {
      res.status(404).json({ message: "Setting not found" });
    }
    const setting = settings[0];
    if (setting.accessToken !== token) {
      res.status(401).json({ message: "Unauthorized" });
    }

    // get filter
    const filter = await prisma.filter.findFirst();

    const {
      title,
      images,
      price,
      crawlUrl,
      description,
      productInfo,
      deliveryTime,
    } = req.body;

    const users = await prisma.user.findMany();
    const user = users[0];

    const listing = await prisma.listing.create({
      data: {
        name: title,
        images,
        price,
        crawlUrl,
        sku: productInfo.asin,
        productDimension: productInfo.productDimensions || null,
        packageDimension: productInfo.packageDimensions || null,
        itemModelNumber: productInfo.modelNum || null,
        upc: productInfo.upc || null,
        manufacturer: productInfo.manufacture || null,
        countryOfOrigin: productInfo.originCountry || null,
        description: description,
        userId: user.id,
      },
    });

    // if productInfo.asin in filter.asin, send tele noti
    if (filter.asin && filter.asin.includes(productInfo.asin)) {
      const response = await sendTelegramNotification(
        `Sản phẩm cần theo dõi ${title}`
      );
    }

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // crawl amazon product
    res.status(201).json({
      message: "Crawled Amazon product successfully!",
    });
  } catch (e) {
    console.log(`Error: ${e.message}\nStack: ${e.stack.split("\n")[1]}`);

    res.status(500).json({ message: e.message });
  }
};

export const getListings = async (req, res) => {
  try {
    const {
      page = 1,
      limit = process.env.DEFAULT_LIMIT,
      name,
      sku,
      sort,
    } = req.query;

    const pageNum = parseInt(page, 10);
    const pageSize = parseInt(limit, 10);

    const where = {
      ...(name && {
        name: {
          contains: name,
          mode: "insensitive",
        },
      }),
      ...(sku && {
        sku: {
          contains: sku,
          mode: "insensitive",
        },
      }),
      isActive: 1,
    };

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

    const total = await prisma.listing.count({
      where,
    });

    // get listings and sort by createdAt desc
    const listings = await prisma.listing.findMany({
      where,
      skip: (pageNum - 1) * pageSize,
      take: pageSize,
      orderBy,
    });

    res.status(200).json({
      total,
      page: pageNum,
      limit: pageSize,
      listings,
    });
  } catch (e) {
    console.log(`Error: ${e.message}\nStack: ${e.stack.split("\n")[1]}`);

    res.status(500).json({ message: e.message });
  }
};

export const updateListing = async (req, res) => {
  try {
    const listing = await prisma.listing.update({
      where: {
        id: req.params.id,
      },
      data: req.body,
    });
    res.status(200).json(listing);
  } catch (e) {
    console.log(`Error: ${e.message}\nStack: ${e.stack.split("\n")[1]}`);
  }
};

export const getListing = async (req, res) => {
  try {
    const listing = await prisma.listing.findUnique({
      where: {
        id: req.params.id,
        isActive: 1,
      },
    });
    res.status(200).json(listing);
  } catch (e) {
    console.log(`Error: ${e.message}\nStack: ${e.stack.split("\n")[1]}`);

    res.status(500).json({ message: e.message });
  }
};

export const deleteListing = async (req, res) => {
  try {
    await prisma.listing.update({
      where: {
        id: req.params.id,
      },
      data: {
        isActive: 0,
      },
    });

    res.status(200).json({ message: "Listing deleted" });
  } catch (e) {
    console.log(`Error: ${e.message}\nStack: ${e.stack.split("\n")[1]}`);

    res.status(500).json({ message: e.message });
  }
};

export const getListingsOnShop = async (req, res) => {
  try {
    const listings = await prisma.listingOnShop.findMany();
    // loop listings and get new array, find shop with shopId
    let newListings = [];
    for (const listing of listings) {
      // find shopId in newListings
      // const shopId = listing.shopId;
      // const existingListing = newListings.find(listing => listing.shopId === shopId);
      // if (existingListing) {
      //     // Check if the existing listing has the same shopId
      //     if (existingListing.shopId === shopId) {
      //         continue;
      //     }
      // }

      const shop = await prisma.shop.findUnique({
        where: {
          id: listing.shopId,
        },
      });
      listing.shop = shop;
      newListings.push(listing);
    }

    res.status(200).json(newListings);
  } catch (e) {
    console.log(`Error: ${e.message}\nStack: ${e.stack.split("\n")[1]}`);

    res.status(500).json({ message: e.message });
  }
};

const sendTelegramNotification = async (message) => {
  // get first setting
  const setting = await prisma.setting.findFirst();

  const TELEGRAM_API_URL = `https://api.telegram.org/bot${setting.telegramToken}/sendMessage`;
  const CHAT_IDS = setting.telegramReceiver.includes(",")
    ? setting.telegramReceiver.split(",")
    : [setting.telegramReceiver];

  try {
    // save to Noti
    await prisma.noti.create({
      data: {
        message: message,
      },
    });

    // loop CHAT_IDS
    for (const CHAT_ID of CHAT_IDS) {
      if (!CHAT_ID) {
        continue;
      }

      const response = await fetch(TELEGRAM_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: CHAT_ID, text: message }),
      });

      if (!response.ok) {
        continue;
      }
    }

    return true;
  } catch (error) {
    console.error("Error sending notification:", error);
    return false;
  }
};
