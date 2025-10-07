require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const absensiRoutes = require("./routes/absensiRoutes");

const app = express();
const PORT = process.env.PORT || 4000;

const whitelist = [
	"https://<nama-proyek-anda>.vercel.app",
	"http://localhost:5173",
];

const corsOptions = {
	origin: function (origin, callback) {
		if (whitelist.indexOf(origin) !== -1 || !origin) {
			callback(null, true);
		} else {
			callback(new Error("Not allowed by CORS"));
		}
	},
	methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
	credentials: true,
};

app.use(cors(corsOptions));
// =================================================================

app.use(express.json());

app.get("/", (req, res) => {
	res.send("API Absensi Klinik Berjalan!");
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/absensi", absensiRoutes);

app.listen(PORT, "0.0.0.0", () => {
	console.log(`Server berjalan di http://localhost:${PORT}`);
});
