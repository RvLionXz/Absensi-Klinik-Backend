const db = require("../config/db");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const getAllUsers = async (req, res) => {
	try {
		const [users] = await db.query(
			"SELECT id, nama_lengkap, username, role, jabatan, device_id, created_at FROM users"
		);
		res.json(users);
	} catch (error) {
		console.error("Error fetching users:", error);
		res.status(500).json({ message: "Server Error" });
	}
};

const createUser = async (req, res) => {
	const { nama_lengkap, username, password, jabatan } = req.body;

	if (!nama_lengkap || !username || !password) {
		return res
			.status(400)
			.json({
				message: "Nama lengkap, username, dan password tidak boleh kosong.",
			});
	}

	try {
		const hashedPassword = await bcrypt.hash(password, 10);
		const role = "karyawan";

		const [result] = await db.query(
			"INSERT INTO users (nama_lengkap, username, password, role, jabatan) VALUES (?, ?, ?, ?, ?)",
			[nama_lengkap, username, hashedPassword, role, jabatan || null]
		);

		res
			.status(201)
			.json({
				message: "Pegawai baru berhasil dibuat",
				userId: result.insertId,
			});
	} catch (error) {
		console.error("Error creating user:", error);
		if (error.code === "ER_DUP_ENTRY") {
			return res
				.status(409)
				.json({ message: `Username '${username}' sudah digunakan.` });
		}
		res.status(500).json({ message: "Server Error", error: error.message });
	}
};

const resetDevice = async (req, res) => {
	const { id } = req.params;
	try {
		const sql = "UPDATE users SET device_id = NULL WHERE id = ? AND role = ?";
		const params = [id, "karyawan"];
		const [result] = await db.query(sql, params);

		if (result.affectedRows === 0) {
			return res
				.status(404)
				.json({
					message: `User dengan ID ${id} tidak ditemukan atau bukan karyawan.`,
				});
		}

		res.json({
			message: `Device ID untuk user dengan ID ${id} berhasil di-reset.`,
		});
	} catch (error) {
		console.error("Error resetting device:", error);
		res.status(500).json({ message: "Server Error" });
	}
};

const deleteUser = async (req, res) => {
	const { id } = req.params;
	try {
		const sql = "DELETE FROM users WHERE id = ?";
		const params = [id];
		const [result] = await db.query(sql, params);

		if (result.affectedRows === 0) {
			return res
				.status(404)
				.json({ message: `User dengan ID ${id} tidak ditemukan.` });
		}

		res.json({ message: `User dengan ID ${id} berhasil dihapus.` });
	} catch (error) {
		console.error("Error deleting user:", error);
		res.status(500).json({ message: "Server Error" });
	}
};

const resetPassword = async (req, res) => {
	const { id } = req.params;
	const { newPassword } = req.body;

	if (!newPassword || newPassword.length < 6) {
		return res
			.status(400)
			.json({
				message: "Password baru tidak boleh kosong dan minimal 6 karakter.",
			});
	}

	try {
		const hashedPassword = await bcrypt.hash(newPassword, 10);

		const sql = "UPDATE users SET password = ? WHERE id = ?";
		const [result] = await db.query(sql, [hashedPassword, id]);

		if (result.affectedRows === 0) {
			return res
				.status(404)
				.json({ message: `User dengan ID ${id} tidak ditemukan.` });
		}

		res.json({
			message: `Password berhasil di-reset.`,
		});
	} catch (error) {
		console.error("Error resetting password:", error);
		res.status(500).json({ message: "Server Error" });
	}
};

module.exports = {
	getAllUsers,
	createUser,
	resetDevice,
	deleteUser,
	resetPassword,
};
