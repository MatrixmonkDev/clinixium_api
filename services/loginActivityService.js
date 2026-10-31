import pool from '../config/database.js';
import { getCurrentTimestampString, getCurrentTimestamp } from '../utils/timestamp.js';

class LoginActivityService {
  // Cache for blocking configuration (refreshed every 5 minutes)
  static blockingConfigCache = null;
  static cacheExpiry = null;
  static CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Get blocking configuration from database (with caching)
  static async getBlockingConfig() {
    const now = Date.now();

    // Return cached config if still valid
    if (this.blockingConfigCache && this.cacheExpiry && now < this.cacheExpiry) {
      return this.blockingConfigCache;
    }

    // Fetch from database
    const query = `
      SELECT level, max_attempts, block_duration_minutes, enabled
      FROM blocking_config
      WHERE enabled = 1
      ORDER BY level ASC
    `;

    const [rows] = await pool.execute(query);

    // Convert to object format
    const config = {};
    for (const row of rows) {
      config[row.level] = {
        maxAttempts: row.max_attempts,
        blockDuration: row.block_duration_minutes,
      };
    }

    // Update cache
    this.blockingConfigCache = config;
    this.cacheExpiry = now + this.CACHE_TTL;

    return config;
  }

  // Clear cache (call after admin updates config)
  static clearCache() {
    this.blockingConfigCache = null;
    this.cacheExpiry = null;
  }

  // Log login attempt to login_activity table
  static async logLoginAttempt(userType, userId, ip, browser, status, failureReason = null) {
    const now = getCurrentTimestampString();
    
    const query = `
      INSERT INTO login_activity (user_type, user_id, ip, browser, status, failure_reason, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    await pool.execute(query, [userType, userId, ip, browser, status, failureReason, now]);
  }

  // Check if user/IP is currently blocked
  static async checkIfBlocked(userType, userId, ip) {
    const query = `
      SELECT * FROM blocking_attempts
      WHERE user_type = ? AND user_id = ? AND ip = ? AND blocked_until > NOW() AND status = 1
    `;

    const [rows] = await pool.execute(query, [userType, userId, ip]);
    return rows[0] || null;
  }

  // Get current blocking state (even if not blocked) - only active (status=1)
  static async getCurrentBlockingState(userType, userId, ip) {
    const query = `
      SELECT * FROM blocking_attempts
      WHERE user_type = ? AND user_id = ? AND ip = ? AND status = 1
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const [rows] = await pool.execute(query, [userType, userId, ip]);
    return rows[0] || null;
  }

  // Handle failed login attempt and potentially block user
  static async checkAndHandleFailedAttempt(userType, userId, ip) {
    // Get dynamic blocking configuration
    const blockingConfig = await this.getBlockingConfig();

    // Get current state
    let currentState = await this.getCurrentBlockingState(userType, userId, ip);

    // If no record exists, create one
    if (!currentState) {
      const now = getCurrentTimestampString();
      const query = `
        INSERT INTO blocking_attempts (user_type, user_id, ip, level, attempt_count, blocked_until, status, created_at, updated_at)
        VALUES (?, ?, ?, 1, 1, NULL, 1, ?, ?)
      `;
      await pool.execute(query, [userType, userId, ip, now, now]);
      return { blocked: false, level: 1, attemptCount: 1 };
    }

    // If already blocked, return block info
    if (currentState.blocked_until && new Date(currentState.blocked_until) > getCurrentTimestamp()) {
      const remainingMinutes = Math.ceil((new Date(currentState.blocked_until) - getCurrentTimestamp()) / 60000);
      return {
        blocked: true,
        level: currentState.level,
        blockedUntil: currentState.blocked_until,
        remainingTime: `${remainingMinutes} minutes`,
      };
    }

    // Increment attempt count
    const newAttemptCount = currentState.attempt_count + 1;
    const currentLevel = currentState.level;

    // Check if we need to block or upgrade level
    let newLevel = currentLevel;
    let blockedUntil = null;

    // Check all levels in ascending order
    const levels = Object.keys(blockingConfig).map(Number).sort((a, b) => a - b);
    const maxLevel = levels[levels.length - 1];

    for (const level of levels) {
      const config = blockingConfig[level];
      if (newAttemptCount >= config.maxAttempts) {
        newLevel = level;
        // Use timezone-adjusted time for blockedUntil
        const now = getCurrentTimestamp();
        blockedUntil = new Date(now.getTime() + config.blockDuration * 60000);
      }
    }

    // Update the record
    const now = getCurrentTimestampString();
    const updateQuery = `
      UPDATE blocking_attempts
      SET level = ?, attempt_count = ?, blocked_until = ?, updated_at = ?
      WHERE id = ?
    `;
    await pool.execute(updateQuery, [newLevel, newAttemptCount, blockedUntil, now, currentState.id]);

    if (blockedUntil) {
      const remainingMinutes = Math.ceil((blockedUntil - getCurrentTimestamp()) / 60000);
      return {
        blocked: true,
        level: newLevel,
        blockedUntil: blockedUntil,
        remainingTime: `${remainingMinutes} minutes`,
      };
    }

    return { blocked: false, level: newLevel, attemptCount: newAttemptCount };
  }

