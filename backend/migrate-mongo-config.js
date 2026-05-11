module.exports = {
  mongodb: {
    url: process.env.MONGODB_URI || 'mongodb://localhost:27017/hirely',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },

  // The migrations directory, no trailing slash!
  migrationsDir: 'migrations',

  // The MongoDB collection where the applied migrations are tracked
  changelogCollectionName: 'changelog',

  // Lock the changelog collection to prevent concurrent migration runs
  lockCollectionName: 'changelog_lock',

  // How long (in ms) to wait for a lock before timing out
  lockTimeoutMS: 60000,

  // Continue on error in up/down functions (dont crash the migration run)
  force: false,
};