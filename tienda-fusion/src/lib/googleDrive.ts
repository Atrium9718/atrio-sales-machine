export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  sizeBytes?: number;
  iconLink?: string;
  thumbnailLink?: string;
  webViewLink?: string;
  webContentLink?: string;
  modifiedTime?: string;
}

export function formatFileSize(bytesStr?: string | number): string {
  if (!bytesStr) return 'Tamaño desconocido';
  const bytes = typeof bytesStr === 'string' ? parseInt(bytesStr, 10) : bytesStr;
  if (isNaN(bytes) || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export async function listGoogleDriveFiles(
  accessToken: string,
  options?: {
    searchQuery?: string;
    filterGraphicFilesOnly?: boolean;
    pageSize?: number;
  }
): Promise<{ files: DriveFile[]; nextPageToken?: string }> {
  try {
    const { searchQuery = '', filterGraphicFilesOnly = false, pageSize = 30 } = options || {};

    let qParts: string[] = ['trashed = false'];

    if (searchQuery.trim()) {
      qParts.push(`name contains '${searchQuery.trim().replace(/'/g, "\\'")}'`);
    }

    if (filterGraphicFilesOnly) {
      // Common print / prepress extensions and mime types
      const graphicConditions = [
        "mimeType = 'application/pdf'",
        "mimeType contains 'image/'",
        "mimeType = 'application/illustrator'",
        "mimeType = 'application/photoshop'",
        "mimeType = 'application/postscript'",
        "mimeType = 'application/zip'",
        "name contains '.pdf'",
        "name contains '.ai'",
        "name contains '.psd'",
        "name contains '.tif'",
        "name contains '.eps'",
        "name contains '.png'",
        "name contains '.jpg'",
        "name contains '.jpeg'",
        "name contains '.zip'"
      ];
      qParts.push(`(${graphicConditions.join(' or ')})`);
    }

    const q = qParts.join(' and ');
    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.append('q', q);
    url.searchParams.append('pageSize', String(pageSize));
    url.searchParams.append('fields', 'nextPageToken, files(id, name, mimeType, size, iconLink, thumbnailLink, webViewLink, webContentLink, modifiedTime)');
    url.searchParams.append('orderBy', 'modifiedTime desc');

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `Error de Google Drive API (${res.status})`);
    }

    const data = await res.json();
    const files: DriveFile[] = (data.files || []).map((f: any) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      size: formatFileSize(f.size),
      sizeBytes: f.size ? parseInt(f.size, 10) : undefined,
      iconLink: f.iconLink,
      thumbnailLink: f.thumbnailLink,
      webViewLink: f.webViewLink,
      webContentLink: f.webContentLink,
      modifiedTime: f.modifiedTime ? new Date(f.modifiedTime).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) : undefined,
    }));

    return { files, nextPageToken: data.nextPageToken };
  } catch (error) {
    console.error('Error fetching files from Google Drive:', error);
    throw error;
  }
}
