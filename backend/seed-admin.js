require('dotenv').config()
const mongoose = require('mongoose')
const User = require('./src/models/User')

mongoose.connect(process.env.MONGO_URI).then(async () => {
  await User.create({
    name: 'Admin',
    email: 'admin@leadflow.app',
    password: 'admin123',
    role: 'admin'
  })
  console.log('Admin created successfully!')
  process.exit()
}).catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
