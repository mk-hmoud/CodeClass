import logger from '../config/logger';
import { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { createUser, findUserByEmail, findUserById, validateUserPassword, setOwnPassword } from '../models/AuthModel';
import bcrypt from 'bcrypt';
import { getMaintenanceMode } from '../models/SystemSettingsModel';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';
const TOKEN_EXPIRY = '24h';


export const login: RequestHandler = async (req, res, next) => {
  const functionName = "login";
  logger.info(
    { fn: functionName, email: req.body.email, role: req.body.role },
    `Login request received: ${JSON.stringify({ email: req.body.email, role: req.body.role })}`
  );
  try {
    const { email, password} = req.body;
    if (!email || !password) {
      logger.warn(
        { fn: functionName, email },
        `Login validation failed: Missing credentials: email=${email} or password`
      );
      res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
      return;
    }
    const user = await findUserByEmail(email);
    if (!user) {
      logger.warn({ fn: functionName, email }, `Login failed: No user found with email: ${email}`);
      res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
      return;
    }
    logger.debug({ fn: functionName, email }, `User found, validating password for email: ${email}`);
    const isPasswordValid = await validateUserPassword(user, password);
    if (!isPasswordValid) {
      logger.warn({ fn: functionName, email }, `Login failed: Invalid password for email: ${email}`);
      res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
      return;
    }
    if (user.role !== 'admin' && await getMaintenanceMode()) {
      logger.warn({ fn: functionName, email, role: user.role }, `Login blocked: platform in maintenance mode`);
      res.status(503).json({
        success: false,
        maintenance: true,
        message: 'The platform is currently under maintenance. Please try again later.'
      });
      return;
    }
    logger.debug(
      { fn: functionName, email, role: user.role, role_id: user.role_id },
      `Resolved user role: ${user.role} (role_id=${user.role_id})`
    );
    logger.debug(
      { fn: functionName, email, role_id: user.role_id },
      `Generating JWT token for user: ${email} with role_id: ${user.role_id}`
    );
    const token = jwt.sign(
      {
        id: user.user_id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        role_id: user.role_id,
        must_change_password: user.must_change_password,
      },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );
    logger.info({ fn: functionName, email }, `Login successful for email: ${email}`);
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.user_id,
        email: user.email,
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        role: user.role,
        roleId: user.role_id,
        mustChangePassword: user.must_change_password,
      }
    });
  } catch (error) {
    logger.error({ fn: 'login', error }, `Login error: ${error}`);
    res.status(500).json({
      success: false,
      message: 'An error occurred during authentication'
    });
  }
};

export const validateToken: RequestHandler = async (req, res, next) => {
  const functionName = "validateToken";
  logger.info({ fn: functionName }, 'Token validation request received.');
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      logger.warn({ fn: functionName }, 'Token validation failed: No token provided.');
      res.status(401).json({
        success: false,
        message: 'No token provided'
      });
      return;
    }
    logger.debug({ fn: functionName }, 'Verifying token...');
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; role_id: number };
    const user = await findUserById(decoded.id);
    if (!user) {
      logger.warn(
        { fn: functionName, userId: decoded.id },
        `Token validation failed: User not found for token. userId=${decoded.id}`
      );
      res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
      return;
    }
    logger.info(
      { fn: functionName, user_id: user.user_id, email: user.email },
      `Token validated successfully for user: ${JSON.stringify({ user_id: user.user_id, email: user.email })}`
    );
    res.status(200).json({
      success: true,
      user: {
        id: user.user_id,
        email: user.email,
        role: user.role,
        role_id: user.role_id,
      }
    });
  } catch (error) {
    logger.error({ fn: 'validateToken', error }, `Token validation error: ${error}`);
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

/** Minimum bar for a password the holder chooses -- mirrors the admin form. */
const PASSWORD_RULES: { test: RegExp; message: string }[] = [
  { test: /.{8,}/, message: 'Password must be at least 8 characters' },
  { test: /[a-z]/, message: 'Password must contain a lowercase letter' },
  { test: /[A-Z]/, message: 'Password must contain an uppercase letter' },
  { test: /\d/, message: 'Password must contain a number' },
  { test: /[!@#$%^&*(),.?":{}|<>]/, message: 'Password must contain a special character' },
];

/**
 * Lets the signed-in holder replace their own password. Reachable while
 * must_change_password is set -- it is the one thing the middleware still
 * allows -- and returns a fresh token with the flag cleared so the client is
 * not stuck re-prompting against its old one.
 */
export const changeOwnPassword: RequestHandler = async (req, res) => {
  const functionName = "changeOwnPassword";
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ success: false, message: 'Current and new password are required' });
      return;
    }

    const user = await findUserByEmail(req.user!.email);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // Re-checking the current password keeps a stolen token from being enough
    // to take an account over permanently.
    if (!(await validateUserPassword(user, currentPassword))) {
      logger.warn({ fn: functionName, userId }, 'Password change rejected: current password incorrect');
      res.status(401).json({ success: false, message: 'Current password is incorrect' });
      return;
    }

    const failed = PASSWORD_RULES.find((rule) => !rule.test.test(newPassword));
    if (failed) {
      res.status(400).json({ success: false, message: failed.message });
      return;
    }

    if (newPassword === currentPassword) {
      res.status(400).json({ success: false, message: 'New password must be different from the current one' });
      return;
    }

    await setOwnPassword(userId, await bcrypt.hash(newPassword, 10));

    const token = jwt.sign(
      {
        id: user.user_id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        role_id: user.role_id,
        must_change_password: false,
      },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    logger.info({ fn: functionName, userId }, `Password changed by holder ${userId}`);
    res.status(200).json({ success: true, message: 'Password updated', token });
  } catch (error) {
    logger.error({ fn: functionName, error }, `Change own password error: ${error}`);
    res.status(500).json({ success: false, message: 'An error occurred while changing your password' });
  }
};
