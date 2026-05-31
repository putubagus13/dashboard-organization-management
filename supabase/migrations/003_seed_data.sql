-- ============================================================
-- SEED DATA
-- ============================================================

-- Member Status Types
INSERT INTO member_status_types (name, description, color) VALUES
  ('Anggota Biasa',      'Anggota reguler organisasi',         '#16a34a'),
  ('Anggota Aktif',      'Anggota dengan keaktifan tinggi',    '#2563eb'),
  ('Anggota Kehormatan', 'Anggota dengan kontribusi istimewa', '#d97706'),
  ('Pengurus',           'Pengurus inti organisasi',           '#dc2626'),
  ('Calon Anggota',      'Anggota yang sedang dalam masa uji', '#6b7280');

-- Transaction Categories
INSERT INTO transaction_categories (name, type, color) VALUES
  ('Iuran Anggota',     'income',  '#16a34a'),
  ('Donasi',            'income',  '#2563eb'),
  ('Kas Masuk Lainnya', 'income',  '#0891b2'),
  ('Pinjaman Masuk',    'income',  '#7c3aed'),
  ('Cicilan Pinjaman',  'income',  '#9333ea'),
  ('Hasil Bank Sampah', 'income',  '#059669'),
  ('Operasional',       'expense', '#dc2626'),
  ('Kegiatan',          'expense', '#ea580c'),
  ('Sosial',            'expense', '#db2777'),
  ('Pinjaman Keluar',   'expense', '#7c3aed'),
  ('Lainnya',           'expense', '#6b7280');

-- Points Config
INSERT INTO points_config (action, label, points, description) VALUES
  ('attendance_present',  'Hadir Rapat',      10, 'Poin untuk kehadiran rapat'),
  ('attendance_excused',  'Izin Rapat',        5, 'Poin untuk ketidakhadiran dengan izin'),
  ('attendance_sick',     'Sakit',             5, 'Poin untuk ketidakhadiran karena sakit'),
  ('dues_paid_ontime',    'Iuran Tepat Waktu', 5, 'Poin untuk pembayaran iuran tepat waktu'),
  ('volunteer_activity',  'Kegiatan Sukarela', 15,'Poin untuk partisipasi kegiatan sukarela');

-- Waste Types (sampah plastik)
INSERT INTO waste_types (name, description, price_per_kg, color) VALUES
  ('PET (Botol Bening)',   'Botol minuman bening/transparan', 2500,  '#3b82f6'),
  ('HDPE (Botol Warna)',   'Botol sabun, sampo, ember',       1500,  '#8b5cf6'),
  ('PP (Plastik Keras)',   'Tutup botol, ember, baskom',      1200,  '#f59e0b'),
  ('Kardus/Karton',        'Kardus, karton bekas',            1000,  '#92400e'),
  ('Kertas Campuran',      'Kertas, majalah, koran',          800,   '#6b7280'),
  ('Kaleng Aluminium',     'Kaleng minuman, makanan',         8000,  '#6b7280'),
  ('Besi/Logam',           'Besi, logam campuran',            3000,  '#374151'),
  ('Plastik Kresek',       'Kantong plastik, plastik lunak',  500,   '#ef4444');

-- Default Cash Account
INSERT INTO cash_accounts (name, description, balance) VALUES
  ('Kas Utama',  'Rekening kas utama organisasi', 0),
  ('Kas Sosial', 'Dana untuk kegiatan sosial',    0),
  ('Dana Cadangan', 'Dana cadangan darurat',      0);
