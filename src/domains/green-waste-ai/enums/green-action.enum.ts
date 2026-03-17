/**
 * @fileoverview Green Action enums
 * @description Enums for green action categories, sub-categories, and status
 */

/**
 * Green Action main categories
 * @description Main categories for green actions
 */
export enum GreenActionCategory {
  /**
   * Pilah & Olah Sampah
   */
  PILAH_SAMPAH = 'PILAH_SAMPAH',

  /**
   * Tanam Pohon & Area Hijau
   */
  TANAM_POHON = 'TANAM_POHON',

  /**
   * Produk Organik/Ramah Lingkungan
   */
  KONSUMSI_HIJAU = 'KONSUMSI_HIJAU',

  /**
   * Aksi Kolektif
   */
  AKSI_KOLEKTIF = 'AKSI_KOLEKTIF',
}

/**
 * Pilah Sampah sub-categories
 * @description Sub-categories for Pilah Sampah actions
 */
export enum GreenWasteSubCategory {
  /**
   * Pilah Sampah Organik
   */
  SAMPAH_ORGANIK = 'SAMPAH_ORGANIK',

  /**
   * Pilah Sampah Anorganik Daur Ulang
   */
  SAMPAH_ANORGANIK = 'SAMPAH_ANORGANIK',

  /**
   * Penanganan Sampah Berbahaya (B3)
   */
  SAMPAH_B3 = 'SAMPAH_B3',
}

/**
 * Tanam Pohon sub-categories
 * @description Sub-categories for Tanam Pohon actions
 */
export enum GreenHomeSubCategory {
  /**
   * Tanam Pohon/Tanaman Baru
   */
  TANAM_POHON_BARU = 'TANAM_POHON_BARU',

  /**
   * Urban Farming
   */
  URBAN_FARMING = 'URBAN_FARMING',

  /**
   * Mini Green Corner
   */
  GREEN_CORNER = 'GREEN_CORNER',
}

/**
 * Konsumsi Hijau sub-categories
 * @description Sub-categories for Konsumsi Hijau actions
 */
export enum GreenConsumptionSubCategory {
  /**
   * Produk Organik
   */
  PRODUK_ORGANIK = 'PRODUK_ORGANIK',

  /**
   * Refill Station/Bulk Store
   */
  REFILL_STATION = 'REFILL_STATION',

  /**
   * Barang Reusable
   */
  BARANG_REUSABLE = 'BARANG_REUSABLE',
}

/**
 * Aksi Kolektif sub-categories
 * @description Sub-categories for Aksi Kolektif actions
 */
export enum GreenCommunitySubCategory {
  /**
   * Kerja Bakti
   */
  KERJA_BAKTI = 'KERJA_BAKTI',

  /**
   * Bersih Sungai
   */
  BERSIH_SUNGAI = 'BERSIH_SUNGAI',
}

/**
 * Green Action verification status
 * @description Status of AI verification for green actions
 */
export enum GreenActionStatus {
  /**
   * Action is pending verification
   */
  PENDING = 'PENDING',

  /**
   * Action has been verified and approved
   */
  VERIFIED = 'VERIFIED',

  /**
   * Action has been rejected by AI
   */
  REJECTED = 'REJECTED',

  /**
   * Action needs improvement/re-upload
   */
  NEEDS_IMPROVEMENT = 'NEEDS_IMPROVEMENT',
}

/**
 * Media type for green action proof
 * @description Type of media uploaded as proof
 */
export enum GreenActionMediaType {
  /**
   * Image proof
   */
  IMAGE = 'IMAGE',

  /**
   * Video proof
   */
  VIDEO = 'VIDEO',
}
