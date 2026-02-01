const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createUser } = require('../models/user');

const dataFilePath = path.join(__dirname, 'users.json');

function readUsers() {
  try {
    const raw = fs.readFileSync(dataFilePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading users.json, returning empty array:', err.message);
    return [];
  }
}

function writeUsers(users) {
  fs.writeFileSync(dataFilePath, JSON.stringify(users, null, 2), 'utf8');
}

function normalizePhone(phone) {
  if (typeof phone !== 'string') return '';
  return phone.replace(/\D/g, '');
}

function findById(userId) {
  const users = readUsers();
  return users.find((u) => u.id === userId) || null;
}

function findByEmail(email) {
  const users = readUsers();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

function updatePassword(userId, newPassword) {
  const users = readUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx < 0) return false;
  users[idx] = { ...users[idx], password: newPassword };
  writeUsers(users);
  return true;
}

function findByPhone(phone) {
  const users = readUsers();
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  return users.find((u) => normalizePhone(u.phone || '') === normalized) || null;
}

function createNewUser({ fullName, email, password, role, phone, relation }) {
  const users = readUsers();
  const id = crypto.randomUUID();
  const user = createUser({ id, fullName, email, password, role, phone, relation });
  users.push(user);
  writeUsers(users);
  return user;
}

module.exports = {
  readUsers,
  writeUsers,
  findById,
  findByEmail,
  findByPhone,
  normalizePhone,
  createNewUser,
  updatePassword
};