import prisma from "../lib/prisma.js";
import { getWarehouseDelivery, uploadImageToTiktok } from "../services/product.service.js";
import TelegramBot from 'node-telegram-bot-api';
import { proceedRefreshToken } from "../helper/helper.js";

export const testController = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: {
                id: '6765289debc64d49cee0fd1a'
            }
        });

        if (user.defaultShop) {
            const defaultShop = await prisma.shop.findUnique({
                where: {
                    id: user.defaultShop
                }
            });
            
            const freshToken = await proceedRefreshToken(defaultShop);
            // console.log(freshToken);
            res.status(200).json(freshToken);
        }
    } catch (error) {
        console.log(error);
    }
}