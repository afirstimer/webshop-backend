import prisma from "../lib/prisma.js";
import { SocksProxyAgent } from "socks-proxy-agent";
import axios from "axios";

export const connectViaSocks5 = async (shop) => {
  try {
    const proxy = await prisma.proxy.findFirst({
      where: {
        shopId: shop.id,
      },
    });

    if (!proxy) {
      return false;
    }

    const proxyHost = proxy.hostname;
    const proxyPort = proxy.port;
    const proxyUser = proxy.username; // Nếu proxy cần xác thực
    const proxyPass = proxy.password; // Nếu proxy cần xác thực

    const proxyUrl = `socks5://${proxyUser}:${proxyPass}@${proxyHost}:${proxyPort}`;
    const agent = new SocksProxyAgent(proxyUrl);

    const response = await axios.get(
      "https://partner.tiktokshop.com/docv2/page/6509df95defece02be598a22?external_id=6509df95defece02be598a22",
      {
        httpsAgent: agent,
        httpAgent: agent, // Nếu API TikTok sử dụng HTTP
      }
    );

    return response;
  } catch (error) {
    console.log(error);
    return false;
  }
};
