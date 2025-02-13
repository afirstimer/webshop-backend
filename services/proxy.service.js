import prisma from "../lib/prisma.js";
import SocksClient from "socks";

export const connectViaSocks5 = async (shop) => {
  try {
    console.log(shop);
    const proxy = await prisma.proxy.findFirst({
      where: {
        shopId: shop.id,
      },
    });

    if (!proxy) {
      return false;
    }
    console.log(proxy);

    const options = {
      proxy: {
        host: proxy.hostname,
        port: parseInt(proxy.port, 10),
        type: 5, // SOCKS5
        userId: proxy.username,
        password: proxy.password,
      },
      command: "connect",
      destination: { host: "google.com", port: 80 },
      timeout: 10000,
    };

    const info = await SocksClient.createConnection(options);
    return info.socket;
  } catch (error) {
    console.log(error);
    return false;
  }
};
