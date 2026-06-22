const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');
const { v4: uuidv4 } = require('uuid');

const prisma = require('../config/prisma');
const {
  generateToken,
  authenticateToken,
  requireRole,
  requireStatus,
  createSession,
  cleanupExpiredSessions,
  terminateAllOtherSessions,
  getLocationFromIP
} = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const supabaseStorage = require('../services/storageService');
const { generateCertificatePdf, getEstablishmentLogo } = require('../services/pdfService');
const { sendPasswordResetEmail } = require('../services/emailService');
const { mapTypeEtablissement, getTimeAgo, createNotification } = require('../utils/helpers');
const { encryptPrivateKey, decryptPrivateKey, sha256Hex } = require('../utils/cryptoUtils');

const router = express.Router();

// ========================================
// ROUTES POUR NOTIFICATIONS
// ========================================

// Récupérer les notifications de l'utilisateur connecté
router.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { limit = 50, offset = 0, unreadOnly = false } = req.query;
    
    // Mapper le rôle vers le userType
    const userTypeMap = {
      'student': 'apprenant',
      'establishment': 'etablissement',
      'admin': 'admin'
    };
    const userType = userTypeMap[userRole];
    
    const where = {
      userId,
      userType,
      ...(unreadOnly === 'true' ? { lu: false } : {})
    };
    
    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    });
    
    const totalCount = await prisma.notification.count({ where });
    const unreadCount = await prisma.notification.count({ 
      where: { userId, userType, lu: false } 
    });
    
    res.json({ 
      success: true, 
      data: notifications,
      meta: {
        total: totalCount,
        unread: unreadCount,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur récupération notifications:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des notifications',
      error: error.message 
    });
  }
});

// Marquer une notification comme lue
router.patch('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const userTypeMap = {
      'student': 'apprenant',
      'establishment': 'etablissement',
      'admin': 'admin'
    };
    const userType = userTypeMap[userRole];
    
    // Vérifier que la notification appartient à l'utilisateur
    const notification = await prisma.notification.findFirst({
      where: { 
        id: parseInt(id),
        userId,
        userType
      }
    });
    
    if (!notification) {
      return res.status(404).json({ 
        success: false, 
        message: 'Notification introuvable' 
      });
    }
    
    // Marquer comme lue
    const updated = await prisma.notification.update({
      where: { id: parseInt(id) },
      data: { 
        lu: true,
        readAt: new Date()
      }
    });
    
    res.json({ 
      success: true, 
      data: updated 
    });
    
  } catch (error) {
    console.error('❌ Erreur marquage notification:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors du marquage de la notification',
      error: error.message 
    });
  }
});

// Marquer toutes les notifications comme lues
router.patch('/api/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const userTypeMap = {
      'student': 'apprenant',
      'establishment': 'etablissement',
      'admin': 'admin'
    };
    const userType = userTypeMap[userRole];
    
    const result = await prisma.notification.updateMany({
      where: { 
        userId,
        userType,
        lu: false
      },
      data: { 
        lu: true,
        readAt: new Date()
      }
    });
    
    res.json({ 
      success: true, 
      message: `${result.count} notifications marquées comme lues`,
      data: { count: result.count }
    });
    
  } catch (error) {
    console.error('❌ Erreur marquage notifications:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors du marquage des notifications',
      error: error.message 
    });
  }
});

// Supprimer une notification
router.delete('/api/notifications/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const userTypeMap = {
      'student': 'apprenant',
      'establishment': 'etablissement',
      'admin': 'admin'
    };
    const userType = userTypeMap[userRole];
    
    // Vérifier que la notification appartient à l'utilisateur
    const notification = await prisma.notification.findFirst({
      where: { 
        id: parseInt(id),
        userId,
        userType
      }
    });
    
    if (!notification) {
      return res.status(404).json({ 
        success: false, 
        message: 'Notification introuvable' 
      });
    }
    
    await prisma.notification.delete({
      where: { id: parseInt(id) }
    });
    
    res.json({ 
      success: true, 
      message: 'Notification supprimée' 
    });
    
  } catch (error) {
    console.error('❌ Erreur suppression notification:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la suppression de la notification',
      error: error.message 
    });
  }
});

// Compter les notifications non lues
router.get('/api/notifications/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const userTypeMap = {
      'student': 'apprenant',
      'establishment': 'etablissement',
      'admin': 'admin'
    };
    const userType = userTypeMap[userRole];
    
    const count = await prisma.notification.count({
      where: { 
        userId,
        userType,
        lu: false
      }
    });
    
    res.json({ 
      success: true, 
      data: { count }
    });
    
  } catch (error) {
    console.error('❌ Erreur comptage notifications:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors du comptage des notifications',
      error: error.message 
    });
  }
});
module.exports = router;
