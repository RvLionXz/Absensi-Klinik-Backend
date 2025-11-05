const ExcelJS = require("exceljs");
const {
	format,
	startOfMonth,
	endOfMonth,
	eachDayOfInterval,
} = require("date-fns");
const { id } = require("date-fns/locale");

async function generateAttendanceReport(allUsers, attendanceData, month, year) {
	const workbook = new ExcelJS.Workbook();
	const sheet = workbook.addWorksheet(
		`Laporan Absensi ${format(new Date(year, month - 1), "MMMM yyyy", {
			locale: id,
		})}`
	);

	const startDate = startOfMonth(new Date(year, month - 1));
	const endDate = endOfMonth(new Date(year, month - 1));
	const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });

	const headers = [
		{ header: "Nama Karyawan", key: "nama", width: 30 },
		{ header: "Jabatan", key: "jabatan", width: 25 },
	];
	daysInMonth.forEach((day) => {
		headers.push({
			header: format(day, "E\ndd", { locale: id }),
			key: `day_${format(day, "yyyy-MM-dd")}`,
			width: 8,
		});
	});
	headers.push({ header: "Total Hadir", key: "totalHadir", width: 15 });
	sheet.columns = headers;

	const headerRow = sheet.getRow(1);
	headerRow.height = 35;
	headerRow.font = { bold: true, size: 11 };
	headerRow.alignment = {
		vertical: "middle",
		horizontal: "center",
		wrapText: true,
	};
	headerRow.eachCell((cell) => {
		cell.fill = {
			type: "pattern",
			pattern: "solid",
			fgColor: { argb: "FFD3D3D3" },
		};
		cell.border = {
			top: { style: "thin" },
			left: { style: "thin" },
			bottom: { style: "thin" },
			right: { style: "thin" },
		};
	});

	const attendanceMap = new Map();
	attendanceData.forEach((item) => {
		const dateKey = format(new Date(item.waktu_absen), "yyyy-MM-dd");
		const timeValue = format(new Date(item.waktu_absen), "HH:mm");
		const mapKey = `${item.user_id}_${dateKey}`;
		attendanceMap.set(mapKey, timeValue);
	});

	allUsers.forEach((user) => {
		if (user.role !== "karyawan") return;

		const rowData = {
			nama: user.nama_lengkap,
			jabatan: user.jabatan,
		};
		let totalHadir = 0;
		daysInMonth.forEach((day) => {
			const dateString = format(day, "yyyy-MM-dd");
			const dateKey = `day_${dateString}`;
			const mapKey = `${user.id}_${dateString}`;

			if (attendanceMap.has(mapKey)) {
				rowData[dateKey] = attendanceMap.get(mapKey);
				totalHadir++;
			} else {
				rowData[dateKey] = "-";
			}
		});
		rowData.totalHadir = totalHadir;
		const addedRow = sheet.addRow(rowData);

		addedRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
			cell.alignment = { vertical: "middle", horizontal: "center" };
			cell.border = {
				top: { style: "thin" },
				left: { style: "thin" },
				bottom: { style: "thin" },
				right: { style: "thin" },
			};

			if (colNumber > 2 && colNumber <= daysInMonth.length + 2) {
				if (cell.value !== "-") {
					cell.font = { color: { argb: "FF006400" }, bold: true };
					cell.fill = {
						type: "pattern",
						pattern: "solid",
						fgColor: { argb: "FFC6EFCE" },
					};
				} else {
					cell.font = { color: { argb: "FF9C0006" } };
					cell.fill = {
						type: "pattern",
						pattern: "solid",
						fgColor: { argb: "FFFFC7CE" },
					};
				}
			}
			if (colNumber === headers.length) {
				cell.font = { bold: true };
			}
		});
	});

	return workbook;
}

module.exports = { generateAttendanceReport };
