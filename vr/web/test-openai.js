// Simple test to verify OpenAI integration works
// You can run this with: node -r tsconfig-paths/register test-openai.js

import { analyzeUserProfile } from './src/lib/openai/analyzer';

// Mock user profile for testing
const mockProfile = {
  id: 1,
  first_name: 'John',
  last_name: 'Doe',
  image_url: '',
  description: 'VR developer with 5 years of experience in Unity development',
  location: 'San Francisco, CA',
  url_github: 'https://github.com/johndoe',
  url_linkedin: 'https://linkedin.com/in/johndoe',
  url_twitter: null,
  url_bluesky: null,
  url_website: null,
  showcase_url_1: null,
  roles: ['developer', 'tech_lead'],
  engines: ['unity', 'unreal'],
  engine_variants: ['unity_2022_lts'],
  sdks: ['oculus_sdk', 'steamvr'],
  devices_developed: ['quest_2', 'quest_3'],
  devices_owned: ['quest_2', 'quest_3', 'vision_pro'],
  modalities: ['vr', 'ar'],
  toolchain: ['visual_studio', 'blender'],
  verticals: ['gaming', 'training'],
  work_modes: ['remote', 'hybrid'],
  work_types: ['full_time'],
  programming_languages: ['csharp', 'javascript'],
  xr_skills: ['hand_tracking', 'eye_tracking'],
};

async function testOpenAI() {
  try {
    console.log('Testing OpenAI integration...');
    const result = await analyzeUserProfile(mockProfile as any);
    console.log('Success! AI Analysis Result:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error testing OpenAI:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('OPENAI_API_KEY')) {
        console.log('\n❌ Please set your OPENAI_API_KEY environment variable');
      } else {
        console.log('\n❌ OpenAI API Error:', error.message);
      }
    }
  }
}

// Uncomment to run the test:
// testOpenAI();