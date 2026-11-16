export const DEFAULT_BLOCKED_PHRASES = [
  // Coercive or unapproved billing / legal threats
  'legal proceedings',
  'court order',
  'police',
  'credit bureau reporting',
  'credit score damage',
  'immediate service termination',
  'late fee penalty of',
  'warrant',
  'debt collection agency',
  'law enforcement',
  'property seizure',
  'repossession',
  'prosecution',

  // False scarcity / Manipulative urgency
  'only 1 left',
  'expires in 5 minutes',
  'act now or lose account',
  'guaranteed win',
  'risk-free money',
  'unlimited free money',
  'foolproof',
  'secret hack',

  // Abusive or shaming language
  'you will regret',
  'disgrace',
  'unacceptable failure',
  'humiliating',
  'negligent customer',

  // Internal system leakage tokens
  'objectid(',
  'passwordhash',
  'eyjhbgcioi',
  'bearer eyj',
  'process.env',
  'sk-ant-',
  'sk-proj-',
  'mongodb://',
  'redis://',
  'internal_error'
];
