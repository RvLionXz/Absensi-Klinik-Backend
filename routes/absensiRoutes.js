const express = require("express");
const router = express.Router();
const {
	rekamAbsensi,
	getAllAbsensi,
	getAbsensiByUser,
	getAbsensiStatusToday,
} = require("../controllers/absensiController");
const { authenticateToken, isAdmin } = require("../middleware/authMiddleware");

router.get("/status", authenticateToken, getAbsensiStatusToday);
router.post("/", authenticateToken, rekamAbsensi);
router.get("/", authenticateToken, isAdmin, getAllAbsensi);
router.get("/:userId", authenticateToken, getAbsensiByUser);

module.exports = router;
