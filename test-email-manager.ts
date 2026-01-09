import { supabase } from './src/db/supabaseClient';

async function testEmailManager() {
  console.log('Testing Email Manager System...');

  try {
    // Test 1: Create a test email
    console.log('\n1. Creating test email...');
    const { data: emailData, error: createError } = await supabase
      .from('the_emails')
      .insert([{
        title: 'Test Welcome Email',
        type: 'Welcome',
        the_mail: {
          subject: 'Welcome to Our Newsletter!',
          html: '<h1>Welcome!</h1><p>Thank you for subscribing to our newsletter.</p>'
        },
        emails: {
          count: 2,
          list: [
            { email: 'test1@example.com' },
            { email: 'test2@example.com' }
          ]
        },
        scheduled_time: null,
        status: 'Draft'
      }])
      .select()
      .single();

    if (createError) {
      console.error('Create error:', createError);
      return;
    }

    console.log('✓ Email created successfully:', emailData.id);

    // Test 2: Update the email
    console.log('\n2. Updating email...');
    const { data: updateData, error: updateError } = await supabase
      .from('the_emails')
      .update({
        status: 'Scheduled',
        scheduled_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Schedule for tomorrow
      })
      .eq('id', emailData.id)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return;
    }

    console.log('✓ Email updated successfully:', updateData.status, updateData.scheduled_time);

    // Test 3: Get email by ID
    console.log('\n3. Retrieving email by ID...');
    const { data: getByIdData, error: getByIdError } = await supabase
      .from('the_emails')
      .select('*')
      .eq('id', emailData.id)
      .single();

    if (getByIdError) {
      console.error('Get by ID error:', getByIdError);
      return;
    }

    console.log('✓ Email retrieved successfully:', getByIdData.title);

    // Test 4: Get all emails with pagination
    console.log('\n4. Getting all emails...');
    const { data: allEmails, error: allEmailsError } = await supabase
      .from('the_emails')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (allEmailsError) {
      console.error('Get all emails error:', allEmailsError);
      return;
    }

    console.log('✓ Retrieved', allEmails.length, 'emails');

    // Test 5: Get statistics
    console.log('\n5. Getting statistics...');
    const { data: statusCounts, error: statusError } = await supabase
      .from('the_emails')
      .select('status');

    const { data: typeCounts, error: typeError } = await supabase
      .from('the_emails')
      .select('type');

    if (statusError || typeError) {
      console.error('Statistics error:', statusError || typeError);
      return;
    }

    const statusStats = {
      draft: statusCounts?.filter(e => e.status === 'Draft').length || 0,
      scheduled: statusCounts?.filter(e => e.status === 'Scheduled').length || 0,
      sent: statusCounts?.filter(e => e.status === 'Sent').length || 0
    };

    const typeStats = {
      welcome: typeCounts?.filter(e => e.type === 'Welcome').length || 0,
      newPost: typeCounts?.filter(e => e.type === 'New Post').length || 0,
      newsletter: typeCounts?.filter(e => e.type === 'Newsletter').length || 0,
      template: typeCounts?.filter(e => e.type === 'Template').length || 0,
      other: typeCounts?.filter(e => e.type === 'Other').length || 0
    };

    console.log('✓ Statistics retrieved:');
    console.log('  Status:', statusStats);
    console.log('  Types:', typeStats);

    // Test 6: Mark email as sent (simulating sending)
    console.log('\n6. Marking email as sent...');
    const { data: sentData, error: sentError } = await supabase
      .from('the_emails')
      .update({
        status: 'Sent',
        sent_time: new Date().toISOString()
      })
      .eq('id', emailData.id)
      .select()
      .single();

    if (sentError) {
      console.error('Mark as sent error:', sentError);
      return;
    }

    console.log('✓ Email marked as sent:', sentData.sent_time);

    // Test 7: Clean up - delete test email
    console.log('\n7. Cleaning up test email...');
    const { error: deleteError } = await supabase
      .from('the_emails')
      .delete()
      .eq('id', emailData.id);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return;
    }

    console.log('✓ Test email deleted successfully');

    console.log('\n🎉 All tests passed! Email Manager system is working correctly.');

  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

testEmailManager();
