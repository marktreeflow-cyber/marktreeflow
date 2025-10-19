// utils/columnsUtils.js — FINAL 2025
// 🔹 Pusat definisi header & width semua tabel di MPLAN Dashboard
// 🔹 Pastikan urutan & jumlah kolom selalu sinkron (gridTemplateColumns = colgroup)

// ===================================================
// 🧱 COMPANY TABLE (Daftar Perusahaan)
// ===================================================
export const companyColumns = {
  headers: [
    "#",
    "KATEGORI",
    "PERUSAHAAN",
    "TELEPON",
    "PIC",
    "EMAIL",
    "WHATSAPP",
    "CHECKING",
    "CREATED AT",
    "AKSI",
  ],
  widths: [
    "56px",   // #
    "130px",  // KATEGORI
    "240px",  // PERUSAHAAN
    "150px",  // TELEPON
    "150px",  // PIC
    "260px",  // EMAIL
    "170px",  // WHATSAPP
    "110px",  // CHECKING
    "150px",  // CREATED AT
    "96px",   // AKSI
  ],
  sortableKeys: {
    KATEGORI: "kategori",
    PERUSAHAAN: "name",
    TELEPON: "company_telp",
    PIC: "pic",
    EMAIL: "pic_email",
    WHATSAPP: "pic_whatsapp",
    CHECKING: "checking",
    "CREATED AT": "created_at",
  },
};

// ===================================================
// 🧱 UPDATES TABLE (Daftar Update Progres)
// ===================================================
export const updatesColumns = {
  headers: [
    "#",
    "KATEGORI",
    "PERUSAHAAN",
    "TELEPON",
    "PIC",
    "EMAIL",
    "WHATSAPP",
    "UPDATE TERAKHIR",
    "STATUS DATE",
    "STATUS",
    "NEXT DATE",
    "NEXT STATUS",
    "CHECKING",
    "AKSI",
  ],
  widths: [
    "48px",         // #
    "120px",        // KATEGORI
    "220px",        // PERUSAHAAN
    "140px",        // TELEPON
    "140px",        // PIC
    "240px",        // EMAIL
    "160px",        // WHATSAPP
    "minmax(320px,1fr)", // UPDATE TERAKHIR (fleksibel)
    "120px",        // STATUS DATE
    "96px",         // STATUS
    "120px",        // NEXT DATE
    "110px",        // NEXT STATUS
    "80px",         // CHECKING
    "100px",        // AKSI
  ],
  sortableKeys: {
    KATEGORI: "kategori",
    PERUSAHAAN: "company_name",
    TELEPON: "company_telp",
    PIC: "pic",
    EMAIL: "pic_email",
    WHATSAPP: "pic_whatsapp",
    STATUS: "status_singkat",
    "STATUS DATE": "update_date",
    "NEXT DATE": "next_date",
    "NEXT STATUS": "next_step",
  },
};
