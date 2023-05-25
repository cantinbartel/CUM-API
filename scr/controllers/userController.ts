import { Request, Response } from "express";
import prisma from "../prisma";
import { Role } from "@prisma/client";
import bcrypt from "bcrypt";
import crypto from "crypto";
const nodemailer = require('nodemailer');
const nodemailerSendgrid = require('nodemailer-sendgrid-transport');

export const getAllUsers = async (req: Request, res: Response): Promise<void> => {

    try {
        const users = await prisma.user.findMany();
        res.json({ users });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error retrieving users' });
    }

};

export const getUserById = async (req: Request, res: Response): Promise<void> => {

    try {
        const id = req.params.id;
        const user = await prisma.user.findUnique({ where: { id } });

        if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
        }

        res.json({ user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error retrieving user' });
    }

};

export const addUser = async (req: Request, res: Response): Promise<void> => {

    try {
        const { code, email, password, centerId, fieldId } = req.body;
    
        bcrypt.hash(password, 10, async function(err, hashedPassword) {
            try {
                if (err) {
                    throw err;
                }
    
                const newUser = await prisma.user.create({
                    data: {
                        ara: {
                            connect: { id: code }
                        },
                        email,
                        password: hashedPassword,
                        role: Role.BASIC,
                        center: {
                            connect: { id: centerId }
                        },
                        field: {
                            connect: { id: fieldId }
                        },
                        blackListed: false,
                    },
                });
    
                res.json({ message: 'User created successfully', user: newUser });
            } catch (error) {
                console.error(error);
                res.status(500).json({ error: 'Error creating user' });
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error creating user' });
    }

};

export const updateUserById = async (req: Request, res: Response): Promise<void> => {

    try {
        const id = req.params.id;
        const { email, password, role } = req.body;

        const updatedUser = await prisma.user.update({
        where: { id },
        data: {
            email,
            password,
            role,
        },
        });

        res.json({ message: 'User updated successfully', user: updatedUser });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error updating user' });
    }

};

export const deleteUserById = async (req: Request, res: Response): Promise<void> => {

    try {
        const id = req.params.id;

        await prisma.user.delete({
        where: { id },
        });

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error deleting user' });
    }

};

export const resetUserPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const user = await prisma.user.findUnique({ where: { id } });

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        // Generate a random password
        let newPassword = crypto.randomBytes(4).toString('hex');
        
        // Hash the new password
        bcrypt.hash(newPassword, 10, async function(err, hashedPassword) {
            if (err) {
                console.error(err);
                res.status(500).json({ error: 'Error hashing password' });
                return;
            }

            // Update the user's password in the database
            const updatedUser = await prisma.user.update({
                where: { id },
                data: { password: hashedPassword },
            });

            const transporter = nodemailer.createTransport(nodemailerSendgrid({
                auth: {
                    api_key: 'SG.21J2zHThSXyG26I1IiXc5g.yrn8BrTtN2n4Iccd4uzscEJtsENyFr_HBXT07x4yCto'
                }
            }));

            let mailOptions = {
                from: 'CnamUnitedMobility@hotmail.com',
                to: user.email,
                subject: '[CnamUnitedMobility] Votre mot de passe a été réinitialisé',
                text: `Bonjour,\n\nSuite à une demande, nous avons réinitialisé votre mot de passe.\nLors de votre prochaine connection, utilisez celui-ci "${newPassword}"\n\nLa bise <3`
            };

            // Send the email with the new password
            transporter.sendMail(mailOptions, function(error: any, info: any){
                if (error) {
                    console.error(error);
                    res.status(500).json({ error: 'Error sending email' });
                } else {
                    res.json({ message: 'Password reset successfully, email sent', user: updatedUser });
                }
            });
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error resetting password' });
    }
};