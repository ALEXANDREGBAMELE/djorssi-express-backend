// test-model.js
const sequelize = require('./config/database');
const User = require('./src/models/user.model');

console.log('User:', User);
console.log('User type:', typeof User);
console.log('User.findOne:', typeof User.findOne);

if (User && typeof User.findOne === 'function') {
  console.log('✅ User model is loaded correctly');
} else {
  console.log('❌ User model is NOT loaded correctly');
}