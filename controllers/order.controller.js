import prisma from "../lib/prisma.js";
import { getLocalTiktokOrders, getTiktokOrders } from "../services/order.service.js";
import { getDefaultShop } from "../helper/helper.js";

export const getOrderStats = async (req, res) => {
    try {
        // get requested user
        const requestUser = await prisma.user.findUnique({
            where: {
                id: req.userId
            }
        });

        if (!requestUser) {
            return res.status(500).json({ error: "Failed to get user" });
        }

        let orders = [];
        // if admin, get full shops
        if (requestUser.isAdmin == 1) {
            const shops = await prisma.shop.findMany();
            if (!shops) {
                return res.status(500).json({ error: "Failed to get shops" });
            }

            for (const shop of shops) {
                const localOrders = await getLocalTiktokOrders(shop);
                orders = orders.concat(localOrders);
            }
        } else {
            // get default shop
            const shop = await getDefaultShop(req);

            if (!shop) {
                return res.status(500).json({ error: "Failed to get shop" });
            }

            const localOrders = await getLocalTiktokOrders(shop);
            if (!localOrders) {
                return res.status(500).json({ error: "Failed to get orders" });
            }

            orders = localOrders;
        }
        // console.log(orders);
        
        // Loop orders and count total amount of orders with group by month
        const ordersByMonth = {};
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        for (let i = 0; i < orders.length; i++) {
            const order = orders[i];
            const month = new Date(order.create_time * 1000).getMonth();
            const monthName = monthNames[month];
            if (!ordersByMonth[monthName]) {
                ordersByMonth[monthName] = 0;
            }
            ordersByMonth[monthName] += 1;
        }

        // fill ordersByMonth with 0 if month not found
        const sortedMonthNames = monthNames.slice().sort((a, b) => {
            const aIndex = monthNames.indexOf(a);
            const bIndex = monthNames.indexOf(b);
            return aIndex - bIndex;
        });
        const newOrdersByMonth = {};
        for (let i = 0; i < sortedMonthNames.length; i++) {
            const monthName = sortedMonthNames[i];
            if (!ordersByMonth[monthName]) {
                newOrdersByMonth[monthName] = 0;
            } else {
                newOrdersByMonth[monthName] = ordersByMonth[monthName];
            }
        }

        const paymentByMonth = {};
        for (let i = 0; i < orders.length; i++) {
            const order = orders[i];
            const month = new Date(order.create_time * 1000).getMonth();
            const monthName = monthNames[month];
            if (!paymentByMonth[monthName]) {
                paymentByMonth[monthName] = 0;
            }
            paymentByMonth[monthName] += Math.ceil(parseFloat(order.payment.total_amount));
        }

        // fill paymentByMonth with 0 if month not found        
        for (let i = 0; i < sortedMonthNames.length; i++) {
            const monthName = sortedMonthNames[i];
            if (!paymentByMonth[monthName]) {
                paymentByMonth[monthName] = 0;
            }
        }
        // console.log(paymentByMonth);

        const analysis = [];
        for (const [month, total] of Object.entries(newOrdersByMonth)) {
            const revenue = paymentByMonth[month] || 0;
            analysis.push({ month, total, revenue });
        }

        res.status(200).json(analysis);
    } catch (error) {
        console.error("Error get orders: ", error);
        res.status(500).json({ error: "Failed to get orders" });
    }
}

export const getOrders = async (req, res) => {
    try {
        const orders = await prisma.order.findMany();
        res.status(200).json(orders);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Failed to get orders" });
    }
}

export const getAllShopOrders = async (req, res) => {
    try {
        const reqUser = await prisma.user.findUnique({
            where: {
                id: req.userId
            }
        });
        if (!reqUser) {
            return res.status(404).json({ message: "User not found" });
        }
    
        if (reqUser.isAdmin == 1) {
            const shops = await prisma.shop.findMany();
            let orders = [];
            for (const shop of shops) {
                const localOrders = await getLocalTiktokOrders(shop);
                orders = orders.concat(localOrders);
            }
            res.status(200).json(orders);
        } else {
            // get default shop
            const shop = await getDefaultShop(req);
            if (!shop) {
                return res.status(404).json({ message: "Default shop not found" });
            }
            const orders = await getLocalTiktokOrders(shop);
            res.status(200).json(orders);
        }
        
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Failed to get orders" });
    }
}