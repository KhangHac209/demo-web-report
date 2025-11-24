// Cấu hình Google Sheets API
const CONFIG = {
    // Thay YOUR_SHEET_ID bằng ID của bạn
    SHEET_ID: "1rymuYj8csSzm36jQGWNsdO8uF3MypCtTCMAEtsg7apQ",
    API_KEY: "AIzaSyBwZbBIDzfI_t_tNOwxVOC6xg1AYINnTlc",

    // Web App URL để GHI dữ liệu (Google Apps Script)
    WEB_APP_URL: "https://script.google.com/macros/s/AKfycbyKb9jEmLZoOaDUuw6oIw3lOnXaiB57A62YG7fq-7i5TWvJHNRMzBk_O1n50jxZ2N0/exec",
    // Tên các sheet (BỎ STATS đi)
    // Tên các sheet
    SHEETS: {
        USERS: "Users",
        REPORTS: "Reports",
        MONTHLY_DATA: "MonthlyData",
    },
};

// Hàm lấy dữ liệu từ Google Sheet (ĐỌC)
async function fetchSheetData(sheetName) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/${sheetName}?key=${CONFIG.API_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.values) {
            const headers = data.values[0];
            const rows = data.values.slice(1);

            return rows.map((row) => {
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header] = row[index] || "";
                });
                return obj;
            });
        }
        return [];
    } catch (error) {
        console.error(`Lỗi khi lấy dữ liệu từ sheet ${sheetName}:`, error);
        return [];
    }
}

// Hàm thêm/sửa/xóa dữ liệu (GHI)
async function updateSheetData(action, sheetName, rowData) {
    try {
        const response = await fetch(CONFIG.WEB_APP_URL, {
            method: "POST",
            mode: "no-cors", // Quan trọng!
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                action: action,
                sheetName: sheetName,
                rowData: rowData,
            }),
        });

        // Do no-cors nên không đọc được response, giả định thành công
        return { success: true, message: "Đã gửi yêu cầu thành công" };
    } catch (error) {
        console.error("Lỗi khi cập nhật dữ liệu:", error);
        return { success: false, message: error.toString() };
    }
}