  // Reset login attempts on successful login (mark as resolved instead of delete)
  static async resetLoginAttempts(userType, userId, ip) {
    const now = getCurrentTimestampString();
    const query = `
      UPDATE blocking_attempts
      SET status = 2, resolved_at = ?, updated_at = ?
      WHERE user_type = ? AND user_id = ? AND ip = ? AND status = 1
    `;

    await pool.execute(query, [now, now, userType, userId, ip]);
  }

  // Get user's login history
  static async getUserLoginHistory(userType, userId, limit = 20) {
    const query = `
      SELECT * FROM login_activity
      WHERE user_type = ? AND user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `;

    const [rows] = await pool.execute(query, [userType, userId, limit]);
    return rows;
  }

  // Get user's blocking history (both active and resolved)
  static async getUserBlockingHistory(userType, userId, limit = 20) {
    const query = `
      SELECT * FROM blocking_attempts
      WHERE user_type = ? AND user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `;

    const [rows] = await pool.execute(query, [userType, userId, limit]);
    return rows;
  }

  // Get recent failed attempts within specified minutes
  static async getRecentFailedAttempts(userType, userId, ip, minutes = 15) {
    const query = `
      SELECT COUNT(*) as count
      FROM login_activity
      WHERE user_type = ? AND user_id = ? AND ip = ?
        AND status = 'failed'
        AND created_at > DATE_SUB(NOW(), INTERVAL ? MINUTE)
    `;

    const [rows] = await pool.execute(query, [userType, userId, ip, minutes]);
    return rows[0].count;
  }

  // Admin: Manual unblock (mark as resolved instead of delete)
  static async manualUnblock(userType, userId, ip = null) {
    const now = getCurrentTimestampString();
    let query;
    let params;

    if (ip) {
      query = `
        UPDATE blocking_attempts
        SET status = 2, resolved_at = ?, updated_at = ?
        WHERE user_type = ? AND user_id = ? AND ip = ? AND status = 1
      `;
      params = [now, now, userType, userId, ip];
    } else {
      query = `
        UPDATE blocking_attempts
        SET status = 2, resolved_at = ?, updated_at = ?
        WHERE user_type = ? AND user_id = ? AND status = 1
      `;
      params = [now, now, userType, userId];
    }

    await pool.execute(query, params);
  }

  // Cleanup old login activity records (optional - run periodically)
  static async cleanupOldActivity(daysToKeep = 90) {
    const query = `
      DELETE FROM login_activity
      WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
    `;

    await pool.execute(query, [daysToKeep]);
  }

  // Cleanup old resolved blocking attempts (optional - run periodically)
  static async cleanupOldResolvedAttempts(daysToKeep = 90) {
    const query = `
      DELETE FROM blocking_attempts
      WHERE status = 2 AND resolved_at < DATE_SUB(NOW(), INTERVAL ? DAY)
    `;

    await pool.execute(query, [daysToKeep]);
  }

  // ============ ADMIN METHODS FOR BLOCKING CONFIGURATION ============

  // Get all blocking configurations
  static async getAllBlockingConfigs() {
    const query = `
      SELECT * FROM blocking_config
      ORDER BY level ASC
    `;

    const [rows] = await pool.execute(query);
    return rows;
  }

  // Get specific blocking configuration
  static async getBlockingConfigByLevel(level) {
    const query = `
      SELECT * FROM blocking_config
      WHERE level = ?
    `;

    const [rows] = await pool.execute(query, [level]);
    return rows[0] || null;
  }

  // Update blocking configuration
  static async updateBlockingConfig(level, maxAttempts, blockDurationMinutes, enabled = 1) {
    const now = getCurrentTimestampString();
    const query = `
      INSERT INTO blocking_config (level, max_attempts, block_duration_minutes, enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        max_attempts = VALUES(max_attempts),
        block_duration_minutes = VALUES(block_duration_minutes),
        enabled = VALUES(enabled),
        updated_at = ?
    `;

    await pool.execute(query, [level, maxAttempts, blockDurationMinutes, enabled, now, now, now]);

    // Clear cache so changes take effect immediately
    this.clearCache();
  }

  // Delete blocking configuration
  static async deleteBlockingConfig(level) {
    const query = `
      DELETE FROM blocking_config
      WHERE level = ?
    `;

    await pool.execute(query, [level]);

    // Clear cache
    this.clearCache();
  }

  // Create new blocking configuration
  static async createBlockingConfig(level, maxAttempts, blockDurationMinutes, enabled = 1) {
    const now = getCurrentTimestampString();
    const query = `
      INSERT INTO blocking_config (level, max_attempts, block_duration_minutes, enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    await pool.execute(query, [level, maxAttempts, blockDurationMinutes, enabled, now, now]);

    // Clear cache
    this.clearCache();
  }
}

export default LoginActivityService;
