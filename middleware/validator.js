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
  query('constituency').optional().trim().escape().isLength({ min: 0, max: 100 }),
  query('party').optional().trim().escape().isLength({ min: 0, max: 100 }),
  query('meow').optional().isNumeric().withMessage('meow must be a number'),
  query('bhaw').optional().trim().escape().isLength({ min: 0, max: 50 }),
  validate
];

export const candidateQueryValidator = [
  query('name').optional().trim().isLength({ min: 0, max: 100 }).escape(),
  query('constituency').optional().trim().escape(),
  query('party').optional().trim().escape(),
  query('meow').optional().isNumeric(),
  query('bhaw').optional().trim().escape(),
  (req, res, next) => {
    if (!req.query.meow && !req.query.bhaw && (!req.query.name || req.query.name.trim() === '')) {
      return res.status(400).json({
        error: 'Validation failed',
        details: [{
          type: 'field',
          value: req.query.name || '',
          msg: 'Name is required when meow and bhaw are not provided',
          path: 'name',
          location: 'query'
        }]
      });
    }
    next();
  },
  validate
];
