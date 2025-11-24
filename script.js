let currentUser = null;
let usersData = [];
let reportsData = [];
let monthlyData = [];

// Kiểm tra đăng nhập từ localStorage
function checkSavedLogin() {
    const savedUser = localStorage.getItem("giganUser");
    if (savedUser) {
        currentUser = JSON.parse(savedUser);

        // Hiển thị dashboard
        document.getElementById("loginScreen").style.display = "none";
        document.getElementById("dashboardScreen").classList.add("active");

        // Hiển thị thông tin user
        document.getElementById("currentUserEmail").textContent = currentUser.email;
        document.getElementById("currentUserRole").textContent = currentUser.role.toUpperCase();
        document.getElementById("currentUserRole").style.background = currentUser.role === "admin" ? "#667eea" : "#48bb78";

        return true;
    }
    return false;
}

// Load dữ liệu khi trang load xong
document.addEventListener("DOMContentLoaded", async () => {
    // Kiểm tra xem user đã đăng nhập chưa
    const isLoggedIn = checkSavedLogin();

    if (isLoggedIn) {
        showLoading();
        try {
            await loadAllData();
            renderDashboard();
            renderUsersTable();
            renderReportsTable();
            updateUserPermissions();
            setTimeout(initCharts, 100);
        } catch (error) {
            console.error("Lỗi khi tải dữ liệu:", error);
            showError("Không thể tải dữ liệu từ Google Sheets.");
        } finally {
            hideLoading();
        }
    }
});

// Load tất cả dữ liệu
async function loadAllData() {
    try {
        const [users, reports, monthly] = await Promise.all([fetchSheetData(CONFIG.SHEETS.USERS), fetchSheetData(CONFIG.SHEETS.REPORTS), fetchSheetData(CONFIG.SHEETS.MONTHLY_DATA)]);

        usersData = users;
        reportsData = reports;
        monthlyData = monthly;

        console.log("✅ Dữ liệu đã load thành công!", {
            users: usersData.length,
            reports: reportsData.length,
            monthly: monthlyData.length,
        });
    } catch (error) {
        console.error("❌ Lỗi khi load dữ liệu:", error);
        throw error;
    }
}

// Tính toán thống kê
function calculateStats() {
    const totalUsers = usersData.length;

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const monthlyReports = reportsData.filter((report) => {
        if (!report.Date) return false;
        const dateParts = report.Date.split("/");
        if (dateParts.length !== 3) return false;
        const reportMonth = parseInt(dateParts[1]);
        const reportYear = parseInt(dateParts[2]);
        return reportMonth === currentMonth && reportYear === currentYear;
    }).length;

    const completedReports = reportsData.filter((r) => r.Status && r.Status.toLowerCase() === "completed").length;

    const completedPercentage = reportsData.length > 0 ? Math.round((completedReports / reportsData.length) * 100) : 0;

    const processingReports = reportsData.filter((r) => r.Status && r.Status.toLowerCase() === "processing").length;

    return {
        totalUsers,
        monthlyReports,
        completedPercentage,
        processingReports,
    };
}

// Render Dashboard
function renderDashboard() {
    const stats = calculateStats();

    document.querySelector(".stat-card:nth-child(1) .stat-value").textContent = stats.totalUsers;
    document.querySelector(".stat-card:nth-child(2) .stat-value").textContent = stats.monthlyReports.toLocaleString();
    document.querySelector(".stat-card:nth-child(3) .stat-value").textContent = stats.completedPercentage + "%";
    document.querySelector(".stat-card:nth-child(4) .stat-value").textContent = stats.processingReports;

    const recentReportsTable = document.querySelector("#dashboardSection .data-table tbody");
    if (recentReportsTable && reportsData.length > 0) {
        recentReportsTable.innerHTML = reportsData
            .slice(0, 4)
            .map(
                (report) => `
      <tr>
        <td>#${report.ID}</td>
        <td>${report.Name}</td>
        <td>${report.Creator}</td>
        <td>${report.Date}</td>
        <td><span class="badge badge-active">${translateStatus(report.Status)}</span></td>
      </tr>
    `
            )
            .join("");
    }
}

