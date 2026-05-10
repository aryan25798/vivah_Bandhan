const fs = require('fs');
const path = require('path');

const files = [
  'src/app/admin/shadow/page.tsx',
  'src/app/profile/edit/page.tsx'
];

files.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, 'utf8');

  // Add import Image from "next/image" if missing
  if (!content.includes('import Image from "next/image"')) {
    content = content.replace(/import \{[^}]+\} from "lucide-react";/, match => `${match}\nimport Image from "next/image";`);
  }

  // Find and replace all <img ... /> patterns
  content = content.replace(/<img\s+src=\{([^}]+)\}\s*(?:alt="([^"]*)")?\s*className="([^"]*)"\s*\/>/g, (match, src, alt, className) => {
    // If className already has object-cover, etc., keep it. 
    return `<Image src={${src}} alt="${alt || ""}" fill className="${className}" sizes="(max-width: 768px) 100vw, 50vw" />`;
  });

  // Also replace cases where alt is missing and className is first, etc.
  content = content.replace(/<img\s+src=\{([^}]+)\}\s*className="([^"]*)"\s*\/>/g, (match, src, className) => {
    return `<Image src={${src}} alt="" fill className="${className}" sizes="(max-width: 768px) 100vw, 50vw" />`;
  });

  // specific for onboarding
  content = content.replace(/<img src=\{formData\.photoURL\} alt="Preview" className="w-full h-full object-cover scale-110" \/>/g, 
  `<Image src={formData.photoURL} alt="Preview" fill className="object-cover scale-110" sizes="200px" />`);

  fs.writeFileSync(filePath, content);
  console.log(`Replaced img tags in ${file}`);
});
