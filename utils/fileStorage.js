// utils/fileStorage.js - RESULT STORAGE SYSTEM
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createLogger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logger = createLogger('STORAGE');

class FileStorage {
  constructor() {
    this.storageDir = path.join(__dirname, '..', 'storage');
    this.categories = {
      candidates: path.join(this.storageDir, 'candidates'),
      prs: path.join(this.storageDir, 'prs'),
      analytics: path.join(this.storageDir, 'analytics'),
      cache: path.join(this.storageDir, 'cache'),
      images: path.join(this.storageDir, 'images')
    };

    this._ensureDirectories();
  }

  _ensureDirectories() {
    Object.values(this.categories).forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  // ========================================================================
  // SAVE METHODS
  // ========================================================================

  async saveFile(filename, data) {
    const filepath = path.join(this.storageDir, filename);

    try {
      fs.writeFileSync(filepath, data, 'utf8');
      logger.success('SAVE', `File saved: ${filename}`, { filepath });
      return { success: true, filepath };
    } catch (error) {
      logger.error('SAVE', `Failed to save file: ${filename}`, error);
      return { success: false, error: error.message };
    }
  }

  async getFile(filename) {
    const filepath = path.join(this.storageDir, filename);

    try {
      if (!fs.existsSync(filepath)) {
        return { found: false, error: 'File not found' };
      }

      const data = fs.readFileSync(filepath, 'utf8');
      logger.info('READ', `File retrieved: ${filename}`);
      return { found: true, data };
    } catch (error) {
      logger.error('READ', `Failed to read file: ${filename}`, error);
      return { found: false, error: error.message };
    }
  }

  async saveCandidateData(name, data, metadata = {}) {
    const filename = this._sanitizeFilename(name) + '.json';
    const filepath = path.join(this.categories.candidates, filename);

    const record = {
      name,
      timestamp: new Date().toISOString(),
      metadata,
      data,
      version: '1.0'
    };

    try {
      fs.writeFileSync(filepath, JSON.stringify(record, null, 2), 'utf8');
      logger.success('SAVE', `Candidate data saved: ${name}`, { filepath });

      // Also append to daily log
      this._appendToDailyLog('candidates', record);

      return { success: true, filepath };
    } catch (error) {
      logger.error('SAVE', `Failed to save candidate: ${name}`, error);
      return { success: false, error: error.message };
    }
  }

  async savePrsData(name, type, data, metadata = {}) {
    const filename = this._sanitizeFilename(`${type}-${name}`) + '.json';
    const filepath = path.join(this.categories.prs, filename);

    const record = {
      name,
      type,
      timestamp: new Date().toISOString(),
      metadata,
      data,
      version: '1.0'
    };

    try {
      fs.writeFileSync(filepath, JSON.stringify(record, null, 2), 'utf8');
      logger.success('SAVE', `PRS data saved: ${name} (${type})`, { filepath });

      this._appendToDailyLog('prs', record);

      return { success: true, filepath };
    } catch (error) {
      logger.error('SAVE', `Failed to save PRS: ${name}`, error);
      return { success: false, error: error.message };
    }
  }

  async saveAnalytics(eventType, data) {
    const filename = `${eventType}-${Date.now()}.json`;
    const filepath = path.join(this.categories.analytics, filename);

    const record = {
      eventType,
      timestamp: new Date().toISOString(),
      data
    };

    try {
      fs.writeFileSync(filepath, JSON.stringify(record, null, 2), 'utf8');

      // Also append to aggregated analytics
      this._appendToAnalyticsLog(record);

      return { success: true, filepath };
    } catch (error) {
      logger.error('SAVE', 'Failed to save analytics', error);
      return { success: false, error: error.message };
    }
  }

  // ========================================================================
  // READ METHODS
  // ========================================================================

  async getCandidateData(name) {
    const filename = this._sanitizeFilename(name) + '.json';
    const filepath = path.join(this.categories.candidates, filename);

    try {
      if (!fs.existsSync(filepath)) {
        return { found: false, error: 'Not found in storage' };
      }

      const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      logger.info('READ', `Candidate data retrieved: ${name}`);

      return { found: true, data };
    } catch (error) {
      logger.error('READ', `Failed to read candidate: ${name}`, error);
      return { found: false, error: error.message };
    }
  }

  async getPrsData(name, type) {
    const filename = this._sanitizeFilename(`${type}-${name}`) + '.json';
    const filepath = path.join(this.categories.prs, filename);

    try {
      if (!fs.existsSync(filepath)) {
        return { found: false, error: 'Not found in storage' };
      }

      const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      logger.info('READ', `PRS data retrieved: ${name} (${type})`);

      return { found: true, data };
    } catch (error) {
      logger.error('READ', `Failed to read PRS: ${name}`, error);
      return { found: false, error: error.message };
    }
  }

  // ========================================================================
  // SEARCH & QUERY
  // ========================================================================

  searchCandidates(query) {
    try {
      const files = fs.readdirSync(this.categories.candidates);
      const results = [];

      const lowerQuery = query.toLowerCase();

      files.forEach(file => {
        if (!file.endsWith('.json')) return;

        const filepath = path.join(this.categories.candidates, file);
        try {
          const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));

          if (data.name.toLowerCase().includes(lowerQuery)) {
            results.push({
              name: data.name,
              timestamp: data.timestamp,
              file: file
            });
          }
        } catch (err) {
          // Skip invalid files
        }
      });

      logger.info('SEARCH', `Found ${results.length} candidates`, { query });
      return results;
    } catch (error) {
      logger.error('SEARCH', 'Search failed', error);
      return [];
    }
  }

  // ========================================================================
  // DAILY LOGS (Append-only logs)
  // ========================================================================

  _appendToDailyLog(category, record) {
    const date = new Date().toISOString().split('T')[0];
    const filename = `${date}-${category}.jsonl`; // JSON Lines format
    const filepath = path.join(this.categories[category], filename);

    try {
      const logLine = JSON.stringify(record) + '\n';
      fs.appendFileSync(filepath, logLine, 'utf8');
    } catch (error) {
      logger.error('LOG', 'Failed to append to daily log', error);
    }
  }

  _appendToAnalyticsLog(record) {
    const date = new Date().toISOString().split('T')[0];
    const filename = `${date}-analytics.jsonl`;
    const filepath = path.join(this.categories.analytics, filename);

    try {
      const logLine = JSON.stringify(record) + '\n';
      fs.appendFileSync(filepath, logLine, 'utf8');
    } catch (error) {
      logger.error('LOG', 'Failed to append to analytics log', error);
    }
  }

  // ========================================================================
  // ANALYTICS & REPORTING
  // ========================================================================

  getAnalyticsSummary(days = 7) {
    try {
      const files = fs.readdirSync(this.categories.analytics);
      const cutoffDate = Date.now() - (days * 24 * 60 * 60 * 1000);

      const summary = {
        totalEvents: 0,
        eventsByType: {},
        dateRange: {
          from: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
          to: new Date().toISOString()
        }
      };

      files.forEach(file => {
        if (!file.endsWith('.jsonl')) return;

        const filepath = path.join(this.categories.analytics, file);
        const stats = fs.statSync(filepath);

        if (stats.mtimeMs < cutoffDate) return;

        const content = fs.readFileSync(filepath, 'utf8');
        const lines = content.split('\n').filter(Boolean);

        lines.forEach(line => {
          try {
            const event = JSON.parse(line);
            summary.totalEvents++;
            summary.eventsByType[event.eventType] = (summary.eventsByType[event.eventType] || 0) + 1;
          } catch (err) {
            // Skip invalid lines
          }
        });
      });

      return summary;
    } catch (error) {
      logger.error('ANALYTICS', 'Failed to generate summary', error);
      return { error: error.message };
    }
  }

  // ========================================================================
  // UTILITIES
  // ========================================================================

  _sanitizeFilename(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  getStats() {
    const stats = {};

    Object.entries(this.categories).forEach(([category, dir]) => {
      try {
        const files = fs.readdirSync(dir);
        let totalSize = 0;

        files.forEach(file => {
          const filepath = path.join(dir, file);
          totalSize += fs.statSync(filepath).size;
        });

        stats[category] = {
          files: files.length,
          size: `${(totalSize / 1024 / 1024).toFixed(2)} MB`
        };
      } catch (error) {
        stats[category] = { error: error.message };
      }
    });

    return stats;
  }

  clearCategory(category) {
    if (!this.categories[category]) {
      throw new Error(`Invalid category: ${category}`);
    }

    try {
      const files = fs.readdirSync(this.categories[category]);
      let deleted = 0;

      files.forEach(file => {
        const filepath = path.join(this.categories[category], file);
        fs.unlinkSync(filepath);
        deleted++;
      });

      logger.info('CLEAR', `Cleared ${deleted} files from ${category}`);
      return { success: true, deleted };
    } catch (error) {
      logger.error('CLEAR', `Failed to clear ${category}`, error);
      return { success: false, error: error.message };
    }
  }

  // Export all data as backup
  async createBackup() {
    const backupDir = path.join(this.storageDir, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup-${timestamp}.tar`);

    // For simplicity, create a JSON backup
    const backup = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      data: {}
    };

    Object.entries(this.categories).forEach(([category, dir]) => {
      backup.data[category] = [];

      const files = fs.readdirSync(dir);
      files.forEach(file => {
        if (file.endsWith('.json')) {
          const filepath = path.join(dir, file);
          const content = JSON.parse(fs.readFileSync(filepath, 'utf8'));
          backup.data[category].push(content);
        }
      });
    });

    const backupPath = path.join(backupDir, `backup-${timestamp}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf8');

    logger.success('BACKUP', `Backup created: ${backupPath}`);
    return { success: true, filepath: backupPath };
  }

  // ========================================================================
  // CLEANUP METHODS
  // ========================================================================

  // Cleanup old files in storage categories based on retention policies
  cleanupOldFiles(retentionConfig = {}) {
    const results = {
      totalDeleted: 0,
      categories: {}
    };

    Object.entries(this.categories).forEach(([category, dir]) => {
      try {
        const retentionValue = retentionConfig[category] || 30; // Default 30 days
        let retentionMs;

        // Check if retention is in hours (for storage) or days (for logs)
        if (category === 'logs') {
          retentionMs = retentionValue * 24 * 60 * 60 * 1000; // days to ms
        } else {
          retentionMs = retentionValue * 60 * 60 * 1000; // hours to ms
        }

        const cutoffDate = Date.now() - retentionMs;
        const files = fs.readdirSync(dir);
        let deleted = 0;

        files.forEach(file => {
          const filepath = path.join(dir, file);
          const stats = fs.statSync(filepath);

          if (stats.mtimeMs < cutoffDate) {
            fs.unlinkSync(filepath);
            deleted++;
          }
        });

        results.categories[category] = {
          deleted,
          retentionValue,
          retentionUnit: category === 'logs' ? 'days' : 'hours',
          totalFiles: files.length
        };

        if (deleted > 0) {
          logger.info('CLEANUP', `Cleaned ${deleted} old files from ${category} (${retentionValue} ${category === 'logs' ? 'days' : 'hours'} retention)`);
        }

        results.totalDeleted += deleted;
      } catch (error) {
        logger.error('CLEANUP', `Failed to cleanup ${category}`, error);
        results.categories[category] = { error: error.message };
      }
    });

    return results;
  }

  // Get cleanup stats (preview what would be deleted)
  getCleanupStats(retentionConfig = {}) {
    const stats = {
      totalFiles: 0,
      filesToDelete: 0,
      categories: {}
    };

    Object.entries(this.categories).forEach(([category, dir]) => {
      try {
        const retentionValue = retentionConfig[category] || 30; // Default 30 days
        let retentionMs;

        // Check if retention is in hours (for storage) or days (for logs)
        if (category === 'logs') {
          retentionMs = retentionValue * 24 * 60 * 60 * 1000; // days to ms
        } else {
          retentionMs = retentionValue * 60 * 60 * 1000; // hours to ms
        }

        const cutoffDate = Date.now() - retentionMs;
        const files = fs.readdirSync(dir);
        let toDelete = 0;

        files.forEach(file => {
          const filepath = path.join(dir, file);
          const stats = fs.statSync(filepath);

          if (stats.mtimeMs < cutoffDate) {
            toDelete++;
          }
        });

        stats.categories[category] = {
          totalFiles: files.length,
          filesToDelete: toDelete,
          retentionValue,
          retentionUnit: category === 'logs' ? 'days' : 'hours'
        };

        stats.totalFiles += files.length;
        stats.filesToDelete += toDelete;
      } catch (error) {
        stats.categories[category] = { error: error.message };
      }
    });

    return stats;
  }
}

export default new FileStorage();
    / /   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = 
     / /   I M A G E   M A P P I N G S   P E R S I S T E N C E 
     / /   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = 
 
     a s y n c   s a v e I m a g e M a p p i n g s ( m a p p i n g s )   { 
         c o n s t   f i l e n a m e   =   " i m a g e - m a p p i n g s . j s o n " ; 
         c o n s t   f i l e p a t h   =   p a t h . j o i n ( t h i s . c a t e g o r i e s . i m a g e s ,   f i l e n a m e ) ; 
 
         c o n s t   r e c o r d   =   { 
             t i m e s t a m p :   n e w   D a t e ( ) . t o I S O S t r i n g ( ) , 
             m a p p i n g s , 
             v e r s i o n :   " 1 . 0 " 
         } ; 
 
         t r y   { 
             f s . w r i t e F i l e S y n c ( f i l e p a t h ,   J S O N . s t r i n g i f y ( r e c o r d ,   n u l l ,   2 ) ,   " u t f 8 " ) ; 
             l o g g e r . s u c c e s s ( " S A V E " ,   ` I m a g e   m a p p i n g s   s a v e d :   $ { O b j e c t . k e y s ( m a p p i n g s ) . l e n g t h }   m a p p i n g s ` ,   {   f i l e p a t h   } ) ; 
             r e t u r n   {   s u c c e s s :   t r u e ,   f i l e p a t h   } ; 
         }   c a t c h   ( e r r o r )   { 
             l o g g e r . e r r o r ( " S A V E " ,   ` F a i l e d   t o   s a v e   i m a g e   m a p p i n g s ` ,   e r r o r ) ; 
             r e t u r n   {   s u c c e s s :   f a l s e ,   e r r o r :   e r r o r . m e s s a g e   } ; 
         } 
     } 
 
     a s y n c   l o a d I m a g e M a p p i n g s ( )   { 
         c o n s t   f i l e n a m e   =   " i m a g e - m a p p i n g s . j s o n " ; 
         c o n s t   f i l e p a t h   =   p a t h . j o i n ( t h i s . c a t e g o r i e s . i m a g e s ,   f i l e n a m e ) ; 
 
         t r y   { 
             i f   ( ! f s . e x i s t s S y n c ( f i l e p a t h ) )   { 
                 r e t u r n   {   f o u n d :   f a l s e ,   m a p p i n g s :   { }   } ; 
             } 
 
             c o n s t   d a t a   =   J S O N . p a r s e ( f s . r e a d F i l e S y n c ( f i l e p a t h ,   " u t f 8 " ) ) ; 
             l o g g e r . i n f o ( " R E A D " ,   ` I m a g e   m a p p i n g s   l o a d e d :   $ { O b j e c t . k e y s ( d a t a . m a p p i n g s   | |   { } ) . l e n g t h }   m a p p i n g s ` ) ; 
             r e t u r n   {   f o u n d :   t r u e ,   m a p p i n g s :   d a t a . m a p p i n g s   | |   { }   } ; 
         }   c a t c h   ( e r r o r )   { 
             l o g g e r . e r r o r ( " R E A D " ,   ` F a i l e d   t o   l o a d   i m a g e   m a p p i n g s ` ,   e r r o r ) ; 
             r e t u r n   {   f o u n d :   f a l s e ,   m a p p i n g s :   { } ,   e r r o r :   e r r o r . m e s s a g e   } ; 
         } 
     }  
 