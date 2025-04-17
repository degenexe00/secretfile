const axios = require('axios');
const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration (replace with your credentials)
const supabaseUrl = 'https://sryturlkgewgjyrsyqpe.supabase.co '; // From Supabase dashboard
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyeXR1cmxrZ2V3Z2p5cnN5cXBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ5MTIyMTgsImV4cCI6MjA2MDQ4ODIxOH0.AMo_MersiWu_m7zxWgpl8UpafecKbslkCDc7pj2-lHU'; // From Supabase dashboard
const supabase = createClient(supabaseUrl, supabaseKey);

async function scrapeJobs() {
    try {
        // Step 1: Fetch the employer ID for the scraper user
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('user_id')
            .eq('username', 'scraper')
            .single();

        if (userError) {
            throw new Error(`Failed to fetch employer: ${userError.message}`);
        }
        const employerId = userData.user_id;

        // Step 2: Scrape job postings from Web3.career
        const url = 'https://web3.career';
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Educational Project)' },
            timeout: 5000 // Respectful request timing
        });
        const $ = cheerio.load(response.data);

        const jobs = [];
        $('tr.table_row').each((index, element) => {
            // Stop at 400 records as per your constraint
            if (jobs.length >= 400) return false;

            const title = $(element).find('h2').text().trim();
            const description = $(element).find('.job-description-short').text().trim() || 'No description available';
            const location = $(element).find('.location').text().trim() || 'Remote';
            const salaryRange = $(element).find('.salary').text().trim() || 'Not specified';
            const skillsText = $(element).find('.skills').text().trim() || 'blockchain, web3';
            const skillsRequired = skillsText.split(',').map(skill => skill.trim());

            if (title) {
                jobs.push({
                    employer_id: employerId,
                    title,
                    description,
                    skills_required: skillsRequired,
                    location,
                    salary_range: salaryRange,
                    source: 'Web3.career'
                });
            }
        });

        // Step 3: Insert jobs into Supabase
        const { data, error } = await supabase
            .from('job_postings')
            .insert(jobs)
            .select();

        if (error) {
            throw new Error(`Failed to insert jobs: ${error.message}`);
        }

        console.log(`Successfully scraped and stored ${data.length} jobs:`, data);
    } catch (err) {
        console.error('Error during scraping:', err.message);
    }
}

// Run the script
scrapeJobs();
