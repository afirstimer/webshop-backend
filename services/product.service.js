import prisma from "../lib/prisma.js";
import path from "path";
import fs from "fs";
import FormData from "form-data";
import { getDefaultShop, readJSONFile } from "../helper/helper.js";
import { downloadImage, callTiktokApi } from "./tiktok.service.js";
import { reqActiveShops } from "./shop.service.js";

const PRODUCT_FOLDER = "./dummy/tiktok/products/shop/";

export const uploadImageToTiktok = async (req, shop, imageUri, useCase) => {
  if (!imageUri) {
    return false;
  }

  try {
    const localFilePath = await downloadImage(imageUri);

    const fileStream = fs.createReadStream(localFilePath);
    const formData = new FormData();

    formData.append("data", fileStream, path.basename(localFilePath));
    formData.append("use_case", useCase);

    const response = await callTiktokApi(
      req,
      shop,
      false,
      formData,
      "POST",
      "/product/202309/images/upload",
      "multipart/form-data"
    );

    if (response.data) {
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
      }
      return response.data;
    }
    return false;
  } catch (error) {
    console.log(
      `Error: ${error.message}\nStack: ${error.stack.split("\n")[1]}`
    );
    return false;
  }
};

export const createTiktokProduct = async (
  req,
  listing,
  template,
  shop,
  draftMode,
  warehouse
) => {
  try {
    // get default shop
    const defaultShop = shop;

    // certificate
    // TODO: hiện tại tạm thời tắt nó đi
    // const certificate = await prisma.certificate.findFirst({
    //   where: {
    //     listingId: listing.id,
    //   },
    // });

    //TODO: Lấy shop access token theo default shop
    const setting = await prisma.setting.findFirst();
    if (!setting) {
      console.error("Setting not found");
      return false;
    }

    // images
    let images = [];
    let mainImage = null;
    // loop images in listing.images and call uploadImageToTiktok . then push to images
    for (let i = 0; i < listing.images.length; i++) {
      req.imageUri = listing.images[i];
      const uploadResponse = await uploadImageToTiktok(
        req,
        shop,
        listing.images[i],
        "MAIN_IMAGE"
      );

      if (uploadResponse.message == "Success") {
        // create Tiktok Image
        let image = await prisma.tiktokImage.create({
          data: {
            uri: uploadResponse.data.uri,
            url: uploadResponse.data.url,
            useCase: uploadResponse.data.use_case,
          },
        });

        // if mainImage is null, set image.uri to mainImage
        if (!mainImage) {
          mainImage = image.uri;
        }

        images.push({
          uri: image.uri,
        });
      }
    }

    // template attributes
    const parsedAttributes = JSON.parse(template.attributes);
    const attributes = parsedAttributes.map((attr) => ({
      id: attr.id,
      values: [
        {
          id: attr.value,
          name: attr.label,
        },
      ],
    }));

    // Calculate price (start price & quantity)
    // let price = listing.price.replace("$", "");
    // let startPrice = price * (1 + shop.priceDiff / 100);
    let startQty = shop.shopItems;

    // skus
    let skus = [];
    // sales_attribute
    const parsedSku = JSON.parse(template.skus);
    // loop through parsedSku and add to salesAttributes
    let salesAttributes = [];
    for (const sku of parsedSku) {
      // only insert one, the first sku
      if (skus.length == 1) {
        break;
      }

      // replace sku image with main image
      sku.image = mainImage;

      salesAttributes.push({
        id: sku.parentId,
        name: sku.name,
        sku_img: {
          uri: sku.image,
        },
        value_id: sku.parentId,
        value_name: sku.code,
      });

      // Calculate sku's price + qty
      let listingPrice = listing.price.replace("$", "");
      let skuPrice = listingPrice;
      let skuQty = sku.qty ? sku.qty : startQty;

      skus.push({
        identifier_code: {
          code: template.identifierValue,
          type: template.identifierCode,
        },
        inventory: [
          {
            quantity: parseInt(sku.qty ? sku.qty : startQty),
            warehouse_id: warehouse, //This is the warehouse id
          },
        ],
        price: {
          amount: skuPrice.toString(),
          currency: "USD",
        },
        sales_attributes: salesAttributes,
        seller_sku: sku.code == "{{code}}" ? listing.sku : sku.code,
        sku_unit_count: skuQty,
      });
    }

    // parse listing.productDimension "1.38 x 1.5 x 1 inches", string to array and remove inches
    const dimensionsArray = listing.productDimension
      .split(" x ")
      .map((dim) => Math.ceil(dim.replace(" inches", "").trim()));

    const payload = {
      // brand_id
      category_id: template.categoryId,
      category_version: "v2",
      // certifications
      description: listing.description,
      is_cod_allowed: template.isCOD ? true : false,
      is_not_for_sale: false,
      is_pre_owned: false,
      listing_platforms: ["TIKTOK_SHOP"],
      main_images: images,
      minimum_order_quantity: 1,
      package_dimensions: {
        height: dimensionsArray[2]
          ? dimensionsArray[2].toString()
          : template.packageHeight.toString(),
        length: dimensionsArray[0]
          ? dimensionsArray[0].toString()
          : template.packageLength.toString(),
        unit: "CENTIMETER",
        width: dimensionsArray[1]
          ? dimensionsArray[1].toString()
          : template.packageWidth.toString(),
      },
      package_weight: {
        unit: "KILOGRAM",
        value: template.packageWeight,
      },
      product_attributes: attributes,
      save_mode: draftMode ? "AS_DRAFT" : "LISTING",
      shipping_insurance_requirement: "REQUIRED",
      skus: skus,
      title: listing.name,
    };

    console.log(payload);

    // Build query params
    const extraParams = {
      shop_cipher: defaultShop.tiktokShopCipher,
      access_token: defaultShop.shopAccessToken,
      version: "202309",
      shop_id: defaultShop.tiktokShopId,
    };
    // console.log(extraParams);

    // console.log(payload);

    const response = await callTiktokApi(
      req,
      shop,
      payload,
      false,
      "POST",
      "/product/202309/products",
      "application/json",
      extraParams
    );

    // console.log(response);

    if (response.data) {
      return response.data;
    }
    return false;
  } catch (error) {
    console.log(
      `Error: ${error.message}\nStack: ${error.stack.split("\n")[1]}`
    );
  }
};

