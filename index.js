require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const absensiRoutes = require("./routes/absensiRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
	cors({
		origin: "*",
		methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
		preflightContinue: false,
		optionsSuccessStatus: 204,
		allowedHeaders: "Content-Type, Authorization",
	})
);
app.use(express.json());

app.get("/", (req, res) => {
	res.send("API Absensi Klinik Berjalan!");
});

app.options('*', cors());
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/absensi", absensiRoutes);

app.use((err, req, res, next) => {
	res.header("Access-Control-Allow-Origin", "*");
	next(err);
});

// app.listen(PORT, () => {
// 	console.log(`Server berjalan di http://localhost:${PORT}`);
// });

module.exports = app;
