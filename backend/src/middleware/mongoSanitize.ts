import mongoSanitize from 'mongo-sanitize';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to sanitize request body, query, and params
 * to prevent NoSQL injection attacks.
 *
 * mongo-sanitize removes keys that contain characters
 * like $ and . which are special in MongoDB.
 */
export function mongoSanitizeMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (req.body) {
    req.body = mongoSanitize(req.body);
  }
  if (req.query) {
    req.query = mongoSanitize(req.query);
  }
  if (req.params) {
    req.params = mongoSanitize(req.params);
  }
  next();
}

export default mongoSanitizeMiddleware;