export const requestUpdateTiktokProduct = async (
  req,
  existingProduct,
  product,
  shop
) => {
  try {
    // console.log(existingProduct);
    // title, description, images
    // Compare images with existing images

    // images
    let tiktokImages = [];
    // loop images in images and call uploadImageToTiktok . then push to images
    for (let i = 0; i < product.images.length; i++) {
      req.imageUri = product.images[i];
      const uploadResponse = await uploadImageToTiktok(
        req,
        shop,
        product.images[i],
        "MAIN_IMAGE"
      );
      // console.log(uploadResponse);
      if (uploadResponse.message == "Success") {
        // create Tiktok Image
        let image = await prisma.tiktokImage.create({
          data: {
            uri: uploadResponse.data.uri,
            url: uploadResponse.data.url,
            useCase: uploadResponse.data.use_case,
          },
        });

        tiktokImages.push({
          uri: image.uri,
        });
      }
    }

    // get all json products
    const jsonProducts = await fetchOriginJsonProducts();
    // console.log(jsonProducts);
    // loop jsonProducts and find product by id
    let findProduct = false;
    for (const jsonProduct of jsonProducts) {
      if (jsonProduct.id == existingProduct.id) {
        findProduct = jsonProduct;
      }
    }

    // get warehouses

    // replace title, description, main_images with payload
    let payload = {};
    if (findProduct) {
      payload.title = product.title;
      payload.description = product.description;
      payload.main_images = tiktokImages;
      payload.skus = existingProduct.skus;
      payload.category_id = existingProduct.category_id;
      payload.package_weight = existingProduct.package_weight;
      payload.category_version = "v2";
    }

    if (payload.skus) {
      for (let i = 0; i < payload.skus.length; i++) {
        payload.skus[i].price.amount =
          payload.skus[i].price.sale_price +
          payload.skus[i].price.tax_exclusive_price;
      }
    }
    // console.log(findProduct);
    // console.log(payload);

    // Build query params
    const extraParams = {
      shop_cipher: shop.tiktokShopCipher,
      access_token: shop.shopAccessToken,
      version: "202309",
      shop_id: shop.tiktokShopId,
    };

    const response = await callTiktokApi(
      req,
      shop,
      payload,
      false,
      "PUT",
      `/product/202309/products/${existingProduct.id}`,
      "application/json",
      extraParams
    );
    // console.log(response.data);
    if (response.data) {
      return response.data;
    }
    return false;
  } catch (error) {
    console.log(
      `Error: ${error.message}\nStack: ${error.stack.split("\n")[1]}`
    );
  }
};

