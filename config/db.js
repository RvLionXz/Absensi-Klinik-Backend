const mysql = require("mysql2");
const fs = require("fs");
require("dotenv").config();

const dbConfig = {
	host: process.env.DB_HOST,
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME,
	port: process.env.DB_PORT,
	ssl: {
		ca: fs.readFileSync(__dirname + "/ca.pem"),
	},
	timezone: "+00:00",
	waitForConnections: true,
	connectionLimit: 10,
	queueLimit: 0,
};

const pool = mysql.createPool(dbConfig);

module.exports = pool.promise();
