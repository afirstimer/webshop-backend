import prisma from "../lib/prisma.js";
import bcrypt from "bcrypt";
import { setDefaultShopForUser } from "../services/shop.service.js";

export const getUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = process.env.DEFAULT_LIMIT,
      username,
      email,
      sort,
    } = req.query;

    const pageNum = parseInt(page, 10);
    const pageSize = parseInt(limit, 10);

    const where = {
      ...(username && {
        username: {
          contains: username,
          mode: "insensitive",
        },
      }),
      ...(email && {
        email: {
          contains: email,
          mode: "insensitive",
        },
      }),
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

    const total = await prisma.user.count({
      where,
    });

    const users = await prisma.user.findMany({
      where,
      skip: (pageNum - 1) * pageSize,
      take: pageSize,
      orderBy: orderBy,
      include: {
        Team: {
          select: {
            name: true,
          },
        },
      },
    });

    res.status(200).json({
      total,
      page: pageNum,
      limit: pageSize,
      users,
    });
  } catch (e) {
    console.log(`Error: ${e.message}\nStack: ${e.stack.split("\n")[1]}`);

    res.status(500).json({ message: "Failed to get users!" });
  }
};

export const getMembers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        isActive: 1,
      },
    });
    res.status(200).json(users);
  } catch (e) {
    console.log(`Error: ${e.message}\nStack: ${e.stack.split("\n")[1]}`);
  }
};

export const getUsersByTeamID = async (req, res) => {
  const { teamId } = req.params;
  try {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }
    const userIds = team.members;

    const users = [];
    for (const userId of userIds) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
      users.push(user);
    }

    res.status(200).json(users);
  } catch (e) {
    console.log(`Error: ${e.message}\nStack: ${e.stack.split("\n")[1]}`);

    res.status(500).json({ message: "Failed to get users!" });
  }
};

export const getUser = async (req, res) => {
  const id = req.params.id;
  try {
    const user = await prisma.user.findUnique({
      where: { id },
    });
    res.status(200).json(user);
  } catch (e) {
    console.log(`Error: ${e.message}\nStack: ${e.stack.split("\n")[1]}`);

    res.status(500).json({ message: "Failed to get user!" });
  }
};

export const createUser = async (req, res) => {
  const { password, avatar, shops, ...inputs } = req.body;

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    let shopIds = [];
    if (shops) {
      shopIds = JSON.parse(shops);
    }

    const validShops = await prisma.shop.findMany({
      where: {
        id: {
          in: shopIds,
        },
        isActive: 1,
      },
      select: {
        id: true,
      },
    });

    // create a new user and save to DB
    const newUser = await prisma.user.create({
      data: {
        ...inputs,
        ...(shops && {
          shops: {
            connect: validShops.map((shopId) => shopId),
          },
        }),
        ...(password && { password: hashedPassword }),
        ...(avatar && { avatar }),
      },
    });

    res.status(201).json({
      message: "User created successfully",
    });
  } catch (e) {
    console.log(`Error: ${e.message}\nStack: ${e.stack.split("\n")[1]}`);

    res.status(500).json({
      message: "Failed to create user!",
    });
  }
};

export const updateUser = async (req, res) => {
  const id = req.params.id;
  const tokenUserId = req.userId;
  const { password, avatar, shops, shopId, ...inputs } = req.body;

  const loggedinUser = await prisma.user.findUnique({
    where: { id: tokenUserId },
  });

  const requestUser = await prisma.user.findUnique({
    where: { id },
  });

  if (!requestUser) {
    return res.status(404).json({ message: "User not found!" });
  }

  if (requestUser.id !== loggedinUser.id && loggedinUser.isAdmin !== 1) {
    return res.status(403).json({ message: "Not Authorized!" });
  }

  let updatedPassword = null;
  try {
    if (password) {
      updatedPassword = await bcrypt.hash(password, 10);
    }

    let shopIds = [];
    if (shops) {
      shopIds = JSON.parse(shops);
    }

    let existingShopIds = requestUser.shops;
    if (shopId) {
      if (existingShopIds.includes(shopId)) {
        res
          .status(400)
          .json({ message: "Shop already exists in user's shopIds!" });
      } else {
        // add shopId to existing shopIds array
        existingShopIds.push(shopId);
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...inputs,
        ...(shops && {
          shops: shopIds,
        }),
        ...(updatedPassword && { password: updatedPassword }),
        ...(avatar && { avatar }),
      },
    });

    if (shopId) {
      await prisma.user.update({
        where: { id },
        data: {
          ...(!requestUser.defaultShop && { defaultShop: shopId }),
          shops: existingShopIds,
        },
      });
    }

    const { password: userPassword, ...rest } = updatedUser;

    res.status(200).json(rest);
  } catch (e) {
    console.log(`Error: ${e.message}\nStack: ${e.stack.split("\n")[1]}`);

    res.status(500).json({ message: "Failed to update user!" });
  }
};

export const deleteUser = async (req, res) => {
  const id = req.params.id;
  const tokenUserId = req.userId;

  try {
    await prisma.user.update({
      where: { id },
      data: {
        isActive: 0,
      },
    });
    res.status(200).json({ message: "User deleted" });
  } catch (err) {
    console.log(`Error: ${err.message}\nStack: ${err.stack.split("\n")[1]}`);
    res.status(500).json({ message: "Failed to delete users!" });
  }
};

