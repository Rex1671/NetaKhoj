import { query, validationResult } from 'express-validator';

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors.array() 
    });
  }
  next();
};

export const memberQueryValidator = [
  query('name').trim().notEmpty().isLength({ min: 2, max: 100 }).escape(),
  query('type').isIn(['MP', 'MLA']),
  validate
];

export const candidateQueryValidator = [
  query('name').trim().notEmpty().isLength({ min: 2, max: 100 }).escape(),
  query('constituency').trim().notEmpty().escape(),
  query('party').trim().notEmpty().escape(),
  validate
];
