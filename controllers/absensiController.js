const db = require("../config/db");
const { generateAttendanceReport } = require("../utils/excelGenerator");
const { format } = require("date-fns");
const { id } = require("date-fns/locale");

const convertOffsetToMySqlFormat = (offsetMinutes) => {
	if (offsetMinutes === 0) return "+00:00";
	const sign = offsetMinutes > 0 ? "-" : "+";
	const hours = Math.floor(Math.abs(offsetMinutes) / 60);
	const minutes = Math.abs(offsetMinutes) % 60;
	return `${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(
		2,
		"0"
	)}`;
};

const rekamAbsensi = async (req, res) => {
	const { koordinat, waktuAbsen, tzOffset } = req.body;
	const userId = req.user.userId;
	const userTimezone = convertOffsetToMySqlFormat(parseInt(tzOffset, 10) || 0);

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

		const checkSql = `
      SELECT CASE WHEN last_absen_date = DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '${userTimezone}')) THEN 1 ELSE 0 END AS sudah_absen_hari_ini
      FROM users WHERE id = ? FOR UPDATE
    `;
		const [users] = await connection.query(checkSql, [userId]);

		if (users[0].sudah_absen_hari_ini === 1) {
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

		const updateSql = `UPDATE users SET last_absen_date = DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '${userTimezone}')) WHERE id = ?`;
		await connection.query(updateSql, [userId]);

		await connection.commit();

		const [newData] = await db.query("SELECT * FROM absensi WHERE id = ?", [
			result.insertId,
		]);
		res
			.status(201)
			.json({ message: "Absensi berhasil direkam!", data: newData[0] });
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
	const { tzOffset } = req.query;
	const userTimezone = convertOffsetToMySqlFormat(parseInt(tzOffset, 10) || 0);

	try {
		const sql = `
      SELECT CASE WHEN last_absen_date = DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '${userTimezone}')) THEN 'sudah_absen' ELSE 'belum_absen' END AS status 
      FROM users WHERE id = ?
    `;
		const [users] = await db.query(sql, [userId]);

		if (users.length === 0)
			return res.status(404).json({ message: "User tidak ditemukan." });

		const status = users[0].status;
		let absensiData = null;

		if (status === "sudah_absen") {
			const dataSql = `SELECT * FROM absensi WHERE user_id = ? AND DATE(CONVERT_TZ(waktu_absen, "+00:00", '${userTimezone}')) = DATE(CONVERT_TZ(UTC_TIMESTAMP(), "+00:00", '${userTimezone}')) ORDER BY id DESC LIMIT 1`;
			const [data] = await db.query(dataSql, [userId]);
			absensiData = data[0] || null;
		}

		res.json({ status, data: absensiData });
	} catch (error) {
		console.error("Error checking attendance status with flag:", error);
		res.status(500).json({ message: "Server Error" });
	}
};

const getAllAbsensi = async (req, res) => {
	const { filter, date, month, year } = req.query;
	const tzOffset = parseInt(req.query.tzOffset || "0", 10);
	const userTimezone = convertOffsetToMySqlFormat(tzOffset);

	let sql = `
    SELECT a.id, a.user_id, a.waktu_absen, a.latitude, a.longitude, u.nama_lengkap, u.jabatan 
    FROM absensi a JOIN users u ON a.user_id = u.id 
  `;
	const params = [];

	const userNow = `CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '${userTimezone}')`;
	const userAbsenTime = `CONVERT_TZ(a.waktu_absen, '+00:00', '${userTimezone}')`;

	switch (filter) {
		case "today":
			sql += `WHERE DATE(${userAbsenTime}) = DATE(${userNow})`;
			break;
		case "month":
			if (!month || !year)
				return res.status(400).json({ message: "Bulan dan tahun diperlukan." });
			sql += `WHERE YEAR(${userAbsenTime}) = ? AND MONTH(${userAbsenTime}) = ?`;
			params.push(year, month);
			break;
		case "date":
			if (!date)
				return res.status(400).json({ message: "Tanggal diperlukan." });
			sql += `WHERE DATE(${userAbsenTime}) = ?`;
			params.push(date);
			break;
	}
	sql += " ORDER BY a.waktu_absen DESC";

	try {
		const [absensi] = await db.query(sql, params);
		res.json(absensi);
	} catch (error) {
		console.error("Error fetching attendance data:", error);
		res.status(500).json({ message: "Server Error", error: error.message });
	}
};

const exportAbsensi = async (req, res) => {
	const { month, year } = req.query;
	if (!month || !year)
		return res.status(400).json({ message: "Bulan dan tahun diperlukan." });

	try {
		const [allUsers] = await db.query(
			"SELECT id, nama_lengkap, jabatan, role FROM users"
		);

		const attendanceSql = `
      SELECT a.user_id, a.waktu_absen, u.nama_lengkap, u.jabatan 
      FROM absensi a JOIN users u ON a.user_id = u.id 
      WHERE YEAR(a.waktu_absen) = ? AND MONTH(a.waktu_absen) = ?
      ORDER BY u.nama_lengkap, a.waktu_absen
    `;
		const [attendanceData] = await db.query(attendanceSql, [year, month]);

		const workbook = await generateAttendanceReport(
			allUsers,
			attendanceData,
			month,
			year
		);

		res.setHeader(
			"Content-Type",
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
		);
		const monthName = format(new Date(year, month - 1), "MMMM", { locale: id });
		res.setHeader(
			"Content-Disposition",
			`attachment; filename="Laporan Absensi - ${monthName} ${year}.xlsx"`
		);

		await workbook.xlsx.write(res);
		res.end();
	} catch (error) {
		console.error("Error exporting attendance data:", error);
		res.status(500).json({ message: "Server Error" });
	}
};

module.exports = {
	rekamAbsensi,
	getAbsensiStatusToday,
	getAllAbsensi,
	exportAbsensi,
};
