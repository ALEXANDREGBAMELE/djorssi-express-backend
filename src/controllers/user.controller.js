const User = require('../models/user.model');
const { Op } = require('sequelize');
const bcrypt = require('bcrypt');
const logger = require('../../config/logger');
const { 
  updateProfileSchema, 
  changePasswordSchema,
  adminUpdateUserSchema,
  adminCreateUserSchema,
  idParamSchema,
  userQuerySchema 
} = require('../validators/user.validator');

// Obtenir son propre profil
const getProfile = async (req, res, next) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password_hash'] }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        res.json({
            success: true,
            data: { user }
        });
    } catch (error) {
        logger.error('Erreur getProfile:', error);
        next(error);
    }
};

// Mettre à jour son propre profil
const updateProfile = async (req, res, next) => {
    try {
        // Validation avec Zod
        const result = updateProfileSchema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({ 
                success: false,
                errors: result.error.flatten().fieldErrors 
            });
        }

        const data = result.data;
        const userId = req.user.id;

        // Récupérer l'utilisateur
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        // Mettre à jour uniquement les champs fournis
        const updateData = {};
        if (data.first_name !== undefined) updateData.first_name = data.first_name;
        if (data.last_name !== undefined) updateData.last_name = data.last_name;
        if (data.quartier !== undefined) updateData.quartier = data.quartier;
        if (data.ville !== undefined) updateData.ville = data.ville;
        if (data.pays !== undefined) updateData.pays = data.pays;
        if (data.company_name !== undefined) updateData.company_name = data.company_name;
        if (data.company_siret !== undefined) updateData.company_siret = data.company_siret;
        if (data.bio !== undefined) updateData.bio = data.bio;
        if (data.profile_photo !== undefined) updateData.profile_photo = data.profile_photo;

        await user.update(updateData);

        const updatedUser = await User.findByPk(userId, {
            attributes: { exclude: ['password_hash'] }
        });

        res.json({
            success: true,
            message: 'Profil mis à jour avec succès',
            data: { user: updatedUser }
        });
    } catch (error) {
        logger.error('Erreur updateProfile:', error);
        next(error);
    }
};

// Changer le mot de passe
const changePassword = async (req, res, next) => {
    try {
        const result = changePasswordSchema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({ 
                success: false,
                errors: result.error.flatten().fieldErrors 
            });
        }

        const { current_password, new_password } = result.data;
        const userId = req.user.id;

        // Récupérer l'utilisateur avec son mot de passe
        const user = await User.scope('withPassword').findByPk(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        // Vérifier l'ancien mot de passe
        const isValidPassword = await bcrypt.compare(current_password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Mot de passe actuel incorrect'
            });
        }

        // Hacher le nouveau mot de passe
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(new_password, salt);

        // Mettre à jour
        await user.update({ password_hash: hashedPassword });

        res.json({
            success: true,
            message: 'Mot de passe changé avec succès'
        });
    } catch (error) {
        logger.error('Erreur changePassword:', error);
        next(error);
    }
};

// Supprimer son compte
const deleteAccount = async (req, res, next) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        await user.destroy();

        res.json({
            success: true,
            message: 'Compte supprimé avec succès'
        });
    } catch (error) {
        logger.error('Erreur deleteAccount:', error);
        next(error);
    }
};

// Admin : Obtenir tous les utilisateurs
const getAllUsers = async (req, res, next) => {
    try {
        const result = userQuerySchema.safeParse(req.query);
        if (!result.success) {
            return res.status(400).json({ 
                success: false,
                errors: result.error.flatten().fieldErrors 
            });
        }

        const { page, limit, search, user_type, is_active, is_verified, sort_by, sort_order } = result.data;

        // Construction de la clause WHERE
        const where = {};
        if (search) {
            where[Op.or] = [
                { username: { [Op.iLike]: `%${search}%` } },
                { email: { [Op.iLike]: `%${search}%` } },
                { first_name: { [Op.iLike]: `%${search}%` } },
                { last_name: { [Op.iLike]: `%${search}%` } },
                { phone: { [Op.iLike]: `%${search}%` } }
            ];
        }
        if (user_type) where.user_type = user_type;
        if (is_active !== undefined) where.is_active = is_active;
        if (is_verified !== undefined) where.is_verified = is_verified;

        // Pagination
        const pageNum = page || 1;
        const limitNum = limit || 20;
        const offset = (pageNum - 1) * limitNum;

        // Tri
        const order = [[sort_by || 'createdAt', sort_order || 'DESC']];

        const { count, rows } = await User.findAndCountAll({
            where,
            attributes: { exclude: ['password_hash'] },
            order,
            limit: limitNum,
            offset
        });

        res.json({
            success: true,
            data: {
                users: rows,
                pagination: {
                    total: count,
                    page: pageNum,
                    limit: limitNum,
                    totalPages: Math.ceil(count / limitNum)
                }
            }
        });
    } catch (error) {
        logger.error('Erreur getAllUsers:', error);
        next(error);
    }
};

