export async function getOrCreateFolder(accessToken: string, folderName: string, parentId?: string): Promise<string> {
  let query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  }
  
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  const data = await searchRes.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  
  const metadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    ...(parentId && { parents: [parentId] })
  };
  
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata)
  });
  
  const createData = await createRes.json();
  return createData.id;
}

export async function uploadFileToDrive(accessToken: string, file: File, folderId: string): Promise<any> {
  const metadata = {
    name: file.name,
    mimeType: file.type,
    parents: [folderId]
  };

  // For files larger than 5MB, use Resumable Upload
  if (file.size > 5 * 1024 * 1024) {
    const initRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': file.type,
        'X-Upload-Content-Length': file.size.toString()
      },
      body: JSON.stringify(metadata)
    });
    
    if (!initRes.ok) {
      throw new Error('Failed to initialize resumable upload');
    }
    
    const uploadUrl = initRes.headers.get('Location');
    if (!uploadUrl) {
      throw new Error('No upload URL returned');
    }
    
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Range': `bytes 0-${file.size - 1}/${file.size}`
      },
      body: file
    });
    
    if (!uploadRes.ok) {
      throw new Error('Failed to upload file chunk');
    }
    
    return uploadRes.json();
  } else {
    // Multipart for smaller files
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: form
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to upload file');
    }
    
    return response.json();
  }
}
