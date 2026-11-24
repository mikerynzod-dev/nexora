import crypto from 'crypto';

const runtimeJwtSecret = process.env.JWT_SECRET && process.env.JWT_SECRET.trim().length > 0
  ? process.env.JWT_SECRET.trim()
  : crypto.randomBytes(32).toString('hex');

export const env = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  jwtSecret: runtimeJwtSecret,
  adminEmail: (process.env.ADMIN_EMAIL || '').trim().toLowerCase(),
  adminPassword: (process.env.ADMIN_PASSWORD || '').trim(),
  ownerAdminEmail: 'mikerynzod@gmail.com',
  paymongoSecretKey: (process.env.PAYMONGO_SECRET_KEY || '').trim(),
  paymongoWebhookSecret: (process.env.PAYMONGO_WEBHOOK_SECRET || '').trim(),
  cloudinaryCloudName: (process.env.CLOUDINARY_CLOUD_NAME || '').trim(),
  cloudinaryUploadPreset: (process.env.CLOUDINARY_UPLOAD_PRESET || '').trim(),
};