// Admin : Obtenir un utilisateur par ID
const getUserById = async (req, res, next) => {
    try {
        const result = idParamSchema.safeParse(req.params);
        if (!result.success) {
            return res.status(400).json({ 
                success: false,
                errors: result.error.flatten().fieldErrors 
            });
        }

        const user = await User.findByPk(req.params.id, {
            attributes: { exclude: ['password_hash'] }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        res.json({
            success: true,
            data: { user }
        });
    } catch (error) {
        logger.error('Erreur getUserById:', error);
        next(error);
    }
};

// Admin : Créer un utilisateur
const createUser = async (req, res, next) => {
    try {
        const result = adminCreateUserSchema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({ 
                success: false,
                errors: result.error.flatten().fieldErrors 
            });
        }

        const data = result.data;

        // Vérifier si l'utilisateur existe déjà
        const existingUser = await User.findOne({
            where: {
                [Op.or]: [
                    { email: data.email },
                    { phone: data.phone },
                    { username: data.username }
                ]
            }
        });

        if (existingUser) {
            let message = 'Ces informations sont déjà utilisées';
            if (existingUser.email === data.email) message = 'Cet email est déjà utilisé';
            else if (existingUser.phone === data.phone) message = 'Ce numéro de téléphone est déjà utilisé';
            else if (existingUser.username === data.username) message = 'Ce nom d\'utilisateur est déjà pris';
            
            return res.status(400).json({
                success: false,
                message
            });
        }

        // Hacher le mot de passe
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(data.password, salt);

        // Créer l'utilisateur
        const user = await User.create({
            username: data.username,
            email: data.email,
            phone: data.phone,
            password_hash: hashedPassword,
            first_name: data.first_name,
            last_name: data.last_name,
            quartier: data.quartier || null,
            ville: data.ville || null,
            pays: data.pays || 'Côte d\'Ivoire',
            user_type: data.user_type,
            is_company: data.is_company || false,
            company_name: data.company_name || null,
            company_siret: data.company_siret || null,
            bio: data.bio || null,
            profile_photo: data.profile_photo || null,
            is_active: data.is_active !== undefined ? data.is_active : true,
            is_verified: data.is_verified !== undefined ? data.is_verified : false
        });

        const createdUser = await User.findByPk(user.id, {
            attributes: { exclude: ['password_hash'] }
        });

        res.status(201).json({
            success: true,
            message: 'Utilisateur créé avec succès',
            data: { user: createdUser }
        });
    } catch (error) {
        logger.error('Erreur createUser:', error);
        next(error);
    }
};

// Admin : Mettre à jour un utilisateur
const updateUser = async (req, res, next) => {
    try {
        // Valider l'ID
        const idResult = idParamSchema.safeParse(req.params);
        if (!idResult.success) {
            return res.status(400).json({ 
                success: false,
                errors: idResult.error.flatten().fieldErrors 
            });
        }

        // Valider les données
        const result = adminUpdateUserSchema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({ 
                success: false,
                errors: result.error.flatten().fieldErrors 
            });
        }

        const data = result.data;
        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        const updateData = {};
        if (data.first_name !== undefined) updateData.first_name = data.first_name;
        if (data.last_name !== undefined) updateData.last_name = data.last_name;
        if (data.quartier !== undefined) updateData.quartier = data.quartier;
        if (data.ville !== undefined) updateData.ville = data.ville;
        if (data.pays !== undefined) updateData.pays = data.pays;
        if (data.company_name !== undefined) updateData.company_name = data.company_name;
        if (data.company_siret !== undefined) updateData.company_siret = data.company_siret;
        if (data.bio !== undefined) updateData.bio = data.bio;
        if (data.profile_photo !== undefined) updateData.profile_photo = data.profile_photo;
        if (data.user_type !== undefined) updateData.user_type = data.user_type;
        if (data.is_active !== undefined) updateData.is_active = data.is_active;
        if (data.is_verified !== undefined) updateData.is_verified = data.is_verified;

        await user.update(updateData);

        const updatedUser = await User.findByPk(req.params.id, {
            attributes: { exclude: ['password_hash'] }
        });

        res.json({
            success: true,
            message: 'Utilisateur mis à jour avec succès',
            data: { user: updatedUser }
        });
    } catch (error) {
        logger.error('Erreur updateUser:', error);
        next(error);
    }
};

// Admin : Supprimer un utilisateur
const deleteUser = async (req, res, next) => {
    try {
        const result = idParamSchema.safeParse(req.params);
        if (!result.success) {
            return res.status(400).json({ 
                success: false,
                errors: result.error.flatten().fieldErrors 
            });
        }

        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        await user.destroy();

        res.json({
            success: true,
            message: 'Utilisateur supprimé avec succès'
        });
    } catch (error) {
        logger.error('Erreur deleteUser:', error);
        next(error);
    }
};

module.exports = {
    getProfile,
    updateProfile,
    changePassword,
    deleteAccount,
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser
};