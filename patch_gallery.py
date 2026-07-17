import re

file_path = r'E:\saanvi web\workspace\saanvi-admin\app\dashboard\gallery\page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

bucket_name = "process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'saanvi-media'"

new_upload = f"""  async function upload(e: React.ChangeEvent<HTMLInputElement>) {{
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)

    // 1. Verify bucket exists
    const bucketName = {bucket_name}
    const {{ data: bucketData, error: bucketError }} = await supabase.storage.getBucket(bucketName)
    
    if (bucketError || !bucketData) {{
      toast.error(`Storage Bucket '${{bucketName}}' not found. Please run the SQL migration to create it.`)
      setUploading(false)
      return
    }}

    const ext = file.name.split('.').pop()
    const path = `${{category}}/${{Date.now()}}.${{ext}}`
    const {{ error: upErr }} = await supabase.storage.from(bucketName).upload(path, file, {{ upsert: true }})
    if (upErr) {{ toast.error(upErr.message); setUploading(false); return }}
    const {{ data: {{ publicUrl }} }} = supabase.storage.from(bucketName).getPublicUrl(path)
    await supabase.from('gallery').insert({{ url: publicUrl, category, name: file.name, size: file.size }})
    toast.success('Image uploaded!'); setUploading(false); loadImages()
  }}"""

content = re.sub(r'  async function upload\(.*?\).*?loadImages\(\)\n  }', new_upload, content, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('gallery/page.tsx updated.')
