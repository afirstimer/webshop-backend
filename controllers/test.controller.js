import prisma from "../lib/prisma.js";
import { getWarehouseDelivery, uploadImageToTiktok } from "../services/product.service.js";
import TelegramBot from 'node-telegram-bot-api';

export const testController = async (req, res) => {
    try {

        const setting = await prisma.setting.findFirst();

        // res.status(200).json(setting);

        // replace the value below with the Telegram token you receive from @BotFather
        const token = setting.telegramToken;
        // read the doc from https://github.com/yagop/node-telegram-bot-api to know how to catch the chatId        

        const TELEGRAM_API_URL = `https://api.telegram.org/bot${token}/sendMessage`;
        const CHAT_ID = '7296899495';
        const message = 'Hello from bot';

        const response = await fetch(TELEGRAM_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: CHAT_ID, text: message }),
        });

        console.log(response);

        if (!response.ok) {
            throw new Error("Failed to send Telegram message");
        }

        res.json({ response });        
        // const shop = await prisma.shop.findFirst();

        // const resp = await getWarehouseDelivery(req, shop);

        // // get type SALE
        // const warehouses = resp.data.warehouses.filter(w => w.type == 'SALES_WAREHOUSE');

        // res.status(200).json(warehouses[0]);

        // let uriImage = 'https://res.cloudinary.com/dg5multm4/image/upload/v1737442727/dhzfjxdfq8se1sco4fch.jpg';
        // const shop = await prisma.shop.findFirst();
        // const uploadResponse = await uploadImageToTiktok(req, shop, uriImage, 'MAIN_IMAGE');
        // console.log(uploadResponse);
        // res.status(200).json(uploadResponse);
    } catch (error) {
        console.log(error);
    }
}