function translateStatus(status) {
    const statusMap = {
        completed: "Hoàn thành",
        processing: "Đang xử lý",
        pending: "Chờ xử lý",
        cancelled: "Đã hủy",
    };
    return statusMap[status.toLowerCase()] || status;
}

// Render Users Table
function renderUsersTable() {
    const usersTable = document.querySelector("#usersTable .data-table tbody");

    if (usersTable && usersData.length > 0) {
        usersTable.innerHTML = usersData
            .map(
                (user) => `
      <tr>
        <td>#${user.ID}</td>
        <td>${user.Email}</td>
        <td>${user.Name}</td>
        <td><span class="badge badge-${user.Role.toLowerCase()}">${user.Role}</span></td>
        <td><span class="badge ${user.Status === "Active" ? "badge-active" : "badge-inactive"}">${user.Status}</span></td>
        <td>
          <button class="action-button edit" onclick="showEditUserModal('${user.ID}')">✏️ Sửa</button>
          <button class="action-button delete" onclick="deleteUser('${user.ID}')">🗑️ Xóa</button>
        </td>
      </tr>
    `
            )
            .join("");
    }
}

// Render Reports Table
function renderReportsTable() {
    const reportsTable = document.querySelector("#reportsSection .data-table tbody");

    if (reportsTable && reportsData.length > 0) {
        reportsTable.innerHTML = reportsData
            .map(
                (report) => `
      <tr>
        <td>#${report.ID}</td>
        <td>${report.Name}</td>
        <td>${report.Type}</td>
        <td>${report.Creator}</td>
        <td>${report.Date}</td>
        <td><span class="badge ${report.Status.toLowerCase() === "completed" ? "badge-active" : "badge-processing"}">${translateStatus(report.Status)}</span></td>
        <td>
          <button class="action-button edit" onclick="showEditReportModal('${report.ID}')">✏️ Sửa</button>
          <button class="action-button delete" onclick="deleteReport('${report.ID}')">🗑️ Xóa</button>
        </td>
      </tr>
    `
            )
            .join("");
    }
}

// ==================== USER CRUD ====================

// Hiển thị modal sửa User
function showEditUserModal(id) {
    const user = usersData.find((u) => u.ID === id);
    if (!user) return;

    const modal = document.getElementById("userModal");
    document.getElementById("modalTitle").textContent = "Chỉnh sửa User";
    document.getElementById("userId").value = user.ID;
    document.getElementById("userEmail").value = user.Email;
    document.getElementById("userName").value = user.Name;
    document.getElementById("userRole").value = user.Role;
    document.getElementById("userStatus").value = user.Status;

    modal.style.display = "flex";
}

// Hiển thị modal thêm User
function showAddUserModal() {
    const modal = document.getElementById("userModal");
    document.getElementById("modalTitle").textContent = "Thêm User Mới";
    document.getElementById("userForm").reset();

    // Generate new ID
    const maxId = Math.max(...usersData.map((u) => parseInt(u.ID.replace("U", ""))));
    const newId = "U" + String(maxId + 1).padStart(3, "0");
    document.getElementById("userId").value = newId;

    modal.style.display = "flex";
}

// Đóng modal User
function closeUserModal() {
    document.getElementById("userModal").style.display = "none";
}

