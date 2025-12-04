import * as sdk from 'node-appwrite';
import { createLogger } from '../utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

const logger = createLogger('AppwriteService');

class AppwriteService {
    constructor() {
        this.config = {
            endpoint: process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
            projectId: process.env.APPWRITE_PROJECT_ID,
            apiKey: process.env.APPWRITE_API_KEY,
            functionId: process.env.APPWRITE_FUNCTION_ID_PRS || '68ffcb25003df2ce3663', // Default to PRS function ID
        };

        this._validateConfig();
        this._initializeClient();
    }

    _validateConfig() {
        if (!this.config.projectId || !this.config.apiKey) {
            logger.warn('INIT', 'Appwrite credentials missing. Service will be disabled.');
            this.enabled = false;
        } else {
            this.enabled = true;
        }
    }

    _initializeClient() {
        if (!this.enabled) return;

        try {
            this.client = new sdk.Client()
                .setEndpoint(this.config.endpoint)
                .setProject(this.config.projectId)
                .setKey(this.config.apiKey);

            this.functions = new sdk.Functions(this.client);
            logger.info('INIT', 'Appwrite SDK initialized');
        } catch (error) {
            logger.error('INIT', 'Failed to initialize Appwrite SDK', error);
            this.enabled = false;
        }
    }

    /**
     * Execute an Appwrite Cloud Function
     * @param {string} functionId - The ID of the function to execute (optional, defaults to config)
     * @param {Object} payload - The data to send to the function
     * @param {string} requestId - Request ID for logging
     * @returns {Promise<Object>} - The parsed JSON response from the function
     */
    async executeFunction(payload, requestId = 'default', functionId = null) {
        if (!this.enabled) {
            throw new Error('Appwrite service is not configured');
        }

        const targetFunctionId = functionId || this.config.functionId;
        const startTime = Date.now();

        try {
            logger.debug(requestId, 'Executing Appwrite function', { functionId: targetFunctionId });

            const execution = await this.functions.createExecution(
                targetFunctionId,
                JSON.stringify(payload),
                false, // async (false = synchronous)
                '/',   // path
                'POST', // method
                {}     // headers
            );

            const duration = Date.now() - startTime;

            if (execution.status === 'failed') {
                logger.error(requestId, 'Appwrite execution failed', {
                    stderr: execution.stderr,
                    duration
                });
                throw new Error(`Appwrite function execution failed: ${execution.stderr}`);
            }

            let responseData;
            try {
                responseData = JSON.parse(execution.responseBody);

                // DEBUG LOGGING
                let logData = { ...responseData };
                if (logData.data) {
                    logData.data = { ...logData.data };
                    if (logData.data.attendanceTable) logData.data.attendanceTable = `[HIDDEN - ${logData.data.attendanceTable.length} items]`;
                    if (logData.data.debatesTable) logData.data.debatesTable = `[HIDDEN - ${logData.data.debatesTable.length} items]`;
                    if (logData.data.questionsTable) logData.data.questionsTable = `[HIDDEN - ${logData.data.questionsTable.length} items]`;
                }

                console.log('\n======================================================================');
                console.log(`🚀 APPWRITE RESPONSE [${requestId}]`);
                console.log('======================================================================');
                console.log(JSON.stringify(logData, null, 2));
                console.log('======================================================================\n');

            } catch (parseError) {
                logger.error(requestId, 'Failed to parse response body', {
                    body: execution.responseBody,
                    error: parseError.message
                });

                // Log raw body on error
                console.log('\n======================================================================');
                console.log(`❌ APPWRITE RESPONSE ERROR [${requestId}]`);
                console.log('======================================================================');
                console.log(execution.responseBody);
                console.log('======================================================================\n');

                throw new Error('Invalid JSON response from Appwrite function');
            }

            logger.success(requestId, `Appwrite execution completed in ${duration}ms`, {
                status: execution.status,
                success: responseData.success
            });

            return {
                success: true,
                data: responseData,
                execution: {
                    id: execution.$id,
                    status: execution.status,
                    duration: execution.duration,
                },
                timing: {
                    total: duration
                }
            };

        } catch (error) {
            const duration = Date.now() - startTime;
            logger.error(requestId, 'Appwrite execution error', { error: error.message, duration });
            throw error;
        }
    }

    getStats() {
        return {
            enabled: this.enabled,
            config: {
                endpoint: this.config.endpoint,
                projectId: this.config.projectId ? '***' : 'missing',
                functionId: this.config.functionId
            }
        };
    }
}

// Export singleton
export default new AppwriteService();
