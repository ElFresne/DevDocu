const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');
const { encryptPassword } = require('../utils/helpers');

router.get('/', verifyToken, async (req, res) => {
  const users = await User.find();
  res.json(users);
});

router.get('/:id', verifyToken, async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

router.post('/', async (req, res) => {
  const { name, email, password } = req.body;
  const hashedPassword = encryptPassword(password);
  const user = new User({ name, email, password: hashedPassword });
  await user.save();
  res.status(201).json(user);
});

router.put('/:id', verifyToken, async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

router.delete('/:id', verifyToken, async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.status(204).send();
});

module.exports = router;
