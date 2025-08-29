const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

// Create database file
const dbPath = path.join(__dirname, 'golf_app.db');
const db = new sqlite3.Database(dbPath);

// Initialize database tables
db.serialize(() => {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT,
      handicap INTEGER DEFAULT 20,
      average_score REAL DEFAULT 100,
      drive_distance REAL DEFAULT 200,
      total_rounds INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Swing history table
  db.run(`
    CREATE TABLE IF NOT EXISTS swing_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      score REAL NOT NULL,
      posture_score REAL,
      balance_score REAL,
      angle_score REAL,
      feedback TEXT,
      image_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // Challenges table
  db.run(`
    CREATE TABLE IF NOT EXISTS challenges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      type TEXT,
      status TEXT DEFAULT 'active',
      start_date DATETIME,
      end_date DATETIME,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users (id)
    )
  `);

  // Challenge participants
  db.run(`
    CREATE TABLE IF NOT EXISTS challenge_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      challenge_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      score REAL DEFAULT 0,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (challenge_id) REFERENCES challenges (id),
      FOREIGN KEY (user_id) REFERENCES users (id),
      UNIQUE(challenge_id, user_id)
    )
  `);

  // Friends table
  db.run(`
    CREATE TABLE IF NOT EXISTS friends (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      friend_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (friend_id) REFERENCES users (id),
      UNIQUE(user_id, friend_id)
    )
  `);

  // Goals table
  db.run(`
    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      target_value REAL,
      current_value REAL DEFAULT 0,
      unit TEXT,
      deadline DATE,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // Training plans table
  db.run(`
    CREATE TABLE IF NOT EXISTS training_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      level TEXT,
      duration_weeks INTEGER,
      exercises TEXT,
      progress REAL DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // Leaderboard table
  db.run(`
    CREATE TABLE IF NOT EXISTS leaderboard (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      global_score REAL DEFAULT 0,
      monthly_score REAL DEFAULT 0,
      weekly_score REAL DEFAULT 0,
      rank INTEGER,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // Create default test user
  const testPassword = bcrypt.hashSync('test123', 10);
  db.run(
    `INSERT OR IGNORE INTO users (email, username, password, name, handicap, average_score, drive_distance, total_rounds) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['test@test.com', 'testuser', testPassword, '테스트 유저', 15, 85, 230, 42],
    (err) => {
      if (err) {
        console.error('Error creating test user:', err);
      } else {
        console.log('✅ Test user created or already exists');
      }
    }
  );
});

// Database helper functions
const dbHelpers = {
  // User functions
  createUser: (email, username, password, name) => {
    return new Promise((resolve, reject) => {
      const hashedPassword = bcrypt.hashSync(password, 10);
      db.run(
        `INSERT INTO users (email, username, password, name) VALUES (?, ?, ?, ?)`,
        [email, username, hashedPassword, name],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, email, username, name });
        }
      );
    });
  },

  getUserByEmail: (email) => {
    return new Promise((resolve, reject) => {
      db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  getUserById: (id) => {
    return new Promise((resolve, reject) => {
      db.get(`SELECT * FROM users WHERE id = ?`, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  updateUser: (id, updates) => {
    return new Promise((resolve, reject) => {
      const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updates);
      values.push(id);
      
      db.run(
        `UPDATE users SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        values,
        function(err) {
          if (err) reject(err);
          else resolve({ id, ...updates });
        }
      );
    });
  },

  // Swing history functions
  addSwingHistory: (userId, swingData) => {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO swing_history (user_id, score, posture_score, balance_score, angle_score, feedback, image_data) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, swingData.score, swingData.posture_score, swingData.balance_score, 
         swingData.angle_score, JSON.stringify(swingData.feedback), swingData.image_data],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, user_id: userId, ...swingData });
        }
      );
    });
  },

  getSwingHistory: (userId, limit = 50) => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM swing_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
        [userId, limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  // Challenge functions
  getChallenges: (status = 'active') => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT c.*, COUNT(cp.user_id) as participant_count 
         FROM challenges c 
         LEFT JOIN challenge_participants cp ON c.id = cp.challenge_id 
         WHERE c.status = ? 
         GROUP BY c.id 
         ORDER BY c.created_at DESC`,
        [status],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  joinChallenge: (challengeId, userId) => {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT OR IGNORE INTO challenge_participants (challenge_id, user_id) VALUES (?, ?)`,
        [challengeId, userId],
        function(err) {
          if (err) reject(err);
          else resolve({ success: true });
        }
      );
    });
  },

  // Leaderboard functions
  getLeaderboard: (type = 'global') => {
    return new Promise((resolve, reject) => {
      const scoreColumn = type === 'weekly' ? 'weekly_score' : 
                         type === 'monthly' ? 'monthly_score' : 'global_score';
      
      db.all(
        `SELECT u.id, u.username, u.name, l.${scoreColumn} as score, l.rank 
         FROM leaderboard l 
         JOIN users u ON l.user_id = u.id 
         ORDER BY l.${scoreColumn} DESC 
         LIMIT 100`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  updateLeaderboard: (userId, scores) => {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT OR REPLACE INTO leaderboard (user_id, global_score, monthly_score, weekly_score) 
         VALUES (?, ?, ?, ?)`,
        [userId, scores.global || 0, scores.monthly || 0, scores.weekly || 0],
        function(err) {
          if (err) reject(err);
          else resolve({ success: true });
        }
      );
    });
  },

  // Friend functions
  addFriend: (userId, friendId) => {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT OR IGNORE INTO friends (user_id, friend_id, status) VALUES (?, ?, 'accepted')`,
        [userId, friendId],
        function(err) {
          if (err) reject(err);
          else {
            // Add reverse friendship
            db.run(
              `INSERT OR IGNORE INTO friends (user_id, friend_id, status) VALUES (?, ?, 'accepted')`,
              [friendId, userId],
              (err2) => {
                if (err2) reject(err2);
                else resolve({ success: true });
              }
            );
          }
        }
      );
    });
  },

  getFriends: (userId) => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT u.* FROM friends f 
         JOIN users u ON f.friend_id = u.id 
         WHERE f.user_id = ? AND f.status = 'accepted'`,
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  // Goal functions
  createGoal: (userId, goalData) => {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO goals (user_id, title, description, target_value, unit, deadline) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, goalData.title, goalData.description, goalData.target_value, 
         goalData.unit, goalData.deadline],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, user_id: userId, ...goalData });
        }
      );
    });
  },

  getGoals: (userId) => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC`,
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  updateGoalProgress: (goalId, currentValue) => {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE goals SET current_value = ? WHERE id = ?`,
        [currentValue, goalId],
        function(err) {
          if (err) reject(err);
          else resolve({ success: true });
        }
      );
    });
  }
};

module.exports = { db, ...dbHelpers };