// Simple user model helper (no ORM)
// Roles: "elderly" or "family"

function createUser({ id, fullName, email, password, role, phone, relation }) {
  return {
    id,
    fullName,
    email,
    password, // NOTE: plain text for demo only; do NOT use in production
    role,
    phone: phone || '',
    relation: relation || ''
  };
}

module.exports = {
  createUser
};