// Lưu User (Thêm hoặc Sửa)
async function saveUser(event) {
    event.preventDefault();

    const userData = {
        ID: document.getElementById("userId").value,
        Email: document.getElementById("userEmail").value,
        Name: document.getElementById("userName").value,
        Role: document.getElementById("userRole").value,
        Status: document.getElementById("userStatus").value,
    };

    // Kiểm tra xem là thêm mới hay cập nhật
    const existingUser = usersData.find((u) => u.ID === userData.ID);
    const action = existingUser ? "UPDATE" : "CREATE";

    showLoading();

    try {
        const result = await updateSheetData(action, CONFIG.SHEETS.USERS, userData);

        if (result.success) {
            // Cập nhật dữ liệu local
            if (action === "CREATE") {
                usersData.push(userData);
            } else {
                const index = usersData.findIndex((u) => u.ID === userData.ID);
                usersData[index] = userData;
            }

            renderUsersTable();
            renderDashboard();
            closeUserModal();

            showNotification(`${action === "CREATE" ? "Thêm" : "Cập nhật"} user thành công!`, "success");

            // Reload sau 1 giây để đồng bộ
            setTimeout(() => loadAllData().then(renderUsersTable), 1000);
        } else {
            showNotification("Có lỗi xảy ra: " + result.message, "error");
        }
    } catch (error) {
        showNotification("Lỗi kết nối: " + error.toString(), "error");
    } finally {
        hideLoading();
    }
}

// Xóa User
async function deleteUser(id) {
    const user = usersData.find((u) => u.ID === id);
    if (!user) return;

    // Inline confirmation
    const row = event.target.closest("tr");
    const deleteBtn = event.target;
    const originalHTML = deleteBtn.parentElement.innerHTML;

    deleteBtn.parentElement.innerHTML = `
    <button class="action-button delete" onclick="confirmDeleteUser('${id}', this)" style="background: #e53e3e;">✓ Xác nhận xóa</button>
    <button class="action-button edit" onclick="cancelDelete(this, \`${originalHTML.replace(/`/g, "\\`")}\`)">✕ Hủy</button>
  `;
}

async function confirmDeleteUser(id, btn) {
    const user = usersData.find((u) => u.ID === id);

    showLoading();

    try {
        const result = await updateSheetData("DELETE", CONFIG.SHEETS.USERS, { ID: id });

        if (result.success) {
            // Xóa khỏi dữ liệu local
            usersData = usersData.filter((u) => u.ID !== id);

            renderUsersTable();
            renderDashboard();

            showNotification(`Đã xóa user "${user.Name}" thành công!`, "success");

            // Reload sau 1 giây
            setTimeout(() => loadAllData().then(renderUsersTable), 1000);
        } else {
            showNotification("Có lỗi xảy ra: " + result.message, "error");
        }
    } catch (error) {
        showNotification("Lỗi kết nối: " + error.toString(), "error");
    } finally {
        hideLoading();
    }
}

function cancelDelete(btn, originalHTML) {
    btn.parentElement.innerHTML = originalHTML;
}

// ==================== REPORT CRUD ====================

// Hiển thị modal sửa Report
function showEditReportModal(id) {
    const report = reportsData.find((r) => r.ID === id);
    if (!report) return;

    const modal = document.getElementById("reportModal");
    document.getElementById("reportModalTitle").textContent = "Chỉnh sửa Report";
    document.getElementById("reportId").value = report.ID;
    document.getElementById("reportName").value = report.Name;
    document.getElementById("reportType").value = report.Type;
    document.getElementById("reportCreator").value = report.Creator;
    document.getElementById("reportDate").value = report.Date;
    document.getElementById("reportStatus").value = report.Status;

    modal.style.display = "flex";
}

// Hiển thị modal thêm Report
function showAddReportModal() {
    const modal = document.getElementById("reportModal");
    document.getElementById("reportModalTitle").textContent = "Thêm Report Mới";
    document.getElementById("reportForm").reset();

    // Generate new ID
    const maxId = Math.max(...reportsData.map((r) => parseInt(r.ID.replace("R", ""))));
    const newId = "R" + String(maxId + 1).padStart(3, "0");
    document.getElementById("reportId").value = newId;

    // Set ngày hiện tại
    const today = new Date();
    const formattedDate = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;
    document.getElementById("reportDate").value = formattedDate;

    modal.style.display = "flex";
}

