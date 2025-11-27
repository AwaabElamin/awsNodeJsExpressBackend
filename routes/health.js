const express = require('express');
const router = express.Router();
const DB = require('../lib/db');

router.get('/', (req, res) => {
  const defaultState = (typeof require('mongoose').connection !== 'undefined') ? require('mongoose').connection.readyState : 0;
  const connections = {
    default: defaultState,
    users: DB.getConnection('users') ? DB.getConnection('users').readyState : null,
    delivery: DB.getConnection('delivery') ? DB.getConnection('delivery').readyState : null,
    resume: DB.getConnection('resume') ? DB.getConnection('resume').readyState : null,
    carshop: DB.getConnection('carshop') ? DB.getConnection('carshop').readyState : null,
  };
  res.json({ status: 'ok', connections });
});

module.exports = router;
