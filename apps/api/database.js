// Simple in-memory database for development/testing
class Database {
  constructor() {
    this.users = new Map();
    this.swingHistory = new Map();
    this.challenges = [];
    this.leaderboard = [];
    this.friends = new Map();
    this.goals = new Map();
    this.trainingPlans = new Map();
    this.chatRooms = new Map();
    this.messages = new Map();
    
    // Initialize with test user
    this.initTestData();
  }

  initTestData() {
    // Create test user
    const testUser = {
      id: 1,
      email: 'test@test.com',
      password: '$2a$10$YourHashedPasswordHere', // bcrypt hash of 'test123'
      username: 'testuser',
      full_name: '테스트 유저',
      handicap: 15,
      average_score: 85,
      best_score: 78,
      total_rounds: 50,
      created_at: new Date().toISOString()
    };
    
    this.users.set(testUser.email, testUser);
    this.users.set(testUser.id, testUser);
    
    // Initialize empty collections for test user
    this.swingHistory.set(testUser.id, []);
    this.friends.set(testUser.id, []);
    this.goals.set(testUser.id, []);
    this.trainingPlans.set(testUser.id, []);
  }

  // User methods
  createUser(userData) {
    const id = this.users.size + 1;
    const user = {
      id,
      ...userData,
      created_at: new Date().toISOString()
    };
    this.users.set(user.email, user);
    this.users.set(user.id, user);
    
    // Initialize empty collections
    this.swingHistory.set(user.id, []);
    this.friends.set(user.id, []);
    this.goals.set(user.id, []);
    this.trainingPlans.set(user.id, []);
    
    return user;
  }

  getUserByEmail(email) {
    return this.users.get(email);
  }

  getUserById(id) {
    return this.users.get(parseInt(id));
  }

  updateUser(id, updates) {
    const user = this.getUserById(id);
    if (!user) return null;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(user.email, updatedUser);
    this.users.set(user.id, updatedUser);
    return updatedUser;
  }

  // Swing history methods
  addSwingData(userId, swingData) {
    const history = this.swingHistory.get(userId) || [];
    const newSwing = {
      id: Date.now(),
      user_id: userId,
      ...swingData,
      created_at: new Date().toISOString()
    };
    history.push(newSwing);
    this.swingHistory.set(userId, history);
    return newSwing;
  }

  getSwingHistory(userId) {
    return this.swingHistory.get(userId) || [];
  }

  // Challenge methods
  createChallenge(challengeData) {
    const challenge = {
      id: this.challenges.length + 1,
      ...challengeData,
      participants: [],
      created_at: new Date().toISOString()
    };
    this.challenges.push(challenge);
    return challenge;
  }

  getChallenges() {
    return this.challenges;
  }

  joinChallenge(challengeId, userId) {
    const challenge = this.challenges.find(c => c.id === challengeId);
    if (challenge && !challenge.participants.includes(userId)) {
      challenge.participants.push(userId);
    }
    return challenge;
  }

  // Leaderboard methods
  updateLeaderboard(userId, score) {
    const entry = this.leaderboard.find(e => e.user_id === userId);
    if (entry) {
      entry.score = score;
      entry.updated_at = new Date().toISOString();
    } else {
      this.leaderboard.push({
        user_id: userId,
        score,
        rank: 0,
        created_at: new Date().toISOString()
      });
    }
    
    // Sort and update ranks
    this.leaderboard.sort((a, b) => b.score - a.score);
    this.leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });
    
    return this.leaderboard;
  }

  getLeaderboard() {
    return this.leaderboard;
  }

  // Friends methods
  addFriend(userId, friendId) {
    const userFriends = this.friends.get(userId) || [];
    if (!userFriends.includes(friendId)) {
      userFriends.push(friendId);
      this.friends.set(userId, userFriends);
    }
    
    // Add reverse friendship
    const friendFriends = this.friends.get(friendId) || [];
    if (!friendFriends.includes(userId)) {
      friendFriends.push(userId);
      this.friends.set(friendId, friendFriends);
    }
    
    return userFriends;
  }

  getFriends(userId) {
    return this.friends.get(userId) || [];
  }

  // Goals methods
  createGoal(userId, goalData) {
    const goals = this.goals.get(userId) || [];
    const goal = {
      id: Date.now(),
      user_id: userId,
      ...goalData,
      progress: 0,
      status: 'active',
      created_at: new Date().toISOString()
    };
    goals.push(goal);
    this.goals.set(userId, goals);
    return goal;
  }

  getGoals(userId) {
    return this.goals.get(userId) || [];
  }

  updateGoal(userId, goalId, updates) {
    const goals = this.goals.get(userId) || [];
    const goalIndex = goals.findIndex(g => g.id === goalId);
    if (goalIndex !== -1) {
      goals[goalIndex] = { ...goals[goalIndex], ...updates };
      this.goals.set(userId, goals);
      return goals[goalIndex];
    }
    return null;
  }

  // Training plan methods
  createTrainingPlan(userId, planData) {
    const plans = this.trainingPlans.get(userId) || [];
    const plan = {
      id: Date.now(),
      user_id: userId,
      ...planData,
      status: 'active',
      created_at: new Date().toISOString()
    };
    plans.push(plan);
    this.trainingPlans.set(userId, plans);
    return plan;
  }

  getTrainingPlans(userId) {
    return this.trainingPlans.get(userId) || [];
  }

  // Chat methods
  createChatRoom(roomData) {
    const room = {
      id: Date.now().toString(),
      ...roomData,
      created_at: new Date().toISOString()
    };
    this.chatRooms.set(room.id, room);
    return room;
  }

  getChatRooms(userId) {
    const rooms = [];
    this.chatRooms.forEach(room => {
      if (room.participants && room.participants.includes(userId)) {
        rooms.push(room);
      }
    });
    return rooms;
  }

  addMessage(roomId, messageData) {
    const messages = this.messages.get(roomId) || [];
    const message = {
      id: Date.now(),
      room_id: roomId,
      ...messageData,
      created_at: new Date().toISOString()
    };
    messages.push(message);
    this.messages.set(roomId, messages);
    return message;
  }

  getMessages(roomId) {
    return this.messages.get(roomId) || [];
  }
}

// Singleton instance
const db = new Database();

module.exports = db;