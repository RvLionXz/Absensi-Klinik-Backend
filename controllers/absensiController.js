const db = require("../config/db");

const getTodayUTCString = () => {
	return new Date().toISOString().slice(0, 10);
};

const rekamAbsensi = async (req, res) => {
	const { koordinat, waktuAbsen } = req.body;
	const userId = req.user.userId;

	if (
		!koordinat ||
		!koordinat.latitude ||
		!koordinat.longitude ||
		!waktuAbsen
	) {
		return res.status(400).json({ message: "Data absensi tidak lengkap." });
	}

	let connection;
	try {
		connection = await db.getConnection();
		await connection.beginTransaction();

		const checkSql =
			"SELECT DATE_FORMAT(last_absen_date, '%Y-%m-%d') AS last_absen_str FROM users WHERE id = ? FOR UPDATE";
		const [users] = await connection.query(checkSql, [userId]);

		const lastAbsenString = users[0].last_absen_str;
		const todayUTCString = getTodayUTCString();

		if (lastAbsenString === todayUTCString) {
			await connection.rollback();
			return res
				.status(409)
				.json({ message: "Anda sudah melakukan absensi hari ini." });
		}

		const waktuAbsenMySQL = waktuAbsen.slice(0, 19).replace("T", " ");

		const insertSql =
			"INSERT INTO absensi (user_id, latitude, longitude, waktu_absen) VALUES (?, ?, ?, ?)";
		const insertValues = [
			userId,
			koordinat.latitude,
			koordinat.longitude,
			waktuAbsenMySQL,
		];

		const [result] = await connection.query(insertSql, insertValues);

		const updateSql =
			"UPDATE users SET last_absen_date = UTC_DATE() WHERE id = ?";
		await connection.query(updateSql, [userId]);

		await connection.commit();

		const [newData] = await db.query("SELECT * FROM absensi WHERE id = ?", [
			result.insertId,
		]);
		res.status(201).json({
			message: "Absensi berhasil direkam!",
			data: newData[0],
		});
	} catch (error) {
		if (connection) await connection.rollback();
		console.error("Error saat merekam absensi dengan transaksi:", error);
		res.status(500).json({ message: "Terjadi kesalahan pada server." });
	} finally {
		if (connection) connection.release();
	}
};

const getAbsensiStatusToday = async (req, res) => {
	const { userId } = req.user;
	try {
		const sql =
			"SELECT DATE_FORMAT(last_absen_date, '%Y-%m-%d') AS last_absen_str FROM users WHERE id = ?";
		const [users] = await db.query(sql, [userId]);

		if (users.length === 0) {
			return res.status(404).json({ message: "User tidak ditemukan." });
		}

		const lastAbsenString = users[0].last_absen_str;
		const todayUTCString = getTodayUTCString();

		if (lastAbsenString === todayUTCString) {
			const [absensiData] = await db.query(
				"SELECT * FROM absensi WHERE user_id = ? AND DATE(waktu_absen) = UTC_DATE() ORDER BY id DESC LIMIT 1",
				[userId]
			);
			res.json({ status: "sudah_absen", data: absensiData[0] || null });
		} else {
			res.json({ status: "belum_absen" });
		}
	} catch (error) {
		console.error("Error checking attendance status with flag:", error);
		res.status(500).json({ message: "Server Error" });
	}
};

const getAllAbsensi = async (req, res) => {
	const { filter, date } = req.query;
	// JavaScript getTimezoneOffset() -> WIB (UTC+7) adalah -420.
	// Untuk mengubah UTC ke WIB, kita perlu MENAMBAH 420 menit.
	// Jadi, kita perlu membalik tanda offsetnya.
	const tzOffsetMinutes = -parseInt(req.query.tzOffset || "0", 10);

	let sql = `
    SELECT a.id, a.waktu_absen, a.latitude, a.longitude, u.nama_lengkap, u.jabatan 
    FROM absensi a 
    JOIN users u ON a.user_id = u.id 
  `;
	const params = [];

	// Waktu saat ini menurut timezone pengguna
	const userNow = `DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE)`;
	// Waktu absensi menurut timezone pengguna
	const userAbsenTime = `DATE_ADD(a.waktu_absen, INTERVAL ? MINUTE)`;

	switch (filter) {
		case "today":
			sql += `WHERE DATE(${userAbsenTime}) = DATE(${userNow})`;
			params.push(tzOffsetMinutes, tzOffsetMinutes);
			break;
		case "week":
			sql += `WHERE YEARWEEK(${userAbsenTime}, 1) = YEARWEEK(${userNow}, 1)`;
			params.push(tzOffsetMinutes, tzOffsetMinutes);
			break;
		case "month":
			sql += `WHERE YEAR(${userAbsenTime}) = YEAR(${userNow}) AND MONTH(${userAbsenTime}) = MONTH(${userNow})`;
			params.push(
				tzOffsetMinutes,
				tzOffsetMinutes,
				tzOffsetMinutes,
				tzOffsetMinutes
			);
			break;
		case "date":
			if (!date) {
				return res
					.status(400)
					.json({ message: "Tanggal diperlukan untuk filter ini." });
			}
			sql += `WHERE DATE(${userAbsenTime}) = ?`;
			params.push(tzOffsetMinutes, date);
			break;
		case "all":
		default:
			break;
	}

	sql += "ORDER BY a.waktu_absen DESC";

	try {
		const [absensi] = await db.query(sql, params);
		res.json(absensi);
	} catch (error) {
		console.error("Error fetching all attendance data:", error);
		res.status(500).json({ message: "Server Error", error: error.message });
	}
};

const getAbsensiByUser = async (req, res) => {
	const userIdFromParam = req.params.userId;
	const loggedInUser = req.user;

	if (loggedInUser.role !== "admin" && loggedInUser.userId != userIdFromParam) {
		return res.status(403).json({ message: "Akses ditolak." });
	}

	try {
		const [absensi] = await db.query(
			"SELECT * FROM absensi WHERE user_id = ? ORDER BY waktu_absen DESC",
			[userIdFromParam]
		);
		res.json(absensi);
	} catch (error) {
		res.status(500).json({ message: "Server Error" });
	}
};

module.exports = {
	rekamAbsensi,
	getAllAbsensi,
	getAbsensiByUser,
	getAbsensiStatusToday,
};
