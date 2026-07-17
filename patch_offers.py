import re

file_path = r'E:\saanvi web\workspace\saanvi-admin\app\dashboard\offers\page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

bucket_name = "process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'saanvi-media'"

old_upload = r"""    // Upload image if selected
    if (imageFile) {
      const ext = imageFile.name.split('.').pop()
      const fileName = `offer_${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('special-offers').upload(fileName, imageFile)
      if (uploadError) {
        toast.error('Failed to upload image: ' + uploadError.message)
        setSaving(false)
        return
      }
      const { data } = supabase.storage.from('special-offers').getPublicUrl(fileName)
      imageUrl = data.publicUrl
    }"""

new_upload = f"""    // Upload image if selected
    if (imageFile) {{
      const bucketName = {bucket_name}
      // Verify bucket exists
      const {{ data: bucketData, error: bucketError }} = await supabase.storage.getBucket(bucketName)
      if (bucketError || !bucketData) {{
        toast.error(`Storage Bucket '${{bucketName}}' not found. Please run the SQL migration to create it.`)
        setSaving(false)
        return
      }}

      const ext = imageFile.name.split('.').pop()
      const fileName = `offer_${{Date.now()}}.${{ext}}`
      const {{ error: uploadError }} = await supabase.storage.from(bucketName).upload(fileName, imageFile)
      if (uploadError) {{
        toast.error('Failed to upload image: ' + uploadError.message)
        setSaving(false)
        return
      }}
      const {{ data }} = supabase.storage.from(bucketName).getPublicUrl(fileName)
      imageUrl = data.publicUrl
    }}"""

content = content.replace(old_upload, new_upload)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('offers/page.tsx updated.')
