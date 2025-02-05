import prisma from "../lib/prisma.js";
import jwt from "jsonwebtoken";
import fetch from "node-fetch";
import axios from "axios";

export const getProxies = async (req, res) => {
    try {
        const proxies = await prisma.proxy.findMany();
        res.status(200).json(proxies);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message });        
    }
}

export const getProxy = async (req, res) => {
    try {
        const proxy = await prisma.proxy.findUnique({
            where: {
                id: req.params.id
            }
        });

        res.status(200).json(proxy);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message });
    }
}

export const createProxy = async (req, res) => {
    try {
        const { name, type, hostname, port, username, password } = req.body; 

        const newProxy = await prisma.proxy.create({
            data: {
                name,
                type,
                hostname,
                port,
                username,
                password
            }
        });

        res.status(201).json(newProxy);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message });
    }
}

export const updateProxy = async (req, res) => {
    try {
        const { name, type, hostname, port, username, password, isActive } = req.body;

        const updatedProxy = await prisma.proxy.update({
            where: {
                id: req.params.id
            },
            data: {
                name,
                type,
                hostname,
                port,
                username,
                password,
                isActive
            }
        });

        res.status(200).json(updatedProxy);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message });
    }
}

export const deleteProxy = async (req, res) => {
    try {
        await prisma.proxy.delete({
            where: {
                id: req.params.id
            }
        });

        res.status(200).json({ message: "Proxy deleted" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message });
    }
}