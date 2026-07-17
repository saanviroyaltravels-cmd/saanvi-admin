const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://oyfahfvudhhwitxjedrd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95ZmFoZnZ1ZGhod2l0eGplZHJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MjQxOTIsImV4cCI6MjA5ODQwMDE5Mn0.pyFfVB0nTwViF6jv_uZwjM0CEbV74kp125bYxcIvDIE'
);

async function checkBuckets() {
  const { data, error } = await supabase.storage.listBuckets();
  if (error) {
    console.error('Error fetching buckets:', error);
  } else {
    console.log('Buckets:', data.map(b => b.name));
  }
}

checkBuckets();
