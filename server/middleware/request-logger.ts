import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";

// Define the schema for request logs
const requestLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  method: String,
  path: String,
  ip: String,
  userAgent: String,
  statusCode: Number,
  responseTime: Number,
  userId: { type: Number, required: false },
  error: { type: String, required: false }
});

// Create the model
const RequestLog = mongoose.model('RequestLog', requestLogSchema);

// Request logging middleware
export const requestLogger = async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Store the original end function
  const originalEnd = res.end;
  
  // Override the end function to capture response data
  res.end = function (chunk?: any, encoding?: any, callback?: any): Response {
    const responseTime = Date.now() - startTime;
    
    // Create log entry
    const logEntry = new RequestLog({
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      statusCode: res.statusCode,
      responseTime,
      userId: (req as any).user?.id // If user is authenticated
    });

    // Save log asynchronously
    logEntry.save().catch(err => {
      console.error('Error saving request log:', err);
    });

    // Call the original end function
    return originalEnd.call(this, chunk, encoding, callback);
  };

  // Handle errors
  res.on('error', (error) => {
    const logEntry = new RequestLog({
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      statusCode: res.statusCode,
      responseTime: Date.now() - startTime,
      userId: (req as any).user?.id,
      error: error.message
    });

    logEntry.save().catch(err => {
      console.error('Error saving error log:', err);
    });
  });

  next();
};
