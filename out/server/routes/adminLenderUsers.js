import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
const router = Router();
// Get all lender companies
router.get('/lenders', async (req, res) => {
    try {
        const result = await db.query(`
      SELECT id, name, contact_email, phone, address, city, state, zip, country, status, createdAt, updatedAt
      FROM lenders 
      ORDER BY name
    `);
        res.json({
            success: true,
            data: result.rows
        });
    }
    catch (error) {
        console.error('Error fetching lenders:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch lenders'
        });
    }
});
// Create new lender company
router.post('/lenders', async (req, res) => {
    try {
        const { name, contactEmail, phone, address, city, state, zip, country = 'US' } = req.body;
        if (!name || !contactEmail) {
            return res.status(400).json({
                success: false,
                error: 'Name and contact email are required'
            });
        }
        const lenderId = uuidv4();
        await db.query(`
      INSERT INTO lenders (id, name, contact_email, phone, address, city, state, zip, country, status, createdAt, updatedAt)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
    `, [
            lenderId,
            name,
            contactEmail,
            phone || null,
            address || null,
            city || null,
            state || null,
            zip || null,
            country,
            'active'
        ]);
        res.json({
            success: true,
            data: { id: lenderId, name, contactEmail }
        });
    }
    catch (error) {
        console.error('Error creating lender:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create lender'
        });
    }
});
// Get all lender users with company info
router.get('/lender-users', async (req, res) => {
    try {
        const result = await db.query(`
      SELECT 
        lu.id,
        lu.lender_id,
        lu.email,
        lu.first_name,
        lu.last_name,
        lu.status,
        lu.role,
        lu.createdAt,
        l.name as lender_name
      FROM lender_users lu
      JOIN lenders l ON lu.lender_id = l.id
      ORDER BY lu.createdAt DESC
    `);
        res.json({
            success: true,
            data: result.rows.map(row => ({
                id: row.id,
                lenderId: row.lender_id,
                email: row.email,
                firstName: row.first_name,
                lastName: row.last_name,
                status: row.status,
                role: row.role,
                lenderName: row.lender_name,
                createdAt: row.createdAt
            }))
        });
    }
    catch (error) {
        console.error('Error fetching lender users:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch lender users'
        });
    }
});
// Create new lender user
router.post('/lender-users', async (req, res) => {
    try {
        const { email, password, firstName, lastName, lenderId } = req.body;
        if (!email || !password || !firstName || !lastName || !lenderId) {
            return res.status(400).json({
                success: false,
                error: 'All fields are required'
            });
        }
        // Check if lender exists
        const lenderCheck = await db.query('SELECT id FROM lenders WHERE id = $1', [lenderId]);
        if (lenderCheck.rows.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid lender ID'
            });
        }
        // Check if email already exists
        const emailCheck = await db.query('SELECT id FROM lender_users WHERE email = $1', [email]);
        if (emailCheck.rows.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Email already exists'
            });
        }
        const userId = uuidv4();
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query(`
      INSERT INTO lender_users (id, lender_id, email, first_name, last_name, password_hash, status, role, permissions, createdAt, updatedAt)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
    `, [
            userId,
            lenderId,
            email,
            firstName,
            lastName,
            hashedPassword,
            'active',
            'lender',
            JSON.stringify([])
        ]);
        res.json({
            success: true,
            data: {
                id: userId,
                email,
                firstName,
                lastName,
                lenderId,
                message: 'Lender user created successfully'
            }
        });
    }
    catch (error) {
        console.error('Error creating lender user:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create lender user'
        });
    }
});
// Update lender user status
router.patch('/lender-users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!['active', 'inactive', 'suspended'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status'
            });
        }
        await db.query(`
      UPDATE lender_users 
      SET status = $1, updatedAt = NOW()
      WHERE id = $2
    `, [status, id]);
        res.json({
            success: true,
            message: 'User status updated successfully'
        });
    }
    catch (error) {
        console.error('Error updating lender user:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update user status'
        });
    }
});
// Delete lender user
router.delete('/lender-users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM lender_users WHERE id = $1', [id]);
        res.json({
            success: true,
            message: 'Lender user deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting lender user:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete user'
        });
    }
});
export default router;
