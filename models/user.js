// Require all the stuff
var Sequelize = require('sequelize');
var passportLocalSequelize = require('passport-local-sequelize');

// Setup sequelize db connection
var conString = process.env.DATABASE_URL;
var mydb = new Sequelize(conString);

// A helper to define the User model with username, password fields
var User = passportLocalSequelize.defineUser(mydb, {
    favoriteColor: Sequelize.STRING
});
User.sync();

module.exports = User;