// Đóng modal Report
function closeReportModal() {
    document.getElementById("reportModal").style.display = "none";
}

// Lưu Report
async function saveReport(event) {
    event.preventDefault();

    const reportData = {
        ID: document.getElementById("reportId").value,
        Name: document.getElementById("reportName").value,
        Type: document.getElementById("reportType").value,
        Creator: document.getElementById("reportCreator").value,
        Date: document.getElementById("reportDate").value,
        Status: document.getElementById("reportStatus").value,
    };

    const existingReport = reportsData.find((r) => r.ID === reportData.ID);
    const action = existingReport ? "UPDATE" : "CREATE";

    showLoading();

    try {
        const result = await updateSheetData(action, CONFIG.SHEETS.REPORTS, reportData);

        if (result.success) {
            if (action === "CREATE") {
                reportsData.push(reportData);
            } else {
                const index = reportsData.findIndex((r) => r.ID === reportData.ID);
                reportsData[index] = reportData;
            }

            renderReportsTable();
            renderDashboard();
            closeReportModal();

            showNotification(`${action === "CREATE" ? "Thêm" : "Cập nhật"} report thành công!`, "success");

            setTimeout(
                () =>
                    loadAllData().then(() => {
                        renderReportsTable();
                        renderDashboard();
                    }),
                1000
            );
        } else {
            showNotification("Có lỗi xảy ra: " + result.message, "error");
        }
    } catch (error) {
        showNotification("Lỗi kết nối: " + error.toString(), "error");
    } finally {
        hideLoading();
    }
}

// Xóa Report
async function deleteReport(id) {
    const report = reportsData.find((r) => r.ID === id);
    if (!report) return;

    const row = event.target.closest("tr");
    const deleteBtn = event.target;
    const originalHTML = deleteBtn.parentElement.innerHTML;

    deleteBtn.parentElement.innerHTML = `
    <button class="action-button delete" onclick="confirmDeleteReport('${id}', this)" style="background: #e53e3e;">✓ Xác nhận xóa</button>
    <button class="action-button edit" onclick="cancelDelete(this, \`${originalHTML.replace(/`/g, "\\`")}\`)">✕ Hủy</button>
  `;
}

async function confirmDeleteReport(id, btn) {
    const report = reportsData.find((r) => r.ID === id);

    showLoading();

    try {
        const result = await updateSheetData("DELETE", CONFIG.SHEETS.REPORTS, { ID: id });

        if (result.success) {
            reportsData = reportsData.filter((r) => r.ID !== id);

            renderReportsTable();
            renderDashboard();

            showNotification(`Đã xóa report "${report.Name}" thành công!`, "success");

            setTimeout(
                () =>
                    loadAllData().then(() => {
                        renderReportsTable();
                        renderDashboard();
                    }),
                1000
            );
        } else {
            showNotification("Có lỗi xảy ra: " + result.message, "error");
        }
    } catch (error) {
        showNotification("Lỗi kết nối: " + error.toString(), "error");
    } finally {
        hideLoading();
    }
}

// ==================== LOGIN & NAVIGATION ====================

document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    if ((email === "admin@gigan.vn" && password === "123@") || (email === "user@gigan.vn" && password === "123@")) {
        currentUser = {
            email: email,
            role: email === "admin@gigan.vn" ? "admin" : "user",
        };

        // LƯU VÀO LOCALSTORAGE
        localStorage.setItem("giganUser", JSON.stringify(currentUser));

        document.getElementById("currentUserEmail").textContent = currentUser.email;
        document.getElementById("currentUserRole").textContent = currentUser.role.toUpperCase();
        document.getElementById("currentUserRole").style.background = currentUser.role === "admin" ? "#248dab" : "#f7a219";

        document.getElementById("loginScreen").style.display = "none";
        document.getElementById("dashboardScreen").classList.add("active");

        showLoading();
        try {
            await loadAllData();
            renderDashboard();
            renderUsersTable();
            renderReportsTable();
            updateUserPermissions();
            setTimeout(initCharts, 100);
        } catch (error) {
            console.error("Lỗi khi tải dữ liệu:", error);
            showError("Không thể tải dữ liệu từ Google Sheets.");
        } finally {
            hideLoading();
        }
    }
});

