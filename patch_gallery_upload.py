import re

file_path = r'E:\saanvi web\workspace\saanvi-admin\app\dashboard\gallery\page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_code = r"""    // 1. Verify bucket exists
    const bucketName = process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'saanvi-media'
    const { data: bucketData, error: bucketError } = await supabase.storage.getBucket(bucketName)
    
    if (bucketError || !bucketData) {
      toast.error(`Storage Bucket '${bucketName}' not found. Please run the SQL migration to create it.`)
      setUploading(false)
      return
    }

    const ext = file.name.split('.').pop()
    const path = `${category}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from(bucketName).upload(path, file, { upsert: true })
    if (upErr) { toast.error(upErr.message); setUploading(false); return }"""

new_code = r"""    const bucketName = process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'saanvi-media'
    const ext = file.name.split('.').pop()
    const path = `${category}/${Date.now()}.${ext}`
    
    const { error: upErr } = await supabase.storage.from(bucketName).upload(path, file, { upsert: true })
    if (upErr) { 
      if (upErr.message.includes('Bucket not found') || upErr.message.includes('not found')) {
        toast.error(`Storage Bucket '${bucketName}' not found. Please run the SQL migration to create it.`)
      } else {
        toast.error('Upload failed: ' + upErr.message)
      }
      setUploading(false)
      return 
    }"""

content = content.replace(old_code, new_code)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('gallery/page.tsx patched to remove getBucket.')
