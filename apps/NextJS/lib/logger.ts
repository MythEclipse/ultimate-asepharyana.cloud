import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

// Membuat format dasar yang bisa digunakan bersama
const baseFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }), // Menampilkan stack trace untuk error
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return `${timestamp} [${level}]: ${stack || message}`;
  })
);

const transports = [];

if (process.env.NODE_ENV !== 'production') {
  // Transport untuk Console (development)
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(), // Warna hanya untuk console
        baseFormat
      ),
      handleExceptions: true,
    })
  );
}

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: baseFormat,
  transports,
  exceptionHandlers: [
    new DailyRotateFile({
      filename: 'logs/exceptions-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
    }),
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      filename: 'logs/rejections-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
    }),
  ],
  exitOnError: false, // Biarkan winston menangani penutupan
});

// Handle error pada transport file
logger.transports.forEach((transport) => {
  if (transport instanceof winston.transports.File) {
    transport.on('error', (error) => {
      console.error('Error dalam transport file:', error);
    });
  }
});

export default logger;
