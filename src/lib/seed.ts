import { prisma } from './prisma';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('Seeding database...');

  // Create admin
  const adminPw = await bcrypt.hash('Admin@1234', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@propertysmart.com' },
    update: {},
    create: { name: 'Admin User', email: 'admin@propertysmart.com', password: adminPw, role: 'ADMIN', isVerified: true, phone: '+880 1711-000001' },
  });

  // Create agent
  const agentPw = await bcrypt.hash('Agent@1234', 12);
  const agent = await prisma.user.upsert({
    where: { email: 'agent@propertysmart.com' },
    update: {},
    create: { name: 'Rahim Chowdhury', email: 'agent@propertysmart.com', password: agentPw, role: 'AGENT', isVerified: true, phone: '+880 1711-234567' },
  });

  // Create buyer
  const buyerPw = await bcrypt.hash('Buyer@1234', 12);
  await prisma.user.upsert({
    where: { email: 'buyer@propertysmart.com' },
    update: {},
    create: { name: 'Nadia Islam', email: 'buyer@propertysmart.com', password: buyerPw, role: 'BUYER', isVerified: true, phone: '+880 1812-345678' },
  });

  // Create sample properties with Bangladesh locations and BDT prices
  const properties = [
    {
      title: 'লাক্সারি অ্যাপার্টমেন্ট, গুলশান-২',
      description: 'গুলশান-২ তে অত্যাধুনিক সুযোগ-সুবিধা সম্পন্ন বিলাসবহুল অ্যাপার্টমেন্ট। সুইমিং পুল, জিম, ২৪ ঘণ্টা নিরাপত্তা ও অসাধারণ সিটি ভিউ।',
      price: 18000000,
      type: 'APARTMENT' as const,
      address: 'রোড ৫৪, গুলশান-২',
      city: 'Dhaka',
      state: 'Dhaka',
      zipCode: '1212',
      country: 'Bangladesh',
      bedrooms: 3,
      bathrooms: 3,
      area: 2200,
      features: ['Swimming Pool', 'Gym', '24/7 Security', 'City View', 'Parking', 'Generator'],
      images: ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800'],
      isFeatured: true,
    },
    {
      title: 'ফ্যামিলি হাউস, বসুন্ধরা আবাসিক',
      description: 'বসুন্ধরা আবাসিক এলাকায় সুন্দর ও প্রশস্ত ফ্যামিলি হাউস। বড় ছাদ, গাড়ি পার্কিং, নিরিবিলি পরিবেশ এবং সব ধরনের আধুনিক সুবিধা সহ।',
      price: 25000000,
      type: 'HOUSE' as const,
      address: 'ব্লক-ডি, বসুন্ধরা আবাসিক',
      city: 'Dhaka',
      state: 'Dhaka',
      zipCode: '1229',
      country: 'Bangladesh',
      bedrooms: 5,
      bathrooms: 4,
      area: 3800,
      features: ['Rooftop', 'Garage', 'Garden', 'Generator', 'Security'],
      images: ['https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800'],
      isFeatured: true,
    },
    {
      title: 'মডার্ন ফ্ল্যাট, ধানমন্ডি',
      description: 'ধানমন্ডি লেকের পাশে আধুনিক ফ্ল্যাট। শপিং মল, হাসপাতাল ও স্কুলের কাছে অবস্থিত। পরিবারের জন্য আদর্শ।',
      price: 9500000,
      type: 'APARTMENT' as const,
      address: 'রোড ৭, ধানমন্ডি',
      city: 'Dhaka',
      state: 'Dhaka',
      zipCode: '1205',
      country: 'Bangladesh',
      bedrooms: 3,
      bathrooms: 2,
      area: 1600,
      features: ['Lake View', 'Parking', 'Generator', 'Lift', 'Security'],
      images: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'],
      isFeatured: true,
    },
    {
      title: 'কমার্শিয়াল স্পেস, মতিঝিল',
      description: 'মতিঝিল বাণিজ্যিক এলাকায় প্রাইম লোকেশনে কমার্শিয়াল স্পেস। ব্যাংক, অফিস ও ব্যবসার জন্য আদর্শ। ২৪ ঘণ্টা বিদ্যুৎ ও নিরাপত্তা।',
      price: 35000000,
      type: 'COMMERCIAL' as const,
      address: 'দিলকুশা কমার্শিয়াল এলাকা, মতিঝিল',
      city: 'Dhaka',
      state: 'Dhaka',
      zipCode: '1000',
      country: 'Bangladesh',
      bedrooms: 0,
      bathrooms: 2,
      area: 3000,
      features: ['24/7 Power', 'Lift', 'CCTV', 'Reception', 'Parking'],
      images: ['https://images.unsplash.com/photo-1497366216548-37526070297c?w=800'],
      isFeatured: false,
    },
    {
      title: 'লাক্সারি পেন্টহাউস, বারিধারা',
      description: 'বারিধারা কূটনৈতিক জোনে অপূর্ব পেন্টহাউস। প্রাইভেট ছাদ, প্যানোরামিক ভিউ এবং সর্বোচ্চ মানের ফিনিশিং সহ।',
      price: 55000000,
      type: 'APARTMENT' as const,
      address: 'রোড ১৫, বারিধারা কূটনৈতিক এলাকা',
      city: 'Dhaka',
      state: 'Dhaka',
      zipCode: '1212',
      country: 'Bangladesh',
      bedrooms: 4,
      bathrooms: 4,
      area: 4500,
      features: ['Private Rooftop', 'Panoramic View', 'Swimming Pool', 'Home Theatre', 'Smart Home', 'Gym'],
      images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'],
      isFeatured: true,
    },
    {
      title: 'মিড-রেঞ্জ অ্যাপার্টমেন্ট, উত্তরা',
      description: 'উত্তরা সেক্টর-৭ এ পরিষ্কার ও পরিচ্ছন্ন আবাসিক এলাকায় সাশ্রয়ী মূল্যে অ্যাপার্টমেন্ট। মেট্রো স্টেশন থেকে হাঁটার দূরত্বে।',
      price: 6500000,
      type: 'APARTMENT' as const,
      address: 'সেক্টর-৭, উত্তরা',
      city: 'Dhaka',
      state: 'Dhaka',
      zipCode: '1230',
      country: 'Bangladesh',
      bedrooms: 2,
      bathrooms: 2,
      area: 1250,
      features: ['Metro Nearby', 'Parking', 'Generator', 'Lift', 'Gas'],
      images: ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800'],
      isFeatured: false,
    },
    {
      title: 'সি-ভিউ অ্যাপার্টমেন্ট, চট্টগ্রাম',
      description: 'চট্টগ্রামের পতেঙ্গা সমুদ্র সৈকতের কাছে অসাধারণ সি-ভিউ অ্যাপার্টমেন্ট। প্রতিদিন সূর্যোদয় ও সূর্যাস্তের অপূর্ব দৃশ্য উপভোগ করুন।',
      price: 12000000,
      type: 'APARTMENT' as const,
      address: 'পতেঙ্গা সী বিচ রোড',
      city: 'Chattogram',
      state: 'Chattogram',
      zipCode: '4204',
      country: 'Bangladesh',
      bedrooms: 3,
      bathrooms: 2,
      area: 1800,
      features: ['Sea View', 'Balcony', 'Parking', 'Generator', 'Security'],
      images: ['https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800'],
      isFeatured: true,
    },
    {
      title: 'প্রশস্ত বাড়ি, সিলেট শহর',
      description: 'সিলেট শহরের প্রাণকেন্দ্রে সুন্দর বাড়ি। চারদিকে সবুজ পরিবেশ, প্রশস্ত উঠান এবং ঐতিহ্যবাহী স্থাপত্যের সাথে আধুনিক সুবিধা।',
      price: 8000000,
      type: 'HOUSE' as const,
      address: 'শিবগঞ্জ, আম্বরখানা',
      city: 'Sylhet',
      state: 'Sylhet',
      zipCode: '3100',
      country: 'Bangladesh',
      bedrooms: 4,
      bathrooms: 3,
      area: 2600,
      features: ['Garden', 'Parking', 'Rooftop', 'Gas', 'Security'],
      images: ['https://images.unsplash.com/photo-1605276373954-0c4a0dac5b12?w=800'],
      isFeatured: false,
    },
  ];

  // Clear existing properties first to avoid duplicates on re-seed
  await prisma.property.deleteMany({ where: { agentId: agent.id } });

  for (const prop of properties) {
    await prisma.property.create({ data: { ...prop, agentId: agent.id } });
  }

  console.log('Seed completed.');
  console.log('\nTest accounts:');
  console.log('Admin:  admin@propertysmart.com / Admin@1234');
  console.log('Agent:  agent@propertysmart.com / Agent@1234');
  console.log('Buyer:  buyer@propertysmart.com / Buyer@1234');
}

main().catch(console.error).finally(() => prisma.$disconnect());