export const deleteMultiUsers = async (req, res) => {
  try {
    const { userIds } = req.body;

    if (!userIds) {
      throw new Error("Vui lồng chọn người dung");
    }

    const parsedUserIds = JSON.parse(userIds);

    for (const userId of parsedUserIds) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          isActive: 0,
        },
      });
    }

    res.status(200).json({ message: "Users deleted" });
  } catch (error) {
    console.log(
      `Error: ${error.message}\nStack: ${error.stack.split("\n")[1]}`
    );
  }
};

export const addUsersToGroup = async (req, res) => {
  try {
    const { userIds, teamId } = req.body;

    if (!userIds || !teamId) {
      throw new Error("Vui lồng chọn nhóm");
    }

    const usersParsed = JSON.parse(userIds);

    // loop usersParsed and find user by id and update teamId
    for (const userId of usersParsed) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          teamId,
        },
      });
    }

    res.status(200).json({ message: "Users added to group" });
  } catch (error) {
    console.log(
      `Error: ${error.message}\nStack: ${error.stack.split("\n")[1]}`
    );
  }
};

export const savePost = async (req, res) => {
  const postId = req.body.postId;
  const tokenUserId = req.userId;

  try {
    const savedPost = await prisma.savedPost.findUnique({
      where: {
        userId_postId: {
          userId: tokenUserId,
          postId,
        },
      },
    });

    if (savedPost) {
      await prisma.savedPost.delete({
        where: {
          id: savedPost.id,
        },
      });
      res.status(200).json({ message: "Post removed from saved list" });
    } else {
      await prisma.savedPost.create({
        data: {
          userId: tokenUserId,
          postId,
        },
      });
      res.status(200).json({ message: "Post saved" });
    }
  } catch (err) {
    console.log(`Error: ${err.message}\nStack: ${err.stack.split("\n")[1]}`);
    res.status(500).json({ message: "Failed to delete users!" });
  }
};

export const profilePosts = async (req, res) => {
  const tokenUserId = req.userId;
  try {
    const userPosts = await prisma.post.findMany({
      where: { userId: tokenUserId },
    });
    const saved = await prisma.savedPost.findMany({
      where: { userId: tokenUserId },
      include: {
        post: true,
      },
    });

    const savedPosts = saved.map((item) => item.post);
    res.status(200).json({ userPosts, savedPosts });
  } catch (err) {
    console.log(`Error: ${err.message}\nStack: ${err.stack.split("\n")[1]}`);
    res.status(500).json({ message: "Failed to get profile posts!" });
  }
};

export const getNotificationNumber = async (req, res) => {
  const tokenUserId = req.userId;
  try {
    const number = await prisma.chat.count({
      where: {
        userIDs: {
          hasSome: [tokenUserId],
        },
        NOT: {
          seenBy: {
            hasSome: [tokenUserId],
          },
        },
      },
    });
    res.status(200).json(number);
  } catch (err) {
    console.log(`Error: ${err.message}\nStack: ${err.stack.split("\n")[1]}`);
    res.status(500).json({ message: "Failed to get profile posts!" });
  }
};

/**
 * Upgrades a user to admin status.
 *
 * This function updates the user's isAdmin field to 1
 * in the database, effectively granting admin privileges.
 *
 * @param {Object} req - The request object, containing the user's ID in the params.
 * @param {Object} res - The response object, used to send back the HTTP response.
 */

export const upgradeToAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.user.update({
      where: { id },
      data: {
        isAdmin: 1,
      },
    });

    res.status(200).json({ message: "User upgraded to admin" });
  } catch (error) {
    console.log(
      `Error: ${error.message}\nStack: ${error.stack.split("\n")[1]}`
    );
    res.status(500).json({ message: "Failed to upgrade to admin!" });
  }
};

export const checkHasDefaultShop = async (req, res) => {
  try {
    const requestUser = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!requestUser || !requestUser.defaultShop) {
      return res.status(404).json({
        message:
          "Không tìm thấy cửa hàng mặc định. Vui lòng tạo một cửa hàng mặc định",
      });
    }

    const defaultShop = await prisma.shop.findUnique({
      where: { id: requestUser.defaultShop },
    });

    if (!defaultShop) {
      return res.status(404).json({
        message:
          "Không tìm thấy cửa hàng mặc định. Vui lòng tạo một cửa hàng mặc định",
      });
    }

    res.status(200).json({ message: "Default shop found", defaultShop });
  } catch (error) {
    console.log(
      `Error: ${error.message}\nStack: ${error.stack.split("\n")[1]}`
    );
    res.status(500).json({ message: "Failed to check default shop!" });
  }
};

export const removeDefaultShop = async (req, res) => {
  const id = req.params.id;
  const { shopId } = req.body;

  try {
    if (!shopId) {
      res.status(404).json({ message: "Shop not found" });
    }

    // get user
    const requestUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!requestUser) {
      res.status(404).json({ message: "User not found" });
    }

    // check shopId in shops
    if (!requestUser.shops.includes(shopId)) {
      res.status(404).json({ message: "Shop not found" });
    }

    const newShops = requestUser.shops.filter((shop) => shop !== shopId);
    const defaultShop = requestUser.defaultShop;

    // remove shopId from shops
    await prisma.user.update({
      where: { id },
      data: {
        ...(defaultShop == shopId && { defaultShop: null }),
        shops: newShops,
      },
    });

    res.status(200).json({ message: "Xóa shop khỏi user" });
  } catch (err) {
    console.log(`Error: ${err.message}\nStack: ${err.stack.split("\n")[1]}`);
    res.status(500).json({ message: "Failed to delete users!" });
  }
};