document.querySelectorAll(".menu-item").forEach((item) => {
    item.addEventListener("click", () => {
        const section = item.getAttribute("data-section");

        document.querySelectorAll(".menu-item").forEach((m) => m.classList.remove("active"));
        item.classList.add("active");

        document.querySelectorAll(".content-section").forEach((s) => s.classList.remove("active"));
        document.getElementById(section + "Section").classList.add("active");
    });
});

document.getElementById("logoutButton").addEventListener("click", () => {
    currentUser = null;

    // XÓA KHỎI LOCALSTORAGE
    localStorage.removeItem("giganUser");

    document.getElementById("loginScreen").style.display = "flex";
    document.getElementById("dashboardScreen").classList.remove("active");
    document.getElementById("email").value = "";
    document.getElementById("password").value = "";

    document.querySelectorAll(".menu-item").forEach((m) => m.classList.remove("active"));
    document.querySelector('[data-section="dashboard"]').classList.add("active");
    document.querySelectorAll(".content-section").forEach((s) => s.classList.remove("active"));
    document.getElementById("dashboardSection").classList.add("active");
});

function updateUserPermissions() {
    if (currentUser.role === "user") {
        document.getElementById("usersTable").style.display = "none";
        document.getElementById("usersNoAccess").style.display = "block";
        document.getElementById("addUserBtn").style.display = "none";
    } else {
        document.getElementById("usersTable").style.display = "block";
        document.getElementById("usersNoAccess").style.display = "none";
        document.getElementById("addUserBtn").style.display = "inline-block";
    }
}

// ==================== CHARTS ====================

function initCharts() {
    const monthlyCtx = document.getElementById("monthlyChart");
    if (monthlyCtx && monthlyData.length > 0) {
        const labels = monthlyData.map((item) => item.Month);
        const data = monthlyData.map((item) => parseInt(item.Reports));

        new Chart(monthlyCtx, {
            type: "line",
            data: {
                labels: labels,
                datasets: [
                    {
                        label: "Số lượng báo cáo",
                        data: data,
                        borderColor: "#667eea",
                        backgroundColor: "rgba(102, 126, 234, 0.1)",
                        tension: 0.4,
                        fill: true,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } },
            },
        });
    }

    const categoryCtx = document.getElementById("categoryChart");
    if (categoryCtx && reportsData.length > 0) {
        const categories = {};
        reportsData.forEach((report) => {
            const type = report.Type;
            categories[type] = (categories[type] || 0) + 1;
        });

        const labels = Object.keys(categories);
        const data = Object.values(categories);
        const colors = ["#667eea", "#48bb78", "#f6ad55", "#fc8181", "#9f7aea"];

        new Chart(categoryCtx, {
            type: "doughnut",
            data: {
                labels: labels,
                datasets: [
                    {
                        data: data,
                        backgroundColor: colors.slice(0, labels.length),
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { legend: { position: "bottom" } },
            },
        });
    }
}

// ==================== UTILITIES ====================

function showLoading() {
    const loader = document.getElementById("loadingOverlay");
    if (loader) loader.style.display = "flex";
}

function hideLoading() {
    const loader = document.getElementById("loadingOverlay");
    if (loader) loader.style.display = "none";
}

function showError(message) {
    showNotification(message, "error");
}

function showNotification(message, type = "success") {
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 16px 24px;
    background: ${type === "success" ? "#48bb78" : "#fc8181"};
    color: white;
    border-radius: 8px;
    font-weight: 600;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = "slideOut 0.3s ease";
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
