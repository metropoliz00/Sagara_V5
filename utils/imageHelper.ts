/**
 * Mengkompres dan mengubah ukuran gambar (Resize) di sisi klien.
 * 
 * UPDATE V2: Smart Compression untuk Google Sheets Storage.
 * Batas aman penyimpanan sel adalah ~45.000 karakter.
 * Fungsi ini akan berusaha keras agar string base64 di bawah batas tersebut.
 * 
 * @param file File gambar asli dari input
 * @param maxWidth Lebar maksimal target
 * @param quality Kualitas gambar (0.0 - 1.0)
 * @returns Promise string base64 yang aman untuk Sheet
 */
export const compressImage = (file: File, maxWidth = 300, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        // 1. Hitung aspek rasio awal
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        // 2. Buat Canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error("Gagal membuat context canvas"));
          return;
        }

        // 3. Gambar ulang di canvas
        ctx.drawImage(img, 0, 0, width, height);

        // 4. Tentukan tipe output awal
        // Preferensi: Gunakan tipe asli, tapi jika bukan PNG, paksa JPEG
        let outputType = file.type;
        if (file.type !== 'image/png') {
            outputType = 'image/jpeg';
        }
        
        // 5. Percobaan 1: Kompresi Standard
        let base64 = canvas.toDataURL(outputType, quality);

        // 6. SMART CHECK: Batas Google Sheet Cell (~50k chars)
        // Kita set batas aman di 45.000 karakter.
        if (base64.length > 45000) {
            console.warn("Gambar terlalu besar untuk Sheet, mencoba kompresi agresif...", base64.length);
            
            // Strategi A: Ubah ke JPEG (Hilangkan transparansi demi ukuran)
            // Ini sangat efektif untuk logo yang kompleks
            base64 = canvas.toDataURL('image/jpeg', 0.5);
            
            // Strategi B: Jika masih besar, resize dimensi 50% lagi
            if (base64.length > 45000) {
                 const smW = Math.floor(width * 0.6); // Turunkan ke 60% ukuran
                 const smH = Math.floor(height * 0.6);
                 
                 const smallCanvas = document.createElement('canvas');
                 smallCanvas.width = smW;
                 smallCanvas.height = smH;
                 const smCtx = smallCanvas.getContext('2d');
                 if (smCtx) {
                    smCtx.drawImage(img, 0, 0, smW, smH);
                    // Paksa JPEG kualitas rendah
                    base64 = smallCanvas.toDataURL('image/jpeg', 0.5);
                 }
            }
        }
        
        console.log(`Final Size: ${base64.length} chars (Limit: 50000)`);
        
        // Jika masih gagal (sangat jarang terjadi untuk icon 150px), 
        // kembalikan error agar UI tahu
        if (base64.length > 49000) {
            reject(new Error("Gambar terlalu detail/besar. Coba gunakan gambar lain yang lebih sederhana."));
        } else {
            resolve(base64);
        }
      };
      
      img.onerror = (err) => reject(err);
    };
    
    reader.onerror = (err) => reject(err);
  });
};