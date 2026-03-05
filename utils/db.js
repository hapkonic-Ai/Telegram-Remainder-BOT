const mongoose = require('mongoose');

// Caching the Mongoose connection in a serverless environment
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(process.env.MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

// User Schema
const UserSchema = new mongoose.Schema({
  chatId: { type: Number, required: true, unique: true },
  timezone: { type: String, default: 'UTC' },
  createdAt: { type: Date, default: Date.now },
});

// Reminder Schema
const ReminderSchema = new mongoose.Schema({
  chatId: { type: Number, required: true },
  message: { type: String, required: true },
  dueTime: { type: Date, required: true },
  isSent: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

// Create Indexes
ReminderSchema.index({ dueTime: 1, isSent: 1 });

// Initialize Models (avoiding OverwriteModelError in hot-reloading/serverless)
const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Reminder = mongoose.models.Reminder || mongoose.model('Reminder', ReminderSchema);

module.exports = { connectToDatabase, User, Reminder };
