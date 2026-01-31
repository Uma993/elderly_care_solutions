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

function findByEmail(email) {
  const users = readUsers();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
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
  findByEmail,
  findByPhone,
  normalizePhone,
  createNewUser
};