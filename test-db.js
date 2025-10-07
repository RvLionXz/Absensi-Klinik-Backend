// test-db.js
const db = require("./config/db");

async function testConnection() {
	console.log("Mencoba terhubung ke database...");
	try {
		// Menjalankan query yang sangat sederhana
		const [rows] = await db.query("SELECT NOW() as currentTime;");
		console.log("✅ Koneksi ke database BERHASIL!");
		console.log("Waktu saat ini di server database:", rows[0].currentTime);
	} catch (error) {
		console.error("❌ GAGAL terhubung ke database!");
		console.error("Detail Error:", error);
	} finally {
		// Menutup koneksi pool agar skrip bisa berhenti
		await db.end();
	}
}

testConnection();
