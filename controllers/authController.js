const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const login = async (req, res) => {
	const { username, password, device_id } = req.body;

	if (!username || !password) {
		return res
			.status(400)
			.json({ message: "Username dan password harus diisi." });
	}

	try {
		const [users] = await db.query("SELECT * FROM users WHERE username = ?", [
			username,
		]);
		if (users.length === 0) {
			return res.status(401).json({ message: "Username atau password salah." });
		}

		const user = users[0];
		const isPasswordMatch = await bcrypt.compare(password, user.password);
		if (!isPasswordMatch) {
			return res.status(401).json({ message: "Username atau password salah." });
		}

		if (user.role === "karyawan") {
			if (!device_id) {
				return res
					.status(400)
					.json({ message: "Device ID dibutuhkan untuk login karyawan." });
			}
			if (user.device_id && user.device_id !== device_id) {
				return res
					.status(403)
					.json({
						message:
							"Login gagal. Silakan gunakan perangkat yang telah terdaftar.",
					});
			}
			if (!user.device_id) {
				await db.query("UPDATE users SET device_id = ? WHERE id = ?", [
					device_id,
					user.id,
				]);
			}
		}

		const payload = {
			userId: user.id,
			role: user.role,
			namaLengkap: user.nama_lengkap,
		};
		const token = jwt.sign(payload, process.env.JWT_SECRET, {
			expiresIn: "1d",
		});

		res.json({
			message: "Login berhasil!",
			token,
			user: payload,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Terjadi kesalahan pada server." });
	}
};

module.exports = { login };
