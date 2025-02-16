import { reqCreateActivity, reqUpdateActivityProduct } from "./deal.service.js";

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
