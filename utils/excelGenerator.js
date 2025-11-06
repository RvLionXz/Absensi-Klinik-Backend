const ExcelJS = require("exceljs");
const {
	format,
	startOfMonth,
	endOfMonth,
	eachDayOfInterval,
	getHours,
	getMinutes,
} = require("date-fns");
const { id } = require("date-fns/locale");

const COLORS = {
	greenFill: "FFC6EFCE",
	greenFont: "FF006400",
	yellowFill: "FFFFEB9C",
	yellowFont: "FF9C6500",
	redFill: "FFFFC7CE",
	redFont: "FF9C0006",
	headerFill: "FFD3D3D3",
};

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
			fgColor: { argb: COLORS.headerFill },
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
		const date = new Date(item.waktu_absen);
		const dateKey = format(date, "yyyy-MM-dd");
		const mapKey = `${item.user_id}_${dateKey}`;
		attendanceMap.set(mapKey, date);
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
				rowData[dateKey] = format(attendanceMap.get(mapKey), "HH:mm");
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
					const timeParts = cell.value.split(":");
					const hour = parseInt(timeParts[0], 10);
					const minute = parseInt(timeParts[1], 10);

					const isGreen =
						(hour >= 7 && hour < 8) ||
						(hour === 8 && minute === 0) ||
						(hour >= 17 && hour < 18) ||
						(hour === 18 && minute === 0);

					const isYellow =
						(hour === 8 && minute >= 1 && minute <= 10) ||
						(hour === 18 && minute >= 1 && minute <= 10);

					if (isGreen) {
						cell.font = { color: { argb: COLORS.greenFont }, bold: true };
						cell.fill = {
							type: "pattern",
							pattern: "solid",
							fgColor: { argb: COLORS.greenFill },
						};
					} else if (isYellow) {
						cell.font = { color: { argb: COLORS.yellowFont }, bold: true };
						cell.fill = {
							type: "pattern",
							pattern: "solid",
							fgColor: { argb: COLORS.yellowFill },
						};
					} else {
						cell.font = { color: { argb: COLORS.redFont }, bold: true };
						cell.fill = {
							type: "pattern",
							pattern: "solid",
							fgColor: { argb: COLORS.redFill },
						};
					}
				} else {
					cell.font = { color: { argb: COLORS.redFont } };
					cell.fill = {
						type: "pattern",
						pattern: "solid",
						fgColor: { argb: COLORS.redFill },
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
