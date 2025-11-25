import logger from '../config/logger';
import { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { createUser, findUserByEmail, findUserById, findUserByUsername, validateUserPassword } from '../models/AuthModel';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';
const TOKEN_EXPIRY = '24h';


export const signup: RequestHandler = async (req, res) => {
  const functionName = "signup";
  logger.debug({ fn: functionName, body: req.body }, `Signup request received: ${JSON.stringify(req.body)}`);
  try {
    const { first_name, last_name, username, email, password, role } = req.body;
    if (!first_name || !email || !password || !role) {
      logger.warn(
        { fn: functionName, first_name, email, role },
        `Signup validation failed: Missing required fields: first_name=${first_name}, email=${email}, role=${role}`
      );
      res.status(400).json({
        success: false,
        message: 'First name, email, password, and user type are required'
      });
      return;
    }
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      logger.warn({ fn: functionName, email }, `Signup conflict: User already exists with email: ${email}`);
      res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
      return;
    }
    const existingUsername = await findUserByUsername(username);
    if (existingUsername) {
      logger.warn({ fn: functionName, username }, `Signup conflict: Username already exists: ${username}`);
      res.status(409).json({
        success: false,
        message: 'Another user with this username already exists'
      });
      return;
    }
    logger.info({ fn: functionName, email, role }, `Creating new user: email=${email}, role=${role}`);
    const newUser = await createUser({
      first_name,
      last_name,
      username,
      email,
      password,
      role,
    });
    logger.info(
      { fn: functionName, user_id: newUser.user_id, email: newUser.email, role_id: newUser.role_id },
      `User created successfully: ${JSON.stringify({ user_id: newUser.user_id, email: newUser.email, role_id: newUser.role_id })}`
    );
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: newUser.user_id,
        username: newUser.username,
        email: newUser.email,
        name: `${newUser.first_name || ''} ${newUser.last_name || ''}`.trim(),
        role: newUser.role,
        role_id: newUser.role_id,
      },
    });
  } catch (error) {
    logger.error({ fn: functionName, error }, `Signup error: ${error}`);
    res.status(500).json({
      success: false,
      message: 'An error occurred during registration',
    });
  }
};

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
        username: user.username,
        email: user.email,
        role: user.role,
        role_id: user.role_id,
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
        username: user.username,
        email: user.email,
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        role: user.role,
        roleId: user.role_id,
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
        username: user.username,
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
