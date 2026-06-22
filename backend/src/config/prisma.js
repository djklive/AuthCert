const { PrismaClient } = require('@prisma/client');

// Instance Prisma unique, partagée par toute l'application
const prisma = new PrismaClient();

module.exports = prisma;
