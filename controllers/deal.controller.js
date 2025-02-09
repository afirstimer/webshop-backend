import prisma from "../lib/prisma.js";
import { generateSign } from "../helper/tiktok.api.js";
import axios from "axios";
import { reqCreateActivity, reqUpdateActivityProduct } from "../services/deal.service.js";

export const getPromos = async (req, res) => { }

export const getPromo = async (req, res) => { }

export const createPromo = async (req, res) => {
    try {
        const { skus, title, dealStartTime, dealEndTime } = req.body;

        // Nhóm skus theo shopId
        const groupedSkus = skus.reduce((acc, { shopId, pId }) => {
            if (!acc[shopId]) acc[shopId] = [];
            acc[shopId].push(pId);
            return acc;
        }, {});

        // Chuyển đổi thời gian sang Unix timestamp
        req.body.startTimeUnix = Math.floor(new Date(dealStartTime).getTime() / 1000);
        req.body.endTimeUnix = Math.floor(new Date(dealEndTime).getTime() / 1000);

        // loop 
        // create activity
        for (const shopId in groupedSkus) {
            req.body.shopId = shopId;
            req.body.productIds = groupedSkus[shopId];
            const tiktokActivity = await reqCreateActivity(req, res);     
            
            if (tiktokActivity) {
                await prisma.promotion.create({
                    tiktokId: tiktokActivity.activity_id,
                    title: title,
                    activityType: 'DIRECT_DISCOUNT',
                    beginTime: req.body.startTimeUnix,
                    endTime: req.body.endTimeUnix,
                    status: tiktokActivity.status,                    
                })
            }

            // update activity
            const updateTiktokActivity = await reqUpdateActivityProduct(req, res);
        }        

        res.status(200).json({ message: "Success" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message });
    }
}

export const updatePromo = async (req, res) => { }

export const deletePromo = async (req, res) => { }

/**
 * Call TikTok API
 */
export const getCoupons = async (req, res) => { }

/**
 * Call Tiktok API
 */
export const getCoupon = async (req, res) => { }