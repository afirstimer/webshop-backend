import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";
import axios from "axios";

export const register = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // HASH THE PASSWORD

    const hashedPassword = await bcrypt.hash(password, 10);

    // console.log(hashedPassword);

    // CREATE A NEW USER AND SAVE TO DB
    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
      },
    });

    // console.log(newUser);

    res.status(201).json({ message: "User created successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to create user!" });
  }
};

export const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    // CHECK IF THE USER EXISTS

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) return res.status(400).json({ message: "Invalid Credentials!" });

    // CHECK IF THE PASSWORD IS CORRECT

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid)
      return res.status(400).json({ message: "Invalid Credentials!" });

    // GENERATE COOKIE TOKEN AND SEND TO THE USER

    // res.setHeader("Set-Cookie", "test=" + "myValue").json("success")
    const age = 1000 * 60 * 60 * 24 * 7;

    const token = jwt.sign(
      {
        id: user.id,
        isAdmin: false,
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: age }
    );

    const { password: userPassword, ...userInfo } = user;

    // get default shop
    if (user.defaultShop) {
      const defaultShop = await prisma.shop.findFirst({
        where: {
          id: user.defaultShop,
        }
      });

      // If found defaultShop, refresh token and udpate 
      if (defaultShop) {
        // refresh token first
        await refreshToken(defaultShop);
      }
    }

    res
      .cookie("token", token, {
        httpOnly: true,
        secure:true,
        sameSite: "none",
        maxAge: age,
      })
      .status(200)
      .json(userInfo);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to login!" });
  }
};

export const logout = (req, res) => {
  res.clearCookie("token").status(200).json({ message: "Logout Successful" });
};

export const validateToken = async (req, res) => {
  try {

    //TODO: always valid
    res.status(200).json({ message: "Token is Valid!" });

    const token = req.cookies.token;
    // console.log(token);

    if (!token) {
      // delete cookie
      res.clearCookie("token");
      return res.status(401).json({ message: "Not Authenticated!" });
    }

    jwt.verify(token, process.env.JWT_SECRET_KEY, async (err, payload) => {
      if (err) return res.status(403).json({ message: "Token is not Valid!" });
      req.userId = payload.id;
      // console.log(payload);
    });

    if (!req.userId) {
      return res.status(401).json({ message: "Not Authenticated!" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!user) {
      return res.status(401).json({ message: "Not Authenticated!" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

const refreshToken = async (shop) => {
  const url = 'https://auth.tiktok-shops.com/api/v2/token/refresh';

  // console.log('Refreshing token...');
  // Get first setting
  const params = {
    app_key: process.env.TIKTOK_SHOP_APP_KEY,
    app_secret: process.env.TIKTOK_SHOP_APP_SECRET,
    refresh_token: shop.accessToken,  //REQUIRED
    grant_type: 'refresh_token'
  };

  try {
    const response = await axios.get(url, { params });
    const { code, message, data } = response.data;

    // console.log('API Response:', response.data);

    if (code === 0 && message === 'success') {
      const accessToken = data.access_token;
      const refreshToken = data.refresh_token;

      // console.log('Access Token:', accessToken);
      // console.log('Refresh Token:', refreshToken);

      await prisma.shop.update({
        where: {
          id: shop.id,
        },
        data: {          
          shopAccessToken: accessToken,
          shopRefreshToken: refreshToken
        },
      });

      return { accessToken, refreshToken };
    } else {
      console.error('API Error:', response.data);
      throw new Error('Failed to refresh token');
    }
  } catch (error) {
    console.error('Error refreshing token:', error.message);
    return false
  }
}