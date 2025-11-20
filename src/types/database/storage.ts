/**
 * Storage and file types
 */

/**
 * Storage data types
 */
export interface StorageData {
  file_id: string;
  file_name: string;
  file_path: string;
  content_type: string;
  file_size: number;
  checksum: string;
  upload_metadata: UploadMetadata;
  access_metadata: AccessMetadata;
}

export interface UploadMetadata {
  uploaded_by: string;
  upload_method: 'direct' | 'multipart' | 'resumable';
  source_ip?: string;
  user_agent?: string;
  upload_duration: number;
  virus_scan_result?: 'clean' | 'infected' | 'pending';
}

export interface AccessMetadata {
  is_public: boolean;
  access_count: number;
  last_accessed: string;
  download_count: number;
  sharing_permissions: SharingPermissions;
}

export interface SharingPermissions {
  read: string[];
  write: string[];
  admin: string[];
  public_read: boolean;
  expiry_date?: string;
}
