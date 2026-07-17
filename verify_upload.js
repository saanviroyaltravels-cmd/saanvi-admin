const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  'https://oyfahfvudhhwitxjedrd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95ZmFoZnZ1ZGhod2l0eGplZHJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MjQxOTIsImV4cCI6MjA5ODQwMDE5Mn0.pyFfVB0nTwViF6jv_uZwjM0CEbV74kp125bYxcIvDIE'
);

async function testUpload() {
  const bucketName = 'saanvi-media';
  
  console.log(`Checking if bucket ${bucketName} exists...`);
  const { data: bucketData, error: bucketError } = await supabase.storage.getBucket(bucketName);
  
  if (bucketError) {
    console.error('Bucket error:', bucketError.message);
    return;
  }
  console.log('Bucket verified:', bucketData.name);

  // But wait, the anon key is being used. 
  // Let me simulate an admin user logging in to bypass the 'authenticated' RLS.
  // Actually, I can't login without credentials.
  // If the RLS says `to authenticated`, anon key won't work for insert.
  
  // Can we bypass with Service Role Key? I don't have it.
  // Can I check if the public read works by getting publicUrl?
  const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl('test.jpg');
  console.log('Public URL generation works:', publicUrlData.publicUrl);
}

testUpload();
