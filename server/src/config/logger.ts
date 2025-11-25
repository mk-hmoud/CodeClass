import { config } from 'dotenv';
config({ path: `${__dirname}/../../../.env` });
import pino from 'pino';

const isDevelopment = process.env.NODE_ENV === 'development';
console.log('Current ENV:', process.env.NODE_ENV || '(not set)');
/**
 * PINO CONFIGURATION
 */
const logger = pino(
  {
    level: isDevelopment ? 'debug' : 'info',
    
    formatters: {
      level: (label) => {
        return { level: label.toUpperCase() };
      },
    },

    ...(isDevelopment && {
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true, // Colorizes the level and message
          translateTime: 'SYS:standard', // YYYY-mm-dd HH:MM:ss
          ignore: 'pid,hostname', // Removes these fields
          messageFormat: '{msg}', // Ensure message is clear
          singleLine: false, // Set to true if you want compact logs
        },
      },
    }),
  },
  !isDevelopment ? pino.destination({ dest: 1, sync: false }) : undefined
);

export default logger;