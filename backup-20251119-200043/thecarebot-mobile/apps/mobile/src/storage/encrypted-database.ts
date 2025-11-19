/**
 * TheCareBot Mobile - Encrypted SQLite Database
 * Offline-first medical data storage with AES-256-GCM encryption
 * 24-hour minimum offline capability with secure sync
 */

import SQLite from 'react-native-sqlite-storage';
import { MedicalEncryption, MedicalKeyManager } from '@/utils/encryption';
import type {
  MedicalSession,
  AnalysisResults,
  MedicalFile,
  CompressedRadiographyImage,
  OfflineMedicalRecord,
  AESEncryptedData,
  SyncStatus,
  SessionUUID,
  ChileanRUT,
} from '@/types';

// Enable SQLite debugging in development
SQLite.DEBUG(true);
SQLite.enablePromise(true);

/**
 * Encrypted medical database for offline-first mobile app
 * Implements AES-256-GCM encryption for all medical PHI
 */
export class EncryptedMedicalDatabase {
  private static instance: EncryptedMedicalDatabase;
  private database: SQLite.SQLiteDatabase | null = null;
  private masterKey: string | null = null;
  
  private readonly dbName = 'thecarebot_medical_encrypted.db';
  private readonly dbVersion = '1.0';
  private readonly dbLocation = 'default';

  private constructor() {}

  /**
   * Singleton instance for encrypted database
   */
  public static getInstance(): EncryptedMedicalDatabase {
    if (!EncryptedMedicalDatabase.instance) {
      EncryptedMedicalDatabase.instance = new EncryptedMedicalDatabase();
    }
    return EncryptedMedicalDatabase.instance;
  }