export const reqUpdateTiktokPrice = async (req, data, percent) => {
  try {
    let results = [];

    // loop data
    for (let i = 0; i < data.length; i++) {
      let payload = [];
      // find shop
      const shop = await prisma.shop.findFirst({
        where: {
          id: data[i].shopId,
        },
      });

      let skusPayload = [];
      for (let j = 0; j < data[i].skus.length; j++) {
        let s = data[i].skus[j];
        let price = s.price.tax_exclusive_price * (1 + percent / 100);
        skusPayload.push({
          id: s.id,
          price: {
            amount: price,
            currency: s.price.currency,
          },
        });
      }
      payload.push({
        skus: skusPayload,
      });

      const extraParams = {
        shop_cipher: shop.tiktokShopCipher,
        access_token: shop.shopAccessToken,
        version: "202309",
        shop_id: shop.tiktokShopId,
      };

      const resp = await callTiktokApi(
        req,
        shop,
        payload,
        false,
        "POST",
        `/product/202309/products/${data[i].pId}/prices/update`,
        "application/json",
        extraParams
      );

      // console.log(resp.data);
      if (resp.data) {
        results.push(resp.data);
      }
    }

    return results;
  } catch (error) {
    console.log(
      `Error: ${error.message}\nStack: ${error.stack.split("\n")[1]}`
    );
    return {};
  }
};

export const getLocalTiktokProducts = async (shop) => {
  try {
    let page = 1;
    let hasJsonFile = true;
    let products = [];
    while (hasJsonFile) {
      // get local json file
      const jsonFilePath = PRODUCT_FOLDER + shop.id + "/" + page + ".json";
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

      products = products.concat(jsonFileData.products);
      page++;
    }

    // console.log(products);
    return products;
  } catch (error) {
    console.log(
      `Error: ${error.message}\nStack: ${error.stack.split("\n")[1]}`
    );
  }
};

export const fetchOriginJsonProducts = async () => {
  try {
    // get all shops
    const shops = await reqActiveShops();
    let products = [];

    for (const shop of shops) {
      const data = await getLocalTiktokProducts(shop);
      products = products.concat(data);
    }

    // console.log(products);
    return products;
  } catch (error) {
    return [];
  }
};

export const fetchAllJsonProducts = async () => {
  try {
    // get all shops
    const shops = await reqActiveShops();
    let products = [];

    for (const shop of shops) {
      let filteredProducts = [];
      const data = await getLocalTiktokProducts(shop);
      // sort data by create_time desc
      data.sort((a, b) => {
        return b.create_time - a.create_time;
      });
      // loop products
      // filter name, price, create_time, update_time, [shop/template], [status], [audit.status], [listing_quality_tier]
      for (const product of data) {
        const filteredProduct = {
          id: product.id,
          title: product.title,
          create_time: product.create_time,
          update_time: product.update_time,
          shopId: shop.id,
          shop: shop,
          status: product.status,
          audit_status: product.audit.status,
          quality: product.listing_quality_tier,
        };
        filteredProducts.push(filteredProduct);
      }
      products = products.concat(filteredProducts);
    }

    // console.log(products);
    return products;
  } catch (error) {
    console.log(
      `Error: ${error.message}\nStack: ${error.stack.split("\n")[1]}`
    );
    return [];
  }
};

export const reqApiTiktokProduct = async () => {
  try {
  } catch (error) {}
};

export const getWarehouseDelivery = async (req, shop) => {
  try {
    const resp = await callTiktokApi(
      req,
      shop,
      false,
      false,
      "GET",
      `/logistics/202309/warehouses`,
      "application/json",
      {
        shop_cipher: shop.tiktokShopCipher,
        access_token: shop.shopAccessToken,
      }
    );

    if (!resp.data) {
      return [];
    }
    return resp.data;
  } catch (error) {
    console.log(
      `Error: ${error.message}\nStack: ${error.stack.split("\n")[1]}`
    );
  }
};

export const getProductDetail = async (req, shop, productId) => {
  try {
    let productResponse = await callTiktokApi(
      req,
      shop,
      false,
      false,
      "GET",
      `/product/202309/products/${productIds[i]}`,
      "application/json",
      {
        shop_cipher: shop.tiktokShopCipher,
        return_under_review_version: false,
      }
    );

    if (!productResponse.data) {
      return [];
    }
    return productResponse.data;
  } catch (error) {
    console.log(
      `Error: ${error.message}\nStack: ${error.stack.split("\n")[1]}`
    );
    return [];
  }
};
