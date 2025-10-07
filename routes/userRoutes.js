const express = require("express");
const router = express.Router();
const {
	getAllUsers,
	createUser,
	resetDevice,
	deleteUser,
	resetPassword,
} = require("../controllers/userController");
const { authenticateToken, isAdmin } = require("../middleware/authMiddleware");

router.use(authenticateToken, isAdmin);

router.get("/", getAllUsers);
router.post("/", createUser);
router.delete("/:id", deleteUser);
router.put("/reset-device/:id", resetDevice);
router.put("/reset-password/:id", resetPassword);

module.exports = router;
