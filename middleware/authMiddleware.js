const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
	const authHeader = req.headers["authorization"];
	const token = authHeader && authHeader.split(" ")[1];

	if (token == null) {
		return res
			.status(401)
			.json({ message: "Akses ditolak. Token tidak ditemukan." });
	}

	jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
		if (err) {
			return res.status(403).json({ message: "Token tidak valid." });
		}
		req.user = user;
		next();
	});
};

const isAdmin = (req, res, next) => {
	if (req.user.role !== "admin") {
		return res
			.status(403)
			.json({ message: "Akses ditolak. Hanya untuk admin." });
	}
	next();
};

module.exports = { authenticateToken, isAdmin };
