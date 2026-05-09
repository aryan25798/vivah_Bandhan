const XLSX = require('xlsx');
const path = require('path');

const religions = ['Hindu', 'Muslim', 'Sikh', 'Christian', 'Jain'];
const occupations = ['Software Engineer', 'Doctor', 'Business Owner', 'Teacher', 'Architect', 'Artist'];
const locations = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Pune', 'Chennai', 'Kolkata'];
const genders = ['Male', 'Female'];
const incomes = ['5-10 LPA', '10-20 LPA', '20-50 LPA', '50+ LPA', 'Confidential'];

const generateData = (count) => {
  const data = [];
  for (let i = 1; i <= count; i++) {
    const gender = genders[Math.floor(Math.random() * genders.length)];
    const name = `${gender === 'Male' ? 'Aryan' : 'Ananya'} ${['Sharma', 'Verma', 'Malhotra', 'Kapoor', 'Singh', 'Gupta'][Math.floor(Math.random() * 6)]} ${i}`;
    
    data.push({
      'Name': name,
      'Email': `member_${i}@example.com`,
      'Gender': gender,
      'Age': Math.floor(Math.random() * 15) + 21,
      'Marital Status': ['Never Married', 'Divorced', 'Widowed'][Math.floor(Math.random() * 3)],
      'Religion': religions[Math.floor(Math.random() * religions.length)],
      'Caste': ['Brahmin', 'Kshatriya', 'Vaishya', 'Shudra', 'Yadav', 'Jat'][Math.floor(Math.random() * 6)],
      'Sub Caste': 'Not Specified',
      'Gotra': ['Kashyap', 'Bharadwaj', 'Vashistha', 'Vishvamitra', 'Gautam'][Math.floor(Math.random() * 5)],
      'Mother Tongue': ['Hindi', 'Punjabi', 'Bengali', 'Marathi', 'Gujarati', 'Tamil', 'Telugu'][Math.floor(Math.random() * 7)],
      'Manglik': ['No', 'Yes', 'Anshik'][Math.floor(Math.random() * 3)],
      'Occupation': occupations[Math.floor(Math.random() * occupations.length)],
      'Income': incomes[Math.floor(Math.random() * incomes.length)],
      'Location': locations[Math.floor(Math.random() * locations.length)],
      'Height': `${Math.floor(Math.random() * 2) + 5}'${Math.floor(Math.random() * 12)}"`,
      'Education': ['Masters', 'Bachelors', 'PhD', 'MBA'][Math.floor(Math.random() * 4)],
      'Family Type': ['Joint', 'Nuclear'][Math.floor(Math.random() * 2)],
      'Father Occupation': occupations[Math.floor(Math.random() * occupations.length)],
      'About Me': "I am a simple and down-to-earth person looking for a compatible soulmate."
    });
  }
  return data;
};

const data = generateData(100);
const worksheet = XLSX.utils.json_to_sheet(data);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "Sample_Data");

const filePath = path.join(process.cwd(), 'Vivah_Sample_100.xlsx');
XLSX.writeFile(workbook, filePath);

console.log(`✅ Success! Sample Excel file generated at: ${filePath}`);