  /**
   * Initialize encrypted database with biometric authentication
   */
  public async initialize(biometricPrompt = 'Access medical data'): Promise<void> {
    try {
      // Authenticate and retrieve master key
      this.masterKey = await MedicalKeyManager.retrieveMasterKey(biometricPrompt);
      
      // Open SQLite database
      this.database = await SQLite.openDatabase({
        name: this.dbName,
        location: this.dbLocation,
        version: this.dbVersion,
        createFromLocation: undefined,
      });

      await this.createEncryptedTables();
      await this.createIndexes();
      await this.createTriggers();

      console.log('Encrypted medical database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize encrypted medical database:', error);
      throw new Error('Encrypted database initialization failed: ' + 
        (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Create encrypted tables for medical data storage
   */
  private async createEncryptedTables(): Promise<void> {
    if (!this.database) throw new Error('Database not initialized');

    const tables = [
      // Encrypted medical sessions with 24-hour offline capability
      `CREATE TABLE IF NOT EXISTS encrypted_medical_sessions (
        id TEXT PRIMARY KEY,
        doctor_id TEXT NOT NULL,
        doctor_rut_hash TEXT NOT NULL,
        patient_rut_hash TEXT NOT NULL,
        session_type TEXT NOT NULL,
        encrypted_data TEXT NOT NULL,
        iv TEXT NOT NULL,
        salt TEXT NOT NULL,
        auth_tag TEXT NOT NULL,
        integrity_hash TEXT NOT NULL,
        sync_status TEXT NOT NULL DEFAULT 'pending',
        version INTEGER NOT NULL DEFAULT 1,
        offline_capability_hours INTEGER NOT NULL DEFAULT 24,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        last_accessed INTEGER NOT NULL,
        biometric_locked INTEGER NOT NULL DEFAULT 1
      )`,

      // Encrypted analysis results with confidence scoring
      `CREATE TABLE IF NOT EXISTS encrypted_analyses (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        analysis_type TEXT NOT NULL,
        encrypted_data TEXT NOT NULL,
        iv TEXT NOT NULL,
        salt TEXT NOT NULL,
        auth_tag TEXT NOT NULL,
        integrity_hash TEXT NOT NULL,
        confidence_score REAL,
        requires_review INTEGER NOT NULL DEFAULT 0,
        sync_status TEXT NOT NULL DEFAULT 'pending',
        version INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES encrypted_medical_sessions (id) ON DELETE CASCADE
      )`,

      // Encrypted patient cache with expiration
      `CREATE TABLE IF NOT EXISTS encrypted_patient_cache (
        rut_hash TEXT PRIMARY KEY,
        encrypted_data TEXT NOT NULL,
        iv TEXT NOT NULL,
        salt TEXT NOT NULL,
        auth_tag TEXT NOT NULL,
        integrity_hash TEXT NOT NULL,
        last_accessed INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        access_count INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,

      // Compressed medical files with integrity verification
      `CREATE TABLE IF NOT EXISTS encrypted_medical_files (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_type TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        original_path TEXT NOT NULL,
        compressed_path TEXT,
        thumbnail_path TEXT,
        original_size INTEGER NOT NULL,
        compressed_size INTEGER,
        compression_ratio REAL,
        compression_level INTEGER DEFAULT 5,
        encrypted_metadata TEXT NOT NULL,
        iv TEXT NOT NULL,
        salt TEXT NOT NULL,
        auth_tag TEXT NOT NULL,
        integrity_hash TEXT NOT NULL,
        upload_status TEXT NOT NULL DEFAULT 'pending',
        upload_progress INTEGER NOT NULL DEFAULT 0,
        sync_status TEXT NOT NULL DEFAULT 'pending',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES encrypted_medical_sessions (id) ON DELETE CASCADE
      )`,

      // Sync audit log for medical compliance
      `CREATE TABLE IF NOT EXISTS sync_audit_log (
        id TEXT PRIMARY KEY,
        operation_type TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        resource_id TEXT NOT NULL,
        sync_direction TEXT NOT NULL,
        status TEXT NOT NULL,
        error_message TEXT,
        data_hash TEXT,
        sync_timestamp INTEGER NOT NULL,
        retry_count INTEGER NOT NULL DEFAULT 0,
        network_type TEXT,
        is_secure_wifi INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      )`,

      // Biometric access log for medical audit trail
      `CREATE TABLE IF NOT EXISTS biometric_access_log (
        id TEXT PRIMARY KEY,
        doctor_id TEXT NOT NULL,
        access_type TEXT NOT NULL,
        biometric_type TEXT,
        success INTEGER NOT NULL,
        session_id TEXT,
        access_timestamp INTEGER NOT NULL,
        device_info TEXT,
        ip_address TEXT,
        created_at INTEGER NOT NULL
      )`,

      // Offline capability tracking
      `CREATE TABLE IF NOT EXISTS offline_capability_log (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        offline_start INTEGER NOT NULL,
        offline_end INTEGER,
        duration_hours REAL,
        actions_performed INTEGER NOT NULL DEFAULT 0,
        data_accessed INTEGER NOT NULL DEFAULT 0,
        sync_required INTEGER NOT NULL DEFAULT 0,
        battery_level REAL,
        storage_usage INTEGER,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES encrypted_medical_sessions (id) ON DELETE CASCADE
      )`,
    ];

    for (const tableSQL of tables) {
      await this.database.executeSql(tableSQL);
    }
  }

  /**
   * Create indexes for optimal encrypted query performance
   */
  private async createIndexes(): Promise<void> {
    if (!this.database) return;

    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_sessions_doctor_id ON encrypted_medical_sessions (doctor_id)',
      'CREATE INDEX IF NOT EXISTS idx_sessions_patient_hash ON encrypted_medical_sessions (patient_rut_hash)',
      'CREATE INDEX IF NOT EXISTS idx_sessions_sync_status ON encrypted_medical_sessions (sync_status)',
      'CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON encrypted_medical_sessions (expires_at)',
      'CREATE INDEX IF NOT EXISTS idx_sessions_last_accessed ON encrypted_medical_sessions (last_accessed)',
      'CREATE INDEX IF NOT EXISTS idx_analyses_session_id ON encrypted_analyses (session_id)',
      'CREATE INDEX IF NOT EXISTS idx_analyses_confidence ON encrypted_analyses (confidence_score)',
      'CREATE INDEX IF NOT EXISTS idx_analyses_review_required ON encrypted_analyses (requires_review)',
      'CREATE INDEX IF NOT EXISTS idx_patient_cache_expires ON encrypted_patient_cache (expires_at)',
      'CREATE INDEX IF NOT EXISTS idx_files_session_id ON encrypted_medical_files (session_id)',
      'CREATE INDEX IF NOT EXISTS idx_files_upload_status ON encrypted_medical_files (upload_status)',
      'CREATE INDEX IF NOT EXISTS idx_sync_log_timestamp ON sync_audit_log (sync_timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_biometric_log_doctor ON biometric_access_log (doctor_id)',
      'CREATE INDEX IF NOT EXISTS idx_biometric_log_timestamp ON biometric_access_log (access_timestamp)',
    ];

    for (const indexSQL of indexes) {
      await this.database.executeSql(indexSQL);
    }
  }

  /**
   * Create triggers for automatic data management
   */
  private async createTriggers(): Promise<void> {
    if (!this.database) return;

    const triggers = [
      // Auto-update timestamps
      `CREATE TRIGGER IF NOT EXISTS update_session_timestamp 
       AFTER UPDATE ON encrypted_medical_sessions
       BEGIN
         UPDATE encrypted_medical_sessions 
         SET updated_at = strftime('%s', 'now') * 1000
         WHERE id = NEW.id;
       END`,

      // Auto-cleanup expired sessions
      `CREATE TRIGGER IF NOT EXISTS cleanup_expired_sessions 
       AFTER INSERT ON encrypted_medical_sessions
       BEGIN
         DELETE FROM encrypted_medical_sessions 
         WHERE expires_at < strftime('%s', 'now') * 1000
         AND sync_status = 'synced';
       END`,

      // Log biometric access
      `CREATE TRIGGER IF NOT EXISTS log_session_access 
       AFTER UPDATE OF last_accessed ON encrypted_medical_sessions
       WHEN NEW.last_accessed != OLD.last_accessed
       BEGIN
         INSERT INTO biometric_access_log (
           id, doctor_id, access_type, success, session_id, 
           access_timestamp, created_at
         ) VALUES (
           hex(randomblob(16)), NEW.doctor_id, 'session_access', 
           1, NEW.id, NEW.last_accessed, strftime('%s', 'now') * 1000
         );
       END`,
    ];

    for (const triggerSQL of triggers) {
      await this.database.executeSql(triggerSQL);
    }
  }

  /**
   * Save encrypted medical session with 24-hour offline capability
   */
  public async saveMedicalSession(session: MedicalSession): Promise<void> {
    if (!this.database || !this.masterKey) {
      throw new Error('Database not initialized or no encryption key');
    }

    try {
      const timestamp = Date.now();
      const expiresAt = timestamp + (24 * 60 * 60 * 1000); // 24 hours from now
      
      // Encrypt session data
      const encryptedData = MedicalEncryption.encryptMedicalSession(session, this.masterKey);
      const integrityHash = MedicalEncryption.calculateIntegrityHash(JSON.stringify(session));
      
      // Hash RUTs for privacy while maintaining searchability
      const doctorRutHash = MedicalEncryption.calculateIntegrityHash(session.doctorRut);
      const patientRutHash = MedicalEncryption.calculateIntegrityHash(session.patientRut);

      await this.database.executeSql(
        `INSERT OR REPLACE INTO encrypted_medical_sessions (
          id, doctor_id, doctor_rut_hash, patient_rut_hash, session_type,
          encrypted_data, iv, salt, auth_tag, integrity_hash,
          sync_status, version, offline_capability_hours,
          created_at, updated_at, expires_at, last_accessed, biometric_locked
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          session.id,
          session.doctorId,
          doctorRutHash,
          patientRutHash,
          session.sessionType,
          encryptedData.encryptedData,
          encryptedData.iv,
          encryptedData.salt,
          encryptedData.tag,
          integrityHash,
          'pending',
          1,
          24, // 24-hour offline capability
          timestamp,
          timestamp,
          expiresAt,
          timestamp,
          1, // Biometric locked by default
        ]
      );

      console.log(`Encrypted medical session ${session.id} saved with 24h offline capability`);
    } catch (error) {
      console.error('Failed to save encrypted medical session:', error);
      throw new Error('Failed to save encrypted medical session: ' + 
        (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Retrieve and decrypt medical sessions for a doctor
   */
  public async getMedicalSessions(doctorId: string, includeExpired = false): Promise<MedicalSession[]> {
    if (!this.database || !this.masterKey) {
      throw new Error('Database not initialized or no encryption key');
    }

    try {
      const currentTime = Date.now();
      const whereClause = includeExpired 
        ? 'WHERE doctor_id = ?' 
        : 'WHERE doctor_id = ? AND expires_at > ?';
      
      const params = includeExpired ? [doctorId] : [doctorId, currentTime];

      const result = await this.database.executeSql(
        `SELECT encrypted_data, iv, salt, auth_tag, integrity_hash, last_accessed
         FROM encrypted_medical_sessions 
         ${whereClause}
         ORDER BY created_at DESC`,
        params
      );

      const sessions: MedicalSession[] = [];

      for (let i = 0; i < result[0].rows.length; i++) {
        const row = result[0].rows.item(i);
        
        try {
          // Decrypt session data
          const encryptedData: AESEncryptedData = {
            encryptedData: row.encrypted_data,
            iv: row.iv,
            salt: row.salt,
            tag: row.auth_tag,
            algorithm: 'AES-256-GCM',
            createdAt: row.last_accessed,
          };

          const decryptedSession = MedicalEncryption.decryptMedicalSession<MedicalSession>(
            encryptedData, 
            this.masterKey
          );

          // Verify data integrity
          const integrityHash = MedicalEncryption.calculateIntegrityHash(JSON.stringify(decryptedSession));
          if (integrityHash === row.integrity_hash) {
            sessions.push(decryptedSession);
          } else {
            console.warn(`Integrity check failed for session ${decryptedSession.id}`);
          }
        } catch (decryptionError) {
          console.error('Failed to decrypt medical session:', decryptionError);
          // Continue with other sessions instead of failing entirely
        }
      }

      // Update last accessed time for retrieved sessions
      if (sessions.length > 0) {
        const sessionIds = sessions.map(s => `'${s.id}'`).join(',');
        await this.database.executeSql(
          `UPDATE encrypted_medical_sessions 
           SET last_accessed = ? 
           WHERE id IN (${sessionIds})`,
          [currentTime]
        );
      }

      return sessions;
    } catch (error) {
      console.error('Failed to retrieve medical sessions:', error);
      throw new Error('Failed to retrieve medical sessions: ' + 
        (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Save encrypted analysis results with confidence scoring
   */
  public async saveAnalysisResults(
    sessionId: SessionUUID, 
    results: AnalysisResults
  ): Promise<void> {
    if (!this.database || !this.masterKey) {
      throw new Error('Database not initialized or no encryption key');
    }

    try {
      const timestamp = Date.now();
      
      // Encrypt analysis data
      const encryptedData = MedicalEncryption.encrypt(JSON.stringify(results), this.masterKey);
      const integrityHash = MedicalEncryption.calculateIntegrityHash(JSON.stringify(results));
      
      const requiresReview = results.results.confidence < 0.7 ? 1 : 0;

      await this.database.executeSql(
        `INSERT OR REPLACE INTO encrypted_analyses (
          id, session_id, analysis_type, encrypted_data, iv, salt, auth_tag,
          integrity_hash, confidence_score, requires_review, sync_status,
          version, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          results.analysisId,
          sessionId,
          results.analysisType,
          encryptedData.encryptedData,
          encryptedData.iv,
          encryptedData.salt,
          encryptedData.tag,
          integrityHash,
          results.results.confidence,
          requiresReview,
          'pending',
          1,
          timestamp,
          timestamp,
        ]
      );

      console.log(`Encrypted analysis results saved for session ${sessionId}`);
    } catch (error) {
      console.error('Failed to save encrypted analysis results:', error);
      throw new Error('Failed to save encrypted analysis results: ' + 
        (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Get pending sync items for intelligent synchronization
   */
  public async getPendingSyncItems(): Promise<Array<{
    type: 'session' | 'analysis' | 'media';
    id: string;
    encryptedData: AESEncryptedData;
    priority: 'high' | 'medium' | 'low';
  }>> {
    if (!this.database || !this.masterKey) {
      throw new Error('Database not initialized or no encryption key');
    }

    try {
      const pendingItems: Array<{
        type: 'session' | 'analysis' | 'media';
        id: string;
        encryptedData: AESEncryptedData;
        priority: 'high' | 'medium' | 'low';
      }> = [];

      // Get pending sessions (high priority)
      const sessionsResult = await this.database.executeSql(
        `SELECT id, encrypted_data, iv, salt, auth_tag 
         FROM encrypted_medical_sessions 
         WHERE sync_status = 'pending' 
         ORDER BY created_at DESC`,
      );

      for (let i = 0; i < sessionsResult[0].rows.length; i++) {
        const row = sessionsResult[0].rows.item(i);
        pendingItems.push({
          type: 'session',
          id: row.id,
          encryptedData: {
            encryptedData: row.encrypted_data,
            iv: row.iv,
            salt: row.salt,
            tag: row.auth_tag,
            algorithm: 'AES-256-GCM',
            createdAt: Date.now(),
          },
          priority: 'high',
        });
      }

      // Get pending analyses (medium priority)
      const analysesResult = await this.database.executeSql(
        `SELECT id, encrypted_data, iv, salt, auth_tag, requires_review
         FROM encrypted_analyses 
         WHERE sync_status = 'pending' 
         ORDER BY requires_review DESC, created_at DESC`,
      );

      for (let i = 0; i < analysesResult[0].rows.length; i++) {
        const row = analysesResult[0].rows.item(i);
        pendingItems.push({
          type: 'analysis',
          id: row.id,
          encryptedData: {
            encryptedData: row.encrypted_data,
            iv: row.iv,
            salt: row.salt,
            tag: row.auth_tag,
            algorithm: 'AES-256-GCM',
            createdAt: Date.now(),
          },
          priority: row.requires_review ? 'high' : 'medium',
        });
      }

      // Get pending media files (low priority)
      const mediaResult = await this.database.executeSql(
        `SELECT id, encrypted_metadata, iv, salt, auth_tag 
         FROM encrypted_medical_files 
         WHERE sync_status = 'pending' 
         ORDER BY original_size ASC`, // Sync smaller files first
      );

      for (let i = 0; i < mediaResult[0].rows.length; i++) {
        const row = mediaResult[0].rows.item(i);
        pendingItems.push({
          type: 'media',
          id: row.id,
          encryptedData: {
            encryptedData: row.encrypted_metadata,
            iv: row.iv,
            salt: row.salt,
            tag: row.auth_tag,
            algorithm: 'AES-256-GCM',
            createdAt: Date.now(),
          },
          priority: 'low',
        });
      }

      return pendingItems;
    } catch (error) {
      console.error('Failed to get pending sync items:', error);
      throw new Error('Failed to get pending sync items: ' + 
        (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Mark sync as completed and log for audit trail
   */
  public async markSyncCompleted(
    type: 'session' | 'analysis' | 'media', 
    id: string, 
    networkType: string,
    isSecureWiFi: boolean
  ): Promise<void> {
    if (!this.database) throw new Error('Database not initialized');

    try {
      const timestamp = Date.now();
      const tableName = type === 'session' ? 'encrypted_medical_sessions' 
        : type === 'analysis' ? 'encrypted_analyses' 
        : 'encrypted_medical_files';

      // Update sync status
      await this.database.executeSql(
        `UPDATE ${tableName} 
         SET sync_status = 'synced', updated_at = ? 
         WHERE id = ?`,
        [timestamp, id]
      );

      // Log sync completion for audit
      await this.database.executeSql(
        `INSERT INTO sync_audit_log (
          id, operation_type, resource_type, resource_id, sync_direction,
          status, sync_timestamp, network_type, is_secure_wifi, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          MedicalEncryption.generateSessionToken(),
          'sync',
          type,
          id,
          'upload',
          'completed',
          timestamp,
          networkType,
          isSecureWiFi ? 1 : 0,
          timestamp,
        ]
      );

      console.log(`Sync completed for ${type} ${id} via ${networkType}`);
    } catch (error) {
      console.error('Failed to mark sync completed:', error);
      throw error;
    }
  }

  /**
   * Clean up expired data and optimize storage
   */
  public async cleanupExpiredData(): Promise<void> {
    if (!this.database) return;

    try {
      const currentTime = Date.now();
      const expiredThreshold = currentTime - (7 * 24 * 60 * 60 * 1000); // 7 days

      // Clean up expired patient cache
      await this.database.executeSql(
        'DELETE FROM encrypted_patient_cache WHERE expires_at < ?',
        [currentTime]
      );

      // Clean up old sync logs
      await this.database.executeSql(
        'DELETE FROM sync_audit_log WHERE sync_timestamp < ?',
        [expiredThreshold]
      );

      // Clean up old biometric access logs
      await this.database.executeSql(
        'DELETE FROM biometric_access_log WHERE access_timestamp < ?',
        [expiredThreshold]
      );

      // Clean up synced sessions older than 7 days
      await this.database.executeSql(
        `DELETE FROM encrypted_medical_sessions 
         WHERE sync_status = 'synced' AND updated_at < ?`,
        [expiredThreshold]
      );

      console.log('Cleanup of expired medical data completed');
    } catch (error) {
      console.error('Failed to cleanup expired data:', error);
    }
  }

  /**
   * Get offline capability statistics
   */
  public async getOfflineCapabilityStats(): Promise<{
    activeSessions: number;
    totalOfflineHours: number;
    pendingSyncItems: number;
    storageUsed: number;
  }> {
    if (!this.database) throw new Error('Database not initialized');

    try {
      const currentTime = Date.now();
      
      // Count active sessions
      const activeSessionsResult = await this.database.executeSql(
        'SELECT COUNT(*) as count FROM encrypted_medical_sessions WHERE expires_at > ?',
        [currentTime]
      );
      
      // Count pending sync items
      const pendingSyncResult = await this.database.executeSql(`
        SELECT 
          (SELECT COUNT(*) FROM encrypted_medical_sessions WHERE sync_status = 'pending') +
          (SELECT COUNT(*) FROM encrypted_analyses WHERE sync_status = 'pending') +
          (SELECT COUNT(*) FROM encrypted_medical_files WHERE sync_status = 'pending')
        as count
      `);

      // Calculate total offline hours available
      const offlineHoursResult = await this.database.executeSql(
        'SELECT SUM(offline_capability_hours) as total FROM encrypted_medical_sessions WHERE expires_at > ?',
        [currentTime]
      );

      return {
        activeSessions: activeSessionsResult[0].rows.item(0).count || 0,
        totalOfflineHours: offlineHoursResult[0].rows.item(0).total || 0,
        pendingSyncItems: pendingSyncResult[0].rows.item(0).count || 0,
        storageUsed: 0, // Would be calculated from file system
      };
    } catch (error) {
      console.error('Failed to get offline capability stats:', error);
      throw error;
    }
  }

  /**
   * Close database connection and clear sensitive data
   */
  public async close(): Promise<void> {
    try {
      if (this.database) {
        await this.database.close();
        this.database = null;
      }
      
      // Clear master key from memory
      this.masterKey = null;
      
      console.log('Encrypted medical database closed securely');
    } catch (error) {
      console.error('Failed to close encrypted database:', error);
    }
  }
}

// Export singleton instance
export const encryptedMedicalDb = EncryptedMedicalDatabase.getInstance();