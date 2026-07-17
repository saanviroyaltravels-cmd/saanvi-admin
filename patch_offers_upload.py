import re

file_path = r'E:\saanvi web\workspace\saanvi-admin\app\dashboard\offers\page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_code = r"""      const bucketName = process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'saanvi-media'
      // Verify bucket exists
      const { data: bucketData, error: bucketError } = await supabase.storage.getBucket(bucketName)
      if (bucketError || !bucketData) {
        toast.error(`Storage Bucket '${bucketName}' not found. Please run the SQL migration to create it.`)
        setSaving(false)
        return
      }

      const ext = imageFile.name.split('.').pop()
      const fileName = `offer_${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from(bucketName).upload(fileName, imageFile)
      if (uploadError) {
        toast.error('Failed to upload image: ' + uploadError.message)
        setSaving(false)
        return
      }"""

new_code = r"""      const bucketName = process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'saanvi-media'
      const ext = imageFile.name.split('.').pop()
      const fileName = `offer_${Date.now()}.${ext}`
      
      const { error: uploadError } = await supabase.storage.from(bucketName).upload(fileName, imageFile)
      if (uploadError) {
        if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('not found')) {
          toast.error(`Storage Bucket '${bucketName}' not found. Please run the SQL migration to create it.`)
        } else {
          toast.error('Upload failed: ' + uploadError.message)
        }
        setSaving(false)
        return
      }"""

content = content.replace(old_code, new_code)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('offers/page.tsx patched to remove getBucket.')
