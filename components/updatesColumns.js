// Sumber kebenaran: urutan header & lebar kolom
export const updatesHeaders = [
  "#","KATEGORI","PERUSAHAAN","TELEPON","PIC","EMAIL","WHATSAPP",
  "UPDATE TERAKHIR","STATUS DATE","STATUS","NEXT DATE","NEXT STATUS","CHECKING","AKSI",
];

// Grid/Tabel harus pakai lebar yang sama PERSIS (urutannya match updatesHeaders)
export const updatesColWidths = [
  "48px",       // #
  "120px",      // KATEGORI
  "220px",      // PERUSAHAAN
  "140px",      // TELEPON
  "140px",      // PIC
  "240px",      // EMAIL
  "160px",      // WHATSAPP
  "minmax(320px,1fr)", // UPDATE TERAKHIR (fleksibel)
  "120px",      // STATUS DATE
  "96px",       // STATUS
  "120px",      // NEXT DATE
  "110px",      // NEXT STATUS
  "80px",       // CHECKING
  "100px"       // AKSI
